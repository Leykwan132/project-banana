import { useEffect, useMemo, useState } from 'react';
import { useAction, useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '../../../../../../packages/backend/convex/_generated/api';
import type { Id } from '../../../../../../packages/backend/convex/_generated/dataModel';
import { toast } from '../../components/ui/Toast';
import { ArrowDown, ArrowUp, Banknote, Building2, Check, Loader2, Search, User, X } from 'lucide-react';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination } from '@heroui/react';

const ITEMS_PER_PAGE = 20;
type SortKey = 'requester' | 'type' | 'requestedAmount' | 'netAmount' | 'bank' | 'requested';
type SortDirection = 'asc' | 'desc';

const formatRequestedAt = (timestamp: number) =>
    new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

const formatCurrency = (amount: number) =>
    `RM ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getNetAmount = (amount: number, gatewayFee?: number) => Math.max(amount - (gatewayFee ?? 0), 0);

export default function AdminPayouts() {
    const {
        results: allLoadedWithdrawals,
        status: paginationStatus,
        loadMore,
    } = usePaginatedQuery(api.admin.getPendingWithdrawals, {}, { initialNumItems: ITEMS_PER_PAGE });

    const totalCount = useQuery(api.admin.getPendingWithdrawalsCount) ?? 0;
    const approveAction = useAction(api.admin.approveWithdrawal);
    const rejectMutation = useMutation(api.admin.rejectWithdrawal);

    const [page, setPage] = useState(1);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('requested');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [approvalTargetId, setApprovalTargetId] = useState<Id<'withdrawals'> | null>(null);

    const filteredWithdrawals = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        if (!normalizedSearch) {
            return allLoadedWithdrawals;
        }

        return allLoadedWithdrawals.filter((withdrawal) =>
            (withdrawal.requester_label ?? '').toLowerCase().includes(normalizedSearch)
        );
    }, [allLoadedWithdrawals, searchTerm]);

    const sortedWithdrawals = useMemo(() => {
        const sorted = [...filteredWithdrawals];
        sorted.sort((left, right) => {
            const direction = sortDirection === 'asc' ? 1 : -1;

            if (sortKey === 'requestedAmount') {
                return (left.amount - right.amount) * direction;
            }

            if (sortKey === 'netAmount') {
                return (getNetAmount(left.amount, left.gateway_fee) - getNetAmount(right.amount, right.gateway_fee)) * direction;
            }

            if (sortKey === 'requested') {
                return (left.created_at - right.created_at) * direction;
            }

            const getValue = (item: typeof sorted[number]) => {
                switch (sortKey) {
                    case 'requester':
                        return item.requester_label ?? '';
                    case 'type':
                        return item.source_type ?? '';
                    case 'bank':
                        return item.bank_name ?? '';
                    default:
                        return '';
                }
            };

            return getValue(left).localeCompare(getValue(right)) * direction;
        });

        return sorted;
    }, [filteredWithdrawals, sortDirection, sortKey]);

    const totalPages = Math.max(1, Math.ceil(sortedWithdrawals.length / ITEMS_PER_PAGE));
    const pagedWithdrawals = sortedWithdrawals.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    const approvalTarget = useMemo(
        () => allLoadedWithdrawals.find((withdrawal) => withdrawal._id === approvalTargetId) ?? null,
        [allLoadedWithdrawals, approvalTargetId],
    );

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        const neededItems = newPage * ITEMS_PER_PAGE;
        if (neededItems > allLoadedWithdrawals.length && paginationStatus === "CanLoadMore") {
            loadMore(neededItems - allLoadedWithdrawals.length);
        }
    };

    const handleSort = (key: SortKey) => {
        setPage(1);
        if (sortKey === key) {
            setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
            return;
        }

        setSortKey(key);
        setSortDirection(key === 'requestedAmount' || key === 'netAmount' || key === 'requested' ? 'desc' : 'asc');
    };

    useEffect(() => {
        setPage(1);
    }, [searchTerm, sortDirection, sortKey]);

    useEffect(() => {
        if (searchTerm.trim() && paginationStatus === 'CanLoadMore') {
            loadMore(ITEMS_PER_PAGE);
        }
    }, [loadMore, paginationStatus, searchTerm]);

    const renderSortHeader = (label: string, key: SortKey, className = '') => {
        const isActive = sortKey === key;
        return (
            <button
                type="button"
                onClick={() => handleSort(key)}
                className={`flex items-center gap-1.5 text-left transition-colors hover:text-gray-700 ${className}`}
            >
                <span>{label}</span>
                {isActive ? (
                    sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                ) : (
                    <ArrowUp className="h-3.5 w-3.5 opacity-30" />
                )}
            </button>
        );
    };

    const handleApprove = async (id: Id<"withdrawals">) => {
        setActionLoading(id);
        try {
            await approveAction({ withdrawalId: id });
            setApprovalTargetId(null);
            toast({
                title: 'Payout triggered',
                description: 'Billplz payout order created. Waiting for callback confirmation.',
                color: 'success',
            });
        } catch (e) {
            console.error('Failed to approve withdrawal:', e);
            toast({
                title: 'Approval failed',
                description: e instanceof Error ? e.message : 'Unable to trigger the payout right now.',
                color: 'danger',
            });
        }
        setActionLoading(null);
    };

    const handleOpenApproveModal = (id: Id<'withdrawals'>) => {
        setApprovalTargetId(id);
    };

    const handleCloseApproveModal = () => {
        if (approvalTargetId && actionLoading === approvalTargetId) {
            return;
        }

        setApprovalTargetId(null);
    };

    const handleReject = async (id: Id<"withdrawals">) => {
        setActionLoading(id);
        try {
            await rejectMutation({ withdrawalId: id });
            toast({
                title: 'Withdrawal rejected',
                description: 'Reserved funds were returned to the requester.',
                color: 'warning',
            });
        } catch (e) {
            console.error('Failed to reject withdrawal:', e);
            toast({
                title: 'Rejection failed',
                description: e instanceof Error ? e.message : 'Unable to reject this withdrawal.',
                color: 'danger',
            });
        }
        setActionLoading(null);
    };

    const isLoading = paginationStatus === "LoadingFirstPage";

    const renderSourceTypeBadge = (sourceType?: string) => {
        const normalizedType = sourceType ?? 'creator';
        const Icon = normalizedType === 'business' ? Building2 : User;

        return (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                <Icon className="w-3.5 h-3.5" />
                <span className="capitalize">{normalizedType}</span>
            </div>
        );
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Payouts</h1>
                    <p className="text-sm text-gray-500">Review pending withdrawal requests and trigger payout only when approving · {totalCount} pending</p>
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
                    <div className="mb-4 flex justify-start">
                        <label className="relative w-full max-w-sm">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search requester name"
                                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-gray-300"
                            />
                        </label>
                    </div>

                    {/* Table header */}
                    <div className="grid grid-cols-8 gap-4 px-5 py-3 bg-gray-100 rounded-t-xl text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-2">{renderSortHeader('Requester', 'requester')}</div>
                        <div className="col-span-1">{renderSortHeader('Type', 'type')}</div>
                        <div className="col-span-1">{renderSortHeader('Bank', 'bank')}</div>
                        <div className="col-span-1">{renderSortHeader('Requested', 'requested')}</div>
                        <div className="col-span-1">{renderSortHeader('Requested Amount', 'requestedAmount')}</div>
                        <div className="col-span-1">{renderSortHeader('Net Amount', 'netAmount')}</div>
                        <div className="col-span-1 text-right">Actions</div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {pagedWithdrawals.map((withdrawal) => (
                            <div key={withdrawal._id} className="grid grid-cols-8 gap-4 px-5 py-4 items-center bg-white hover:bg-gray-50 transition-colors">
                                <div className="col-span-2 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{withdrawal.requester_label}</p>
                                    <p className="text-xs text-gray-400 font-mono truncate">{withdrawal.user_id.slice(0, 18)}...</p>
                                </div>
                                <div className="col-span-1">
                                    {renderSourceTypeBadge(withdrawal.source_type)}
                                </div>
                                <div className="col-span-1">
                                    <p className="text-sm text-gray-700 truncate">{withdrawal.bank_name ?? 'Unknown bank'}</p>
                                    <p className="text-xs text-gray-400 truncate">{withdrawal.account_holder_name ?? 'Unknown account'}</p>
                                    <p className="text-xs text-gray-400 font-mono">****{withdrawal.account_number?.slice(-4) ?? '0000'}</p>
                                </div>
                                <div className="col-span-1">
                                    <p className="text-xs text-gray-500">{formatRequestedAt(withdrawal.created_at)}</p>
                                </div>
                                <div className="col-span-1">
                                    <div className="flex items-center gap-1.5">
                                        <Banknote className="w-3.5 h-3.5 text-green-600" />
                                        <span className="font-semibold text-gray-900 text-sm">{formatCurrency(withdrawal.amount)}</span>
                                    </div>
                                </div>
                                <div className="col-span-1">
                                    <div className="flex items-center gap-1.5">
                                        <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                                        <span className="font-semibold text-emerald-700 text-sm">
                                            {formatCurrency(getNetAmount(withdrawal.amount, withdrawal.gateway_fee))}
                                        </span>
                                    </div>
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
                                        onClick={() => handleOpenApproveModal(withdrawal._id)}
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

                    {sortedWithdrawals.length === 0 ? (
                        <div className="bg-white py-16 text-center text-sm font-medium text-gray-400">
                            No payout requests match that name
                        </div>
                    ) : null}

                    {totalPages > 1 && sortedWithdrawals.length > 0 && (
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

            <Modal
                isOpen={!!approvalTarget}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        handleCloseApproveModal();
                    }
                }}
                isDismissable={!approvalTargetId || actionLoading !== approvalTargetId}
                hideCloseButton={!!approvalTargetId && actionLoading === approvalTargetId}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <span className="text-xl font-bold text-gray-900">Approve payout?</span>
                                <span className="text-sm font-normal text-gray-500">
                                    Approving here will immediately trigger the Billplz payout order.
                                </span>
                            </ModalHeader>
                            <ModalBody>
                                {approvalTarget ? (
                                    <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                        <div className="flex items-center justify-between gap-6">
                                            <span className="text-sm text-gray-500">Requester</span>
                                            <span className="text-sm font-semibold text-gray-900 text-right">{approvalTarget.requester_label}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-6">
                                            <span className="text-sm text-gray-500">Amount</span>
                                            <span className="text-sm font-semibold text-gray-900">
                                                RM {approvalTarget.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-6">
                                            <span className="text-sm text-gray-500">Bank</span>
                                            <span className="text-sm font-semibold text-gray-900 text-right">
                                                {approvalTarget.bank_name ?? 'Unknown bank'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-6">
                                            <span className="text-sm text-gray-500">Account</span>
                                            <span className="text-sm font-semibold text-gray-900">
                                                ****{approvalTarget.account_number?.slice(-4) ?? '0000'}
                                            </span>
                                        </div>
                                    </div>
                                ) : null}
                            </ModalBody>
                            <ModalFooter>
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleCloseApproveModal();
                                        onClose();
                                    }}
                                    disabled={!!approvalTargetId && actionLoading === approvalTargetId}
                                    className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => approvalTarget && handleApprove(approvalTarget._id)}
                                    disabled={!approvalTarget || (!!approvalTargetId && actionLoading === approvalTargetId)}
                                    className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
                                >
                                    {!!approvalTargetId && actionLoading === approvalTargetId ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4" />
                                    )}
                                    Approve & Pay
                                </button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
