import { useState } from 'react';
import { useQuery, usePaginatedQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../../../../packages/backend/convex/_generated/api';
import type { Id } from '../../../../../../packages/backend/convex/_generated/dataModel';
import { Check, X, Eye, Loader2 } from 'lucide-react';
import { Pagination } from '@heroui/react';

const ITEMS_PER_PAGE = 20;

export default function AdminBankApprovals() {
    const {
        results: allLoadedAccounts,
        status: paginationStatus,
        loadMore,
    } = usePaginatedQuery(api.admin.getPendingBankAccounts, {}, { initialNumItems: ITEMS_PER_PAGE });

    const totalCount = useQuery(api.admin.getPendingBankAccountsCount) ?? 0;
    const approveMutation = useMutation(api.admin.approveBankAccount);
    const rejectMutation = useMutation(api.admin.rejectBankAccount);
    const generateProofUrl = useAction(api.admin.generateAdminProofAccessUrl);

    const [page, setPage] = useState(1);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
    const [loadingProof, setLoadingProof] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
    const pagedAccounts = allLoadedAccounts.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        const neededItems = newPage * ITEMS_PER_PAGE;
        if (neededItems > allLoadedAccounts.length && paginationStatus === "CanLoadMore") {
            loadMore(neededItems - allLoadedAccounts.length);
        }
    };

    const handleViewProof = async (accountId: string, s3Key: string) => {
        if (proofUrls[accountId]) {
            setExpandedId(expandedId === accountId ? null : accountId);
            return;
        }
        setLoadingProof(accountId);
        try {
            const url = await generateProofUrl({ s3Key });
            setProofUrls((prev) => ({ ...prev, [accountId]: url }));
            setExpandedId(accountId);
        } catch (e) {
            console.error('Failed to load proof:', e);
        }
        setLoadingProof(null);
    };

    const handleApprove = async (id: Id<"bank_accounts">) => {
        setActionLoading(id);
        try {
            await approveMutation({ bankAccountId: id });
        } catch (e) {
            console.error('Failed to approve:', e);
        }
        setActionLoading(null);
    };

    const handleReject = async (id: Id<"bank_accounts">) => {
        setActionLoading(id);
        try {
            await rejectMutation({ bankAccountId: id });
        } catch (e) {
            console.error('Failed to reject:', e);
        }
        setActionLoading(null);
    };

    const isLoading = paginationStatus === "LoadingFirstPage";

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Bank Approvals</h1>
                    <p className="text-sm text-gray-500">Review pending bank account verifications · {totalCount} pending</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
            ) : allLoadedAccounts.length === 0 ? (
                <div className="text-center py-20 text-gray-400 text-sm font-medium">
                    No pending bank approvals
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {pagedAccounts.map((account) => (
                            <div key={account._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between p-5">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <p className="font-semibold text-gray-900 text-sm">{account.account_holder_name || 'N/A'}</p>
                                            <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-medium">
                                                Pending
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {account.bank_name} · ****{account.account_number.slice(-4)} · {new Date(account.created_at).toLocaleDateString()}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5 font-mono">User: {account.user_id.slice(0, 16)}...</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {account.proof_document_s3_key && (
                                            <button
                                                onClick={() => handleViewProof(account._id, account.proof_document_s3_key!)}
                                                disabled={loadingProof === account._id}
                                                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-2 transition-colors"
                                            >
                                                {loadingProof === account._id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Eye className="w-3.5 h-3.5" />
                                                )}
                                                Proof
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleReject(account._id)}
                                            disabled={actionLoading === account._id}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 rounded-lg px-3 py-2 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleApprove(account._id)}
                                            disabled={actionLoading === account._id}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gray-900 hover:bg-black rounded-lg px-3 py-2 transition-colors"
                                        >
                                            {actionLoading === account._id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Check className="w-3.5 h-3.5" />
                                            )}
                                            Approve
                                        </button>
                                    </div>
                                </div>

                                {expandedId === account._id && proofUrls[account._id] && (
                                    <div className="border-t border-gray-100 bg-gray-50 p-5">
                                        <p className="text-xs font-medium text-gray-500 mb-3">Proof Document</p>
                                        <img
                                            src={proofUrls[account._id]}
                                            alt="Bank proof"
                                            className="max-w-md rounded-lg border border-gray-200 shadow-sm"
                                        />
                                    </div>
                                )}
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
