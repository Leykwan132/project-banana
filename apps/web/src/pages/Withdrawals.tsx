import { Loader2, ArrowRight, Landmark } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { Popover, PopoverTrigger, PopoverContent } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import type { Id } from '../../../../packages/backend/convex/_generated/dataModel';
import { api } from '../../../../packages/backend/convex/_generated/api';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';

const formatCurrency = (value: number) =>
    `RM ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function WithdrawalAmount({ requested, gatewayFee, platformFee, finalAmount }: { requested: number; gatewayFee: number; platformFee: number; finalAmount: number }) {
    const [isOpen, setIsOpen] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const keepOpen = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = null;
        setIsOpen(true);
    };
    const closeSoon = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setIsOpen(false), 160);
    };
    useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
    const rows = [
        ['Requested amount', requested],
        ['Gateway fee', -gatewayFee],
        ['Platform fee', -platformFee],
    ] as const;
    return <Popover placement="top" showArrow isOpen={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger>
            <button type="button" aria-label={`Show breakdown for ${formatCurrency(finalAmount)}`} aria-expanded={isOpen} onMouseEnter={keepOpen} onMouseLeave={closeSoon} onFocus={keepOpen} onBlur={closeSoon} onClick={keepOpen} className="cursor-help border-b border-dotted border-gray-400 font-medium text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500">{formatCurrency(finalAmount)}</button>
        </PopoverTrigger>
        <PopoverContent>
            <div onMouseEnter={keepOpen} onMouseLeave={closeSoon} className="w-60 space-y-3 rounded-xl bg-white p-4 text-xs text-gray-700 shadow-lg">
                {rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-5"><span className="text-gray-500">{label}</span><span className="whitespace-nowrap font-medium text-gray-900">{value < 0 ? `- ${formatCurrency(Math.abs(value))}` : formatCurrency(value)}</span></div>)}
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between gap-5"><span className="text-gray-500">Final amount</span><span className="whitespace-nowrap font-semibold text-gray-900">{formatCurrency(finalAmount)}</span></div>
            </div>
        </PopoverContent>
    </Popover>;
}

const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
};

export default function Withdrawals({ workspace = 'business' }: { workspace?: 'business' | 'creator' }) {
    const isCreator = workspace === 'creator';
    const navigate = useNavigate();
    const business = useQuery(api.businesses.getMyBusiness, isCreator ? 'skip' : {});
    const withdrawals = useQuery(isCreator ? api.payouts.getUserWithdrawals : api.payouts.getBusinessWithdrawals);

    const creatorBalance = useQuery(api.users.getUserBalance, isCreator ? {} : 'skip');
    const availableCredits = isCreator ? (creatorBalance?.balance ?? 0) : (business?.credit_balance ?? 0);
    const isLoading = (isCreator ? creatorBalance === undefined : business === undefined) || withdrawals === undefined;

    const withdrawalHistory = (withdrawals ?? []) as Array<{
        _id: Id<'withdrawals'>;
        amount: number;
        gateway_fee?: number;
        platform_fee?: number;
        status: string;
        created_at: number;
        bank_name?: string | null;
        account_number?: string | null;
    }>;

    const handleRequestWithdrawal = () => {
        navigate(isCreator ? '/creator/withdraw/request' : '/withdrawals/request');
    };

    return (
        <div className="bg-white p-4 sm:p-8 font-sans text-gray-900 animate-fadeIn">
            <h1 className="text-2xl font-bold mb-6">{isCreator ? 'Withdraw' : 'Withdrawals'}</h1>
            {isCreator && <Button variant="ghost" onClick={() => navigate('/creator/bank-accounts')} className="mb-6">Manage bank accounts</Button>}

            <div className="flex flex-col gap-8">
                {/* Top Section: Balance & Actions */}
                <div className="w-full max-w-[22.4rem]">
                    <div className="bg-[#0F172A] text-white rounded-xl flex h-[210px] flex-col justify-between p-6 shadow-xl shadow-black/10 relative">
                        {/* Icon */}
                        <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                            <Landmark className="h-5 w-5 text-white" />
                        </div>

                        {/* Bottom Section */}
                        <div className="flex flex-wrap items-end justify-between gap-4 mt-6">
                            <div>
                                <div className="mb-2 text-sm font-medium text-gray-400">Available to withdraw</div>
                                <div className="whitespace-nowrap text-2xl font-bold">
                                    {isLoading ? (
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    ) : (
                                        `RM ${availableCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    )}
                                </div>
                            </div>
                            <Button
                                variant='outline'
                                data-tour-id="withdrawals-request-button"
                                className="!px-4 whitespace-nowrap rounded-full text-gray-900 bg-white hover:bg-gray-100 border-none"
                                icon={<ArrowRight className="w-4 h-4" />}
                                onClick={handleRequestWithdrawal}
                            >
                                Request
                            </Button>
                        </div>
                    </div>
                </div>

                {/* History Section */}
                <div className="bg-white overflow-x-auto">
                    <div className="flex items-center justify-between mb-4 w-full">
                        <div className="flex items-center gap-6">
                            <button className="font-bold text-lg transition-colors relative pb-1 text-gray-900 border-b-2 border-gray-900">
                                Past Withdrawals
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#F4F6F8] w-full min-w-[640px] rounded-lg mt-2 grid grid-cols-5 gap-4 p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">
                        <div className="col-span-1 pl-2 flex items-center">Date</div>
                        <div className="col-span-1 flex items-center justify-center">Bank</div>
                        <div className="col-span-1 flex items-center justify-center">Account Number</div>
                        <div className="col-span-1 flex items-center justify-center">Amount</div>
                        <div className="col-span-1 flex items-center justify-center">Status</div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12 w-full">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : !withdrawalHistory || withdrawalHistory.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 w-full">
                            No withdrawal history found
                        </div>
                    ) : (
                        <div className="divide-y divide-[#F4F6F8] w-full min-w-[640px]">
                            {withdrawalHistory.map((withdrawal) => {
                                const actualAmount = Math.max(
                                    withdrawal.amount - (withdrawal.gateway_fee ?? 0) - (withdrawal.platform_fee ?? 0),
                                    0,
                                );
                                const gatewayFee = withdrawal.gateway_fee ?? 0;
                                const platformFee = withdrawal.platform_fee ?? 0;

                                return (
                                    <div
                                        key={withdrawal._id}
                                        className="grid grid-cols-5 p-6 items-center hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="col-span-1 font-medium text-gray-900 truncate pl-2">
                                            {formatDate(withdrawal.created_at)}
                                        </div>
                                        <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center text-center">
                                            <span>{withdrawal.bank_name ?? 'Unknown'}</span>
                                        </div>
                                        <div className="col-span-1 text-gray-500 text-sm flex items-center justify-center font-medium">
                                            <span>****{withdrawal.account_number?.slice(-4) ?? '0000'}</span>
                                        </div>
                                        <div className="col-span-1 flex items-center justify-center">
                                            <WithdrawalAmount requested={withdrawal.amount} gatewayFee={gatewayFee} platformFee={platformFee} finalAmount={actualAmount} />
                                        </div>
                                        <div className="col-span-1 flex items-center justify-center font-medium">
                                            <StatusBadge status={withdrawal.status || 'unknown'} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
