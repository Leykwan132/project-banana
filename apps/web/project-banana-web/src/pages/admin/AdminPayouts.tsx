import { useState } from 'react';
import { useQuery, usePaginatedQuery, useMutation } from 'convex/react';
import { api } from '../../../../../../packages/backend/convex/_generated/api';
import type { Id } from '../../../../../../packages/backend/convex/_generated/dataModel';
import { Check, X, Loader2, Banknote } from 'lucide-react';
import { Pagination } from '@heroui/react';

const ITEMS_PER_PAGE = 20;

export default function AdminPayouts() {
    const {
        results: allLoadedWithdrawals,
        status: paginationStatus,
        loadMore,
    } = usePaginatedQuery(api.admin.getPendingWithdrawals, {}, { initialNumItems: ITEMS_PER_PAGE });

    const totalCount = useQuery(api.admin.getPendingWithdrawalsCount) ?? 0;
    const approveMutation = useMutation(api.admin.approveWithdrawal);
    const rejectMutation = useMutation(api.admin.rejectWithdrawal);

    const [page, setPage] = useState(1);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
    const pagedWithdrawals = allLoadedWithdrawals.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        const neededItems = newPage * ITEMS_PER_PAGE;
        if (neededItems > allLoadedWithdrawals.length && paginationStatus === "CanLoadMore") {
            loadMore(neededItems - allLoadedWithdrawals.length);
        }
    };

    const handleApprove = async (id: Id<"withdrawals">) => {
        setActionLoading(id);
        try {
            await approveMutation({ withdrawalId: id });
        } catch (e) {
            console.error('Failed to approve withdrawal:', e);
        }
        setActionLoading(null);
    };

    const handleReject = async (id: Id<"withdrawals">) => {
        setActionLoading(id);
        try {
            await rejectMutation({ withdrawalId: id });
        } catch (e) {
            console.error('Failed to reject withdrawal:', e);
        }
        setActionLoading(null);
    };

    const isLoading = paginationStatus === "LoadingFirstPage";

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Payouts</h1>
                    <p className="text-sm text-gray-500">Review and approve pending withdrawal requests · {totalCount} pending</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
            ) : allLoadedWithdrawals.length === 0 ? (
                <div className="text-center py-20 text-gray-400 text-sm font-medium">
                    No pending withdrawal requests
                </div>
            ) : (
                <>
                    {/* Table header */}
                    <div className="grid grid-cols-6 gap-4 px-5 py-3 bg-gray-100 rounded-t-xl text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-1">User</div>
                        <div className="col-span-1">Amount</div>
                        <div className="col-span-1">Bank</div>
                        <div className="col-span-1">Account</div>
                        <div className="col-span-1">Requested</div>
                        <div className="col-span-1 text-right">Actions</div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {pagedWithdrawals.map((withdrawal) => (
                            <div key={withdrawal._id} className="grid grid-cols-6 gap-4 px-5 py-4 items-center bg-white hover:bg-gray-50 transition-colors">
                                <div className="col-span-1">
                                    <p className="text-xs text-gray-400 font-mono truncate">{withdrawal.user_id.slice(0, 16)}...</p>
                                </div>
                                <div className="col-span-1">
                                    <div className="flex items-center gap-1.5">
                                        <Banknote className="w-3.5 h-3.5 text-green-600" />
                                        <span className="font-semibold text-gray-900 text-sm">RM {withdrawal.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                                <div className="col-span-1">
                                    <p className="text-sm text-gray-700 truncate">{withdrawal.bank_account_id}</p>
                                </div>
                                <div className="col-span-1">
                                    <p className="text-sm text-gray-500 font-mono">—</p>
                                </div>
                                <div className="col-span-1">
                                    <p className="text-xs text-gray-500">{new Date(withdrawal.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="col-span-1 flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => handleReject(withdrawal._id)}
                                        disabled={actionLoading === withdrawal._id}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 rounded-lg px-3 py-2 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(withdrawal._id)}
                                        disabled={actionLoading === withdrawal._id}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gray-900 hover:bg-black rounded-lg px-3 py-2 transition-colors"
                                    >
                                        {actionLoading === withdrawal._id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Check className="w-3.5 h-3.5" />
                                        )}
                                        Approve
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-center mt-6">
                            <Pagination
                                total={totalPages}
                                page={page}
                                onChange={handlePageChange}
                                showControls
                                size="sm"
                                classNames={{ cursor: 'bg-gray-900' }}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
