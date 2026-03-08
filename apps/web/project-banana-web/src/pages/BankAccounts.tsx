import { useEffect, useState } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { Landmark, Loader2, Plus, ChevronLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import { addToast } from '@heroui/toast';
import { BANK_OPTIONS } from '../lib/banks';
import StatusBadge from '../components/ui/StatusBadge';
import { isProductTourActive, PRODUCT_TOUR_STATE_EVENT } from '../lib/productTour';

type ProofFile = File | null;
type BankAccountListItem = {
    _id: string;
    bank_name: string;
    account_holder_name: string;
    account_number: string;
    status: string;
};

const TOUR_MOCK_BANK_ACCOUNTS: BankAccountListItem[] = [
    {
        _id: 'tour-bank-001',
        bank_name: 'Maybank',
        account_holder_name: 'Lumina Labs Sdn Bhd',
        account_number: '512345678901',
        status: 'verified',
    },
    {
        _id: 'tour-bank-002',
        bank_name: 'CIMB Bank',
        account_holder_name: 'Lumina Marketing',
        account_number: '800112233445',
        status: 'pending',
    },
    {
        _id: 'tour-bank-003',
        bank_name: 'Public Bank',
        account_holder_name: 'Lumina Operations',
        account_number: '324567890001',
        status: 'verified',
    },
];

export default function BankAccounts() {
    const business = useQuery(api.businesses.getMyBusiness);
    const bankAccounts = useQuery(api.bankAccounts.getUserBankAccounts);
    const [isTourActive, setIsTourActive] = useState(() => isProductTourActive());

    useEffect(() => {
        const syncTourState = () => {
            setIsTourActive(isProductTourActive());
        };
        window.addEventListener(PRODUCT_TOUR_STATE_EVENT, syncTourState);
        return () => {
            window.removeEventListener(PRODUCT_TOUR_STATE_EVENT, syncTourState);
        };
    }, []);

    const generateProofUploadUrl = useAction(api.bankAccounts.generateProofUploadUrl);
    const createBankAccount = useMutation(api.bankAccounts.createBankAccount);

    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [bankName, setBankName] = useState('');
    const [accountHolderName, setAccountHolderName] = useState(business?.name ?? '');
    const [accountNumber, setAccountNumber] = useState('');
    const [proofFile, setProofFile] = useState<ProofFile>(null);
    const [bankFormError, setBankFormError] = useState('');
    const [isSubmittingBank, setIsSubmittingBank] = useState(false);
    const [bankSearchTerm, setBankSearchTerm] = useState('');

    const filteredBanks = BANK_OPTIONS.filter((bank) =>
        bank.name.toLowerCase().includes(bankSearchTerm.toLowerCase())
    );

    const isLoading = !isTourActive && (business === undefined || bankAccounts === undefined);
    const effectiveBankAccounts: BankAccountListItem[] = isTourActive
        ? TOUR_MOCK_BANK_ACCOUNTS
        : ((bankAccounts ?? []) as BankAccountListItem[]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!isTourActive && business === null) {
        return <div className="p-8">Please complete onboarding first.</div>;
    }

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
            const { uploadUrl, r2Key } = await generateProofUploadUrl({ contentType });

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
                proofDocumentKey: r2Key,
            });

            setBankName('');
            setAccountHolderName(business?.name ?? '');
            setAccountNumber('');
            setProofFile(null);
            setIsAdding(false);
            setBankSearchTerm('');

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

    if (isAdding) {
        return (
            <div className="animate-fadeIn p-8 pb-24 text-gray-900">
                <div className="flex justify-between items-center mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => setIsAdding(false)}
                        icon={<ChevronLeft className="w-5 h-5" />}
                        className="pl-0 hover:bg-transparent hover:text-gray-600"
                    >
                        Back
                    </Button>
                </div>

                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Add Bank Account</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Submit an account for review before it becomes available for withdrawals.
                        </p>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto mt-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left side: Bank Selection */}
                    <div className="space-y-4">
                        <label className="block text-sm font-semibold text-gray-900">Select deposit bank</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search banks..."
                                value={bankSearchTerm}
                                onChange={(e) => setBankSearchTerm(e.target.value)}
                                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none transition focus:border-gray-300"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {filteredBanks.map((bank) => {
                                const isSelected = bankName === bank.name;
                                return (
                                    <button
                                        key={bank.name}
                                        type="button"
                                        onClick={() => {
                                            setBankName(bank.name);
                                            setBankFormError('');
                                        }}
                                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${isSelected
                                            ? 'border-gray-900 bg-gray-900 text-white'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                    >
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ${isSelected ? '' : 'border border-gray-100'}`}>
                                            {bank.logo ? (
                                                <img src={bank.logo} alt={bank.name} className="h-6 w-6 object-contain" />
                                            ) : (
                                                <Landmark className="h-4 w-4 text-gray-400" />
                                            )}
                                        </div>
                                        <span className="font-semibold text-sm leading-tight">{bank.name}</span>
                                    </button>
                                );
                            })}
                            {filteredBanks.length === 0 && (
                                <div className="col-span-2 text-center py-8 text-gray-500 text-sm">
                                    No banks found matching "{bankSearchTerm}"
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right side: Form Details */}
                    <div>
                        <section className="rounded-3xl border border-gray-200 bg-white p-6">
                            <div className="space-y-5">
                                <div className="mb-2">
                                    <h3 className="text-lg font-bold text-gray-900">Account Details</h3>
                                    <p className="text-sm text-gray-500">Provide the holder name and document proof.</p>
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
                                        <span className="font-medium text-gray-900 text-center">
                                            {proofFile ? proofFile.name : 'Upload bank statement, screenshot, or PDF proof'}
                                        </span>
                                        <span className="mt-1 text-xs text-gray-500 text-center">
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

                                {bankFormError && (
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                        {bankFormError}
                                    </div>
                                )}

                                <div>
                                    <Button
                                        variant="primary"
                                        onClick={handleSubmitBankAccount}
                                        isLoading={isSubmittingBank}
                                        className="h-14 w-full rounded-2xl mt-4"
                                    >
                                        {isSubmittingBank ? 'Submitting for review...' : 'Submit bank account'}
                                    </Button>
                                    <p className="mt-3 text-center text-xs text-gray-500 font-medium">
                                        Reviewer normally takes around 2-3 business days.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
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

    return (
        <div className="p-8 font-sans text-gray-900 animate-fadeIn" data-tour-id="bank-accounts-page">
            <h1 className="text-2xl font-bold mb-6">Bank Accounts</h1>

            <div className="mb-12">
                <div className="flex justify-between items-center mb-6" data-tour-id="bank-accounts-header">
                    <h2 className="text-lg font-semibold"> Accounts</h2>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-[#1C1C1C] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Bank Account
                    </button>
                </div>

                {effectiveBankAccounts.length > 0 ? (
                    <div className="bg-white overflow-hidden">
                        <div className="bg-[#F4F6F8] rounded-sm mt-2 grid grid-cols-12 gap-4 p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <div className="col-span-3 pl-2">Bank</div>
                            <div className="col-span-3 flex items-center justify-start">Account Name</div>
                            <div className="col-span-3 flex items-center justify-start">Account Number</div>
                            <div className="col-span-3 flex items-center justify-center">Status</div>
                        </div>

                        <div className="divide-y divide-[#F4F6F8]">
                            {effectiveBankAccounts.map((account) => {
                                const metadata = BANK_OPTIONS.find((option) => option.name === account.bank_name);

                                return (
                                    <div
                                        key={account._id}
                                        className="grid grid-cols-12 gap-4 p-6 items-center hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="col-span-3 flex items-center gap-3 pl-2">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
                                                {metadata?.logo ? (
                                                    <img src={metadata.logo} alt={account.bank_name} className="h-6 w-6 object-contain" />
                                                ) : (
                                                    <Landmark className="h-4 w-4 text-gray-500" />
                                                )}
                                            </div>
                                            <span className="font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{account.bank_name}</span>
                                        </div>
                                        <div className="col-span-3 text-gray-900 font-medium whitespace-nowrap overflow-hidden text-ellipsis flex items-center justify-start">
                                            {account.account_holder_name}
                                        </div>
                                        <div className="col-span-3 text-gray-900 font-medium flex items-center justify-start truncate">
                                            ****{account.account_number.slice(-4)}
                                        </div>
                                        <div className="col-span-3 flex items-center justify-center">
                                            <StatusBadge status={account.status || 'unknown'} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-20 bg-[#F9FAFB] rounded-3xl text-center">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                            <Landmark className="w-10 h-10 text-gray-900" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No bank accounts</h3>
                        <p className="text-gray-500 mb-8 max-w-sm">
                            Add a bank account to start processing withdrawals.
                        </p>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="bg-[#1C1C1C] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Bank Account
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
