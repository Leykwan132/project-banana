import { useEffect, useMemo, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { addToast } from '@heroui/toast';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter
} from "@heroui/react";
import { Banknote, Building2, CircleAlert, ChevronLeft, Landmark, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import type { Id } from '../../../../../packages/backend/convex/_generated/dataModel';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import Button from '../components/ui/Button';
import { BANK_OPTIONS } from '../lib/banks';

const formatCurrency = (value: number) =>
    `RM ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function RequestWithdrawal() {
    const navigate = useNavigate();
    const business = useQuery(api.businesses.getMyBusiness);
    const bankAccounts = useQuery(api.bankAccounts.getUserBankAccounts);
    const gatewayFee = useQuery(api.payouts.getPayoutGatewayFee) ?? 0;

    const requestBusinessWithdrawal = useAction(api.payouts.requestBusinessWithdrawal);

    const [amount, setAmount] = useState('');
    const [selectedBankId, setSelectedBankId] = useState<Id<'bank_accounts'> | null>(null);
    const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
    const [withdrawalError, setWithdrawalError] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    const availableCredits = business?.credit_balance ?? 0;
    const allBankAccounts = (bankAccounts ?? []) as Array<{
        _id: Id<'bank_accounts'>;
        bank_name: string;
        account_holder_name: string;
        account_number: string;
        status: string;
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

    const selectedBank = useMemo(
        () => verifiedBankAccounts.find((account) => account._id === selectedBankId),
        [verifiedBankAccounts, selectedBankId]
    );

    if (business === undefined || bankAccounts === undefined) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
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

    const handleBack = () => {
        navigate('/withdrawals');
    };

    const handleWithdrawalClick = () => {
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
        setIsConfirmModalOpen(true);
    };

    const handleSubmitWithdrawal = async () => {
        if (!selectedBankId) {
            setWithdrawalError('Bank account must be selected.');
            return;
        }

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
            navigate('/withdrawals');
        } catch (error) {
            console.error('Failed to create business withdrawal:', error);
            setWithdrawalError(error instanceof Error ? error.message : 'Unable to create withdrawal request.');
        } finally {
            setIsSubmittingWithdrawal(false);
        }
    };

    return (
        <div className="animate-fadeIn p-8 pb-24 text-gray-900">
            {/* Header / Navigation */}
            <div className="flex justify-between items-center mb-6">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    icon={<ChevronLeft className="w-5 h-5" />}
                    className="pl-0 hover:bg-transparent hover:text-gray-600"
                >
                    Back
                </Button>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-start mt-4">
                {/* Left Column: Form */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Withdrawal</h1>
                            <p className="text-gray-500">Select a verified bank account and choose how much to withdraw.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label className="block text-sm font-semibold text-gray-900">Amount</label>
                                <button
                                    type="button"
                                    onClick={handleMax}
                                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                                >
                                    Max
                                </button>
                            </div>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">RM</span>
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
                                    disabled={isSubmittingWithdrawal}
                                    className="w-full bg-[#F9FAFB] border-none rounded-xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-gray-200 transition-all text-gray-900 font-bold text-xl placeholder:text-gray-300 disabled:opacity-50"
                                />
                            </div>
                            <p className="mt-2 text-xs font-semibold text-gray-500">
                                Available balance: {formatCurrency(availableCredits)}
                            </p>
                        </div>

                        <div>
                            <label className="mb-3 block text-sm font-semibold text-gray-900">Deposit bank</label>
                            {verifiedBankAccounts.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
                                    No verified bank accounts yet. Submit a bank account in Bank Accounts page and wait for review before requesting a withdrawal.
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
                                                disabled={isSubmittingWithdrawal}
                                                onClick={() => {
                                                    setSelectedBankId(account._id);
                                                    setWithdrawalError('');
                                                }}
                                                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition disabled:opacity-50 ${isSelected
                                                    ? 'border-gray-900 bg-gray-50'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isSelected ? 'bg-white border border-gray-200' : 'bg-gray-50 border border-transparent'}`}>
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
                            onClick={handleWithdrawalClick}
                            isLoading={isSubmittingWithdrawal}
                            disabled={verifiedBankAccounts.length === 0 || isSubmittingWithdrawal}
                            className="w-full h-14 rounded-xl"
                        >
                            {isSubmittingWithdrawal ? 'Creating payout order...' : 'Withdraw credits'}
                        </Button>
                    </div>
                </div>

                {/* Right Column: Info & Summary */}
                <div className="space-y-6">
                    <div className="rounded-3xl bg-[#0F172A] p-6 text-white shadow-xl">
                        <div className="flex items-center gap-3 text-sm text-white/70">
                            <Wallet className="h-4 w-4" />
                            Summary
                        </div>
                        <div className="mt-6 space-y-4 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-white/60">Requested amount</span>
                                <span className="font-semibold">{formatCurrency(normalizedAmount)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-white/60">Gateway fee charged</span>
                                <span className="font-semibold">{formatCurrency(gatewayFee)}</span>
                            </div>
                            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-base">
                                <span className="text-white/80 font-medium">Estimated deposit</span>
                                <span className="font-bold">{formatCurrency(estimatedDeposit)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6">
                        <div className="flex items-center gap-3 text-sm font-semibold text-gray-900">
                            <Building2 className="h-4 w-4" />
                            Withdrawal policy
                        </div>
                        <ul className="mt-4 space-y-3 text-sm text-gray-600">
                            <li className="flex gap-2">
                                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                Withdrawal is done via DuitNow transfer.
                            </li>
                            <li className="flex gap-2">
                                <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                                Gateway fee is a one-time fixed fee charged for every withdrawal.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <Modal
                isOpen={isConfirmModalOpen}
                onOpenChange={setIsConfirmModalOpen}
                size="5xl"
                scrollBehavior="inside"
                isDismissable={!isSubmittingWithdrawal}
                hideCloseButton={isSubmittingWithdrawal}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1 px-8 pt-8">
                                <span className="text-xl font-bold text-gray-900">Withdrawal Summary</span>
                                <span className="text-sm font-normal text-gray-500">
                                    Please review your withdrawal request details carefully.
                                </span>
                            </ModalHeader>
                            <ModalBody className="p-8 mb-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                                    <div className="flex flex-col items-start w-full lg:pr-8 pt-2">
                                        <h3 className="text-xl mb-4 font-semibold text-gray-900 tracking-tight">Withdraw to {selectedBank?.bank_name}</h3>

                                        <div className="space-y-3 text-[15px] w-full">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-500">Account Holder</span>
                                                <span className="font-semibold text-gray-900">{selectedBank?.account_holder_name}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-500">Account Number</span>
                                                <span className="font-semibold text-gray-900">****{selectedBank?.account_number.slice(-4)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="text-xl font-semibold text-gray-900">Cost Summary</div>
                                        <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
                                            <div className="space-y-6">
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between text-base">
                                                        <span className="text-gray-500">Requested amount</span>
                                                        <span className="font-semibold text-gray-900">{formatCurrency(normalizedAmount)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-base">
                                                        <span className="text-gray-500">Gateway fee charged</span>
                                                        <span className="font-semibold text-gray-900">{formatCurrency(gatewayFee)}</span>
                                                    </div>
                                                </div>

                                                <div className="pt-6 border-t border-gray-100">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-lg font-bold text-gray-900">Estimated deposit</span>
                                                        <span className="text-2xl font-bold text-gray-900">{formatCurrency(estimatedDeposit)}</span>
                                                    </div>
                                                </div>

                                                <div className="pt-6 border-t border-gray-100">
                                                    <div className="flex items-center justify-between text-base">
                                                        <span className="text-gray-500">Credits remaining after withdrawal</span>
                                                        <span className="font-semibold text-gray-900">
                                                            {formatCurrency(availableCredits - normalizedAmount)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="px-8 pb-8 pt-0">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSubmittingWithdrawal}
                                    className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                >
                                    Back
                                </button>
                                <Button
                                    type="button"
                                    isLoading={isSubmittingWithdrawal}
                                    onClick={handleSubmitWithdrawal}
                                    className="px-6 py-2.5 bg-black text-white hover:bg-gray-900 rounded-xl"
                                >
                                    {isSubmittingWithdrawal ? 'Requesting...' : 'Confirm Withdrawal'}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

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
