import { Loader2, ArrowRight, Landmark } from 'lucide-react';
import { useQuery } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import type { Id } from '../../../../../packages/backend/convex/_generated/dataModel';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';

const formatCurrency = (value: number) =>
    `RM ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

export default function Withdrawals() {
    const navigate = useNavigate();
    const business = useQuery(api.businesses.getMyBusiness);
    const withdrawals = useQuery(api.payouts.getBusinessWithdrawals);
    const gatewayFee = useQuery(api.payouts.getPayoutGatewayFee) ?? 0;

    const availableCredits = business?.credit_balance ?? 0;
    const isLoading = business === undefined || withdrawals === undefined;

    const withdrawalHistory = (withdrawals ?? []) as Array<{
        _id: Id<'withdrawals'>;
        amount: number;
        gateway_fee?: number;
        status: string;
        created_at: number;
        bank_name?: string | null;
        account_number?: string | null;
    }>;

    const handleRequestWithdrawal = () => {
        navigate('/withdrawals/request');
    };

    return (
        <div className="p-8 font-sans text-gray-900 animate-fadeIn">
            <h1 className="text-2xl font-bold mb-6">Withdrawals</h1>

            <div className="flex flex-col gap-8">
                {/* Top Section: Balance & Actions */}
                <div className="w-full max-w-lg">
                    <div className="bg-[#0F172A] text-white p-8 rounded-xl flex flex-col justify-between min-h-[300px] shadow-xl shadow-black/10 relative">
                        {/* Icon */}
                        <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                            <Landmark className="w-7 h-7 text-white" />
                        </div>

                        {/* Bottom Section */}
                        <div className="flex items-end justify-between mt-8">
                            <div>
                                <div className="text-gray-400 font-medium mb-2">Available to withdraw</div>
                                <div className="text-4xl font-bold">
                                    {isLoading ? (
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    ) : (
                                        `Rm ${availableCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    )}
                                </div>
                            </div>
                            <Button
                                variant='outline'
                                className="rounded-full px-6 text-gray-900 bg-white hover:bg-gray-100 border-none"
                                icon={<ArrowRight className="w-4 h-4" />}
                                onClick={handleRequestWithdrawal}
                            >
                                Request
                            </Button>
                        </div>
                    </div>
                </div>

                {/* History Section */}
                <div className="bg-white overflow-hidden">
                    <div className="flex items-center justify-between mb-4 w-[75%]">
                        <div className="flex items-center gap-6">
                            <button className="font-bold text-lg transition-colors relative pb-1 text-gray-900 border-b-2 border-gray-900">
                                Past Withdrawals
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#F4F6F8] w-[75%] rounded-lg mt-2 grid grid-cols-5 gap-4 p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">
                        <div className="col-span-1 pl-2 flex items-center">Date</div>
                        <div className="col-span-1 flex items-center justify-center">Bank</div>
                        <div className="col-span-1 flex items-center justify-center">Account Number</div>
                        <div className="col-span-1 flex items-center justify-center">Deposit Amount</div>
                        <div className="col-span-1 flex items-center justify-center">Status</div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12 w-[75%]">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : !withdrawalHistory || withdrawalHistory.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 w-[75%]">
                            No withdrawal history found
                        </div>
                    ) : (
                        <div className="divide-y divide-[#F4F6F8] w-[75%]">
                            {withdrawalHistory.map((withdrawal) => {
                                const deposit = Math.max(withdrawal.amount - (withdrawal.gateway_fee ?? gatewayFee), 0);

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
                                        <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center">
                                            {formatCurrency(deposit)}
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
