import { useEffect, useMemo, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { addToast } from '@heroui/toast';
import { Banknote, Building2, CircleAlert, Landmark, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import type { Id } from '../../../../../packages/backend/convex/_generated/dataModel';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import Button from '../components/ui/Button';
import { BANK_OPTIONS } from '../lib/banks';

type ProofFile = File | null;

const formatCurrency = (value: number) =>
    `RM ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

const statusClasses: Record<string, string> = {
    verified: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    pending_review: 'bg-amber-50 text-amber-700 border border-amber-200',
    rejected: 'bg-rose-50 text-rose-700 border border-rose-200',
    completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    processing: 'bg-sky-50 text-sky-700 border border-sky-200',
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    failed: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const toStatusLabel = (status: string) =>
    status
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

export default function Withdrawals() {
    const business = useQuery(api.businesses.getMyBusiness);
    const bankAccounts = useQuery(api.bankAccounts.getUserBankAccounts);
    const withdrawals = useQuery(api.payouts.getBusinessWithdrawals);
    const gatewayFee = useQuery(api.payouts.getPayoutGatewayFee) ?? 0;

    const requestBusinessWithdrawal = useAction(api.payouts.requestBusinessWithdrawal);
    const generateProofUploadUrl = useAction(api.bankAccounts.generateProofUploadUrl);
    const createBankAccount = useMutation(api.bankAccounts.createBankAccount);

    const [amount, setAmount] = useState('');
    const [selectedBankId, setSelectedBankId] = useState<Id<'bank_accounts'> | null>(null);
    const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
    const [withdrawalError, setWithdrawalError] = useState('');

    const [bankName, setBankName] = useState('');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [proofFile, setProofFile] = useState<ProofFile>(null);
    const [bankFormError, setBankFormError] = useState('');
    const [isSubmittingBank, setIsSubmittingBank] = useState(false);

    const availableCredits = business?.credit_balance ?? 0;
    const allBankAccounts = (bankAccounts ?? []) as Array<{
        _id: Id<'bank_accounts'>;
        bank_name: string;
        account_holder_name: string;
        account_number: string;
        status: string;
    }>;
    const withdrawalHistory = (withdrawals ?? []) as Array<{
        _id: Id<'withdrawals'>;
        amount: number;
        gateway_fee?: number;
        status: string;
        created_at: number;
        bank_name?: string | null;
        account_number?: string | null;
    }>;
    const verifiedBankAccounts = useMemo(
        () => allBankAccounts.filter((account) => account.status === 'verified'),
        [allBankAccounts]
    );

    useEffect(() => {
        if (!selectedBankId && verifiedBankAccounts.length > 0) {
            setSelectedBankId(verifiedBankAccounts[0]._id);
        }
        if (selectedBankId && !verifiedBankAccounts.some((account) => account._id === selectedBankId)) {
            setSelectedBankId(verifiedBankAccounts[0]?._id ?? null);
        }
    }, [selectedBankId, verifiedBankAccounts]);

    useEffect(() => {
        if (business?.name) {
            setAccountHolderName((current) => current || business.name);
        }
    }, [business?.name]);

    if (business === undefined || bankAccounts === undefined || withdrawals === undefined) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
            </div>
        );
    }

    if (business === null) {
        return <div className="p-8">Please complete onboarding first.</div>;
    }

    const parsedAmount = Number.parseFloat(amount);
    const normalizedAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
    const estimatedDeposit = normalizedAmount > gatewayFee ? normalizedAmount - gatewayFee : 0;

    const handleMax = () => {
        setAmount(availableCredits.toFixed(2));
        setWithdrawalError('');
    };

    const handleSubmitWithdrawal = async () => {
        if (!selectedBankId) {
            setWithdrawalError('Add and verify a bank account before requesting a withdrawal.');
            return;
        }

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setWithdrawalError('Enter a valid withdrawal amount.');
            return;
        }

        if (parsedAmount <= gatewayFee) {
            setWithdrawalError(`Withdrawal amount must be greater than ${formatCurrency(gatewayFee)}.`);
            return;
        }

        if (parsedAmount > availableCredits) {
            setWithdrawalError('Withdrawal amount exceeds your available credits.');
            return;
        }

        setWithdrawalError('');
        setIsSubmittingWithdrawal(true);

        try {
            await requestBusinessWithdrawal({
                amount: parsedAmount,
                bankAccountId: selectedBankId,
            });
            setAmount('');
            addToast({
                title: 'Withdrawal requested',
                description: 'Your Billplz payout order has been created.',
                color: 'success',
            });
        } catch (error) {
            console.error('Failed to create business withdrawal:', error);
            setWithdrawalError(error instanceof Error ? error.message : 'Unable to create withdrawal request.');
        } finally {
            setIsSubmittingWithdrawal(false);
        }
    };

    const handleSubmitBankAccount = async () => {
        if (!bankName || !accountHolderName.trim() || !accountNumber.trim() || !proofFile) {
            setBankFormError('Complete all bank account fields and upload a proof document.');
            return;
        }

        setBankFormError('');
        setIsSubmittingBank(true);

        try {
            const selectedBank = BANK_OPTIONS.find((option) => option.name === bankName);
            const contentType = proofFile.type || 'application/octet-stream';
            const { uploadUrl, s3Key } = await generateProofUploadUrl({ contentType });

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': contentType },
                body: proofFile,
            });

            if (!uploadResponse.ok) {
                throw new Error(`Proof upload failed with status ${uploadResponse.status}`);
            }

            await createBankAccount({
                bankName,
                bankCode: selectedBank?.swiftCode || undefined,
                accountHolderName: accountHolderName.trim(),
                accountNumber: accountNumber.trim(),
                proofDocumentKey: s3Key,
            });

            setBankName('');
            setAccountHolderName(business.name ?? '');
            setAccountNumber('');
            setProofFile(null);

            addToast({
                title: 'Bank account submitted',
                description: 'Your account is now pending review.',
                color: 'success',
            });
        } catch (error) {
            console.error('Failed to submit bank account:', error);
            setBankFormError(error instanceof Error ? error.message : 'Unable to submit bank account.');
        } finally {
            setIsSubmittingBank(false);
        }
    };

    return (
        <div className="animate-fadeIn p-8 pb-24 text-gray-900">
            <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Withdrawals</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Move unused business credits back to your verified bank account with the same Billplz payout flow used on mobile.
                    </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
                    Gateway fee per withdrawal: <span className="font-semibold text-gray-900">{formatCurrency(gatewayFee)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-3xl bg-[#111111] p-6 text-white shadow-xl xl:col-span-2">
                    <div className="flex items-center gap-3 text-sm text-white/70">
                        <Wallet className="h-4 w-4" />
                        Available to withdraw
                    </div>
                    <div className="mt-4 text-4xl font-bold tracking-tight">{formatCurrency(availableCredits)}</div>
                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-xs uppercase tracking-[0.18em] text-white/50">Estimated deposit</div>
                            <div className="mt-2 text-2xl font-semibold">{formatCurrency(estimatedDeposit)}</div>
                            <p className="mt-2 text-sm text-white/60">
                                Requested amount less the Billplz gateway fee.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-xs uppercase tracking-[0.18em] text-white/50">Verified banks</div>
                            <div className="mt-2 text-2xl font-semibold">{verifiedBankAccounts.length}</div>
                            <p className="mt-2 text-sm text-white/60">
                                Only verified accounts can receive payouts.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center gap-3 text-sm font-semibold text-gray-900">
                        <Building2 className="h-4 w-4" />
                        Withdrawal policy
                    </div>
                    <ul className="mt-4 space-y-3 text-sm text-gray-600">
                        <li className="flex gap-2">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            Bank accounts must be reviewed before they can be used.
                        </li>
                        <li className="flex gap-2">
                            <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                            Each withdrawal deducts the full requested amount from available credits.
                        </li>
                        <li className="flex gap-2">
                            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            Your bank receives the requested amount minus the gateway fee.
                        </li>
                    </ul>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-3xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold">Request a withdrawal</h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Select a verified bank account and choose how much credit you want to withdraw.
                            </p>
                        </div>
                        <Button variant="outline" onClick={handleMax} className="rounded-full">
                            Max
                        </Button>
                    </div>

                    <div className="mt-6 space-y-6">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-900">Amount</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">RM</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={amount}
                                    onChange={(event) => {
                                        setAmount(event.target.value);
                                        setWithdrawalError('');
                                    }}
                                    placeholder="0.00"
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-4 pl-12 pr-4 text-lg font-semibold outline-none transition focus:border-gray-300 focus:bg-white"
                                />
                            </div>
                            <div className="mt-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                                <div className="flex items-center justify-between">
                                    <span>Available credits</span>
                                    <span className="font-semibold text-gray-900">{formatCurrency(availableCredits)}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <span>Gateway fee charged</span>
                                    <span className="font-semibold text-gray-900">{formatCurrency(gatewayFee)}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <span>Estimated deposit</span>
                                    <span className="font-semibold text-gray-900">{formatCurrency(estimatedDeposit)}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="mb-3 block text-sm font-semibold text-gray-900">Deposit bank</label>
                            {verifiedBankAccounts.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
                                    No verified bank accounts yet. Submit a bank account below and wait for review before requesting a withdrawal.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {verifiedBankAccounts.map((account) => {
                                        const metadata = BANK_OPTIONS.find((option) => option.name === account.bank_name);
                                        const isSelected = selectedBankId === account._id;

                                        return (
                                            <button
                                                key={account._id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedBankId(account._id);
                                                    setWithdrawalError('');
                                                }}
                                                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${isSelected
                                                    ? 'border-gray-900 bg-gray-900 text-white'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isSelected ? 'bg-white/10' : 'bg-gray-50'}`}>
                                                    {metadata?.logo ? (
                                                        <img src={metadata.logo} alt={account.bank_name} className="h-8 w-8 object-contain" />
                                                    ) : (
                                                        <Landmark className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-semibold">{account.bank_name}</div>
                                                    <div className={`text-sm ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                                                        {account.account_holder_name} • ****{account.account_number.slice(-4)}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {withdrawalError ? (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {withdrawalError}
                            </div>
                        ) : null}

                        <Button
                            variant="primary"
                            onClick={handleSubmitWithdrawal}
                            isLoading={isSubmittingWithdrawal}
                            disabled={verifiedBankAccounts.length === 0}
                            className="h-12 w-full rounded-2xl"
                        >
                            {isSubmittingWithdrawal ? 'Creating payout order...' : 'Withdraw credits'}
                        </Button>
                    </div>
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-6">
                    <h2 className="text-lg font-bold">Add bank account</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Submit an account for review before it becomes available for withdrawals.
                    </p>

                    <div className="mt-6 space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-900">Bank name</label>
                            <select
                                value={bankName}
                                onChange={(event) => {
                                    setBankName(event.target.value);
                                    setBankFormError('');
                                }}
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-gray-300 focus:bg-white"
                            >
                                <option value="">Select a bank</option>
                                {BANK_OPTIONS.map((option) => (
                                    <option key={option.name} value={option.name}>
                                        {option.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-900">Account holder name</label>
                            <input
                                type="text"
                                value={accountHolderName}
                                onChange={(event) => {
                                    setAccountHolderName(event.target.value);
                                    setBankFormError('');
                                }}
                                placeholder="Company or account holder name"
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-gray-300 focus:bg-white"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-900">Account number</label>
                            <input
                                type="text"
                                value={accountNumber}
                                onChange={(event) => {
                                    setAccountNumber(event.target.value);
                                    setBankFormError('');
                                }}
                                placeholder="Bank account number"
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-gray-300 focus:bg-white"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-900">Proof document</label>
                            <label className="flex cursor-pointer flex-col rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-600 transition hover:border-gray-400 hover:bg-gray-100">
                                <span className="font-medium text-gray-900">
                                    {proofFile ? proofFile.name : 'Upload bank statement, screenshot, or PDF proof'}
                                </span>
                                <span className="mt-1 text-xs text-gray-500">
                                    Accepted formats: PDF, PNG, JPG, WEBP
                                </span>
                                <input
                                    type="file"
                                    accept=".pdf,image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={(event) => {
                                        setProofFile(event.target.files?.[0] ?? null);
                                        setBankFormError('');
                                    }}
                                />
                            </label>
                        </div>

                        {bankFormError ? (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {bankFormError}
                            </div>
                        ) : null}

                        <Button
                            variant="primary"
                            onClick={handleSubmitBankAccount}
                            isLoading={isSubmittingBank}
                            className="h-12 w-full rounded-2xl"
                        >
                            {isSubmittingBank ? 'Submitting for review...' : 'Submit bank account'}
                        </Button>
                    </div>
                </section>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[0.95fr_1.05fr]">
                <section className="rounded-3xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold">Bank accounts</h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Review status is managed by the admin approval queue.
                            </p>
                        </div>
                        <div className="text-sm text-gray-500">{allBankAccounts.length} total</div>
                    </div>

                    <div className="mt-6 space-y-3">
                        {allBankAccounts.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
                                No bank accounts submitted yet.
                            </div>
                        ) : (
                            allBankAccounts.map((account) => {
                                const metadata = BANK_OPTIONS.find((option) => option.name === account.bank_name);
                                return (
                                    <div key={account._id} className="flex items-center gap-4 rounded-2xl border border-gray-200 p-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
                                            {metadata?.logo ? (
                                                <img src={metadata.logo} alt={account.bank_name} className="h-8 w-8 object-contain" />
                                            ) : (
                                                <Landmark className="h-5 w-5 text-gray-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-gray-900">{account.bank_name}</div>
                                            <div className="text-sm text-gray-500">
                                                {account.account_holder_name} • ****{account.account_number.slice(-4)}
                                            </div>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[account.status] ?? 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                                            {toStatusLabel(account.status)}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold">Past withdrawals</h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Historical Billplz payout orders created from the business dashboard.
                            </p>
                        </div>
                        <div className="text-sm text-gray-500">{withdrawalHistory.length} records</div>
                    </div>

                    <div className="mt-6 space-y-3">
                        {withdrawalHistory.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
                                No withdrawal history yet.
                            </div>
                        ) : (
                            withdrawalHistory.map((withdrawal) => (
                                <div key={withdrawal._id} className="rounded-2xl border border-gray-200 p-4">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <div className="font-semibold text-gray-900">
                                                {withdrawal.bank_name ?? 'Unknown bank'} • ****{withdrawal.account_number?.slice(-4) ?? '0000'}
                                            </div>
                                            <div className="mt-1 text-sm text-gray-500">{formatDate(withdrawal.created_at)}</div>
                                        </div>
                                        <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[withdrawal.status] ?? 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                                            {toStatusLabel(withdrawal.status)}
                                        </span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <div className="rounded-2xl bg-gray-50 p-3">
                                            <div className="text-xs uppercase tracking-[0.16em] text-gray-400">Requested</div>
                                            <div className="mt-1 font-semibold text-gray-900">{formatCurrency(withdrawal.amount)}</div>
                                        </div>
                                        <div className="rounded-2xl bg-gray-50 p-3">
                                            <div className="text-xs uppercase tracking-[0.16em] text-gray-400">Gateway fee</div>
                                            <div className="mt-1 font-semibold text-gray-900">{formatCurrency(withdrawal.gateway_fee ?? gatewayFee)}</div>
                                        </div>
                                        <div className="rounded-2xl bg-gray-50 p-3">
                                            <div className="text-xs uppercase tracking-[0.16em] text-gray-400">Estimated deposit</div>
                                            <div className="mt-1 font-semibold text-gray-900">
                                                {formatCurrency(Math.max(withdrawal.amount - (withdrawal.gateway_fee ?? gatewayFee), 0))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.28s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
