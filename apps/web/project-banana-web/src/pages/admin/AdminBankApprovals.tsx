import { useEffect, useMemo, useState } from 'react';
import { useQuery, usePaginatedQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../../../../packages/backend/convex/_generated/api';
import type { Id } from '../../../../../../packages/backend/convex/_generated/dataModel';
import { Check, ChevronRight, Loader2, X } from 'lucide-react';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Pagination } from '@heroui/react';
import { addToast } from '@heroui/toast';

const ITEMS_PER_PAGE = 20;
type ProofDocument = {
    url: string;
    isPdf: boolean;
};

export default function AdminBankApprovals() {
    const {
        results: allLoadedAccounts,
        status: paginationStatus,
        loadMore,
    } = usePaginatedQuery(api.admin.getPendingBankAccounts, {}, { initialNumItems: ITEMS_PER_PAGE });

    const totalCount = useQuery(api.admin.getPendingBankAccountsCount) ?? 0;
    const approveMutation = useMutation(api.admin.approveBankAccount);
    const rejectMutation = useMutation(api.admin.rejectBankAccount);
    const generateProofUrl = useAction(api.bankAccounts.generateProofAccessUrl);

    const [page, setPage] = useState(1);
    const [selectedAccountId, setSelectedAccountId] = useState<Id<'bank_accounts'> | null>(null);
    const [proofDocuments, setProofDocuments] = useState<Record<string, ProofDocument>>({});
    const [loadingProof, setLoadingProof] = useState<Id<'bank_accounts'> | null>(null);
    const [actionLoading, setActionLoading] = useState<Id<'bank_accounts'> | null>(null);

    const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
    const pagedAccounts = allLoadedAccounts.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    const selectedAccount = useMemo(
        () => allLoadedAccounts.find((account) => account._id === selectedAccountId) ?? null,
        [allLoadedAccounts, selectedAccountId],
    );
    const selectedProof = selectedAccount ? proofDocuments[selectedAccount._id] : null;
    const isSelectedAccountActioning = !!selectedAccount && actionLoading === selectedAccount._id;

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        const neededItems = newPage * ITEMS_PER_PAGE;
        if (neededItems > allLoadedAccounts.length && paginationStatus === "CanLoadMore") {
            loadMore(neededItems - allLoadedAccounts.length);
        }
    };

    const handleOpenReview = (accountId: Id<'bank_accounts'>) => {
        setSelectedAccountId(accountId);
    };

    const handleCloseReview = () => {
        setSelectedAccountId(null);
    };

    const handleApprove = async (id: Id<"bank_accounts">) => {
        setActionLoading(id);
        try {
            await approveMutation({ bankAccountId: id });
            addToast({
                title: 'Bank account approved',
                color: 'success',
            });
            handleCloseReview();
        } catch (e) {
            console.error('Failed to approve:', e);
            addToast({
                title: 'Failed to approve bank account',
                description: e instanceof Error ? e.message : 'Please try again.',
                color: 'danger',
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id: Id<"bank_accounts">) => {
        setActionLoading(id);
        try {
            await rejectMutation({ bankAccountId: id });
            addToast({
                title: 'Bank account rejected',
                color: 'success',
            });
            handleCloseReview();
        } catch (e) {
            console.error('Failed to reject:', e);
            addToast({
                title: 'Failed to reject bank account',
                description: e instanceof Error ? e.message : 'Please try again.',
                color: 'danger',
            });
        } finally {
            setActionLoading(null);
        }
    };

    const isLoading = paginationStatus === "LoadingFirstPage";

    useEffect(() => {
        if (selectedAccountId && !selectedAccount) {
            setSelectedAccountId(null);
        }
    }, [selectedAccount, selectedAccountId]);

    useEffect(() => {
        if (!selectedAccount?.proof_document_r2_key) {
            return;
        }
        if (proofDocuments[selectedAccount._id] || loadingProof === selectedAccount._id) {
            return;
        }
        const accountId = selectedAccount._id;
        const proofKey = selectedAccount.proof_document_r2_key;

        const loadProof = async () => {
            setLoadingProof(accountId);
            try {
                const url = await generateProofUrl({ r2Key: proofKey });
                const normalizedKey = proofKey.toLowerCase();
                setProofDocuments((prev) => ({
                    ...prev,
                    [accountId]: {
                        url,
                        isPdf: normalizedKey.endsWith('.pdf') || normalizedKey.includes('.pdf?'),
                    },
                }));
            } catch (e) {
                console.error('Failed to load proof:', e);
                addToast({
                    title: 'Unable to load proof',
                    description: e instanceof Error ? e.message : 'Please try opening this review again.',
                    color: 'danger',
                });
            } finally {
                setLoadingProof((current) => (current === accountId ? null : current));
            }
        };

        void loadProof();
    }, [generateProofUrl, loadingProof, proofDocuments, selectedAccount]);

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="mb-1 flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bank Approvals</h1>
                        <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                            {totalCount}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">Review pending bank account </p>
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
                                <button
                                    type="button"
                                    onClick={() => handleOpenReview(account._id)}
                                    className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-gray-50"
                                >
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
                                    <div className="flex items-center gap-3 shrink-0">
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                </button>
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

            <Modal
                isOpen={!!selectedAccount}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        handleCloseReview();
                    }
                }}
                size="full"
                scrollBehavior="inside"
                isDismissable={!isSelectedAccountActioning}
                hideCloseButton={isSelectedAccountActioning}
                classNames={{
                    wrapper: 'items-stretch',
                    base: 'm-0 h-[100dvh] max-w-none rounded-none',
                    body: 'p-0',
                    header: 'border-b border-gray-100 px-6 py-5 md:px-8',
                    footer: 'border-t border-gray-100 px-6 py-4 md:px-8',
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex items-start justify-between gap-6">
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">Bank account review</p>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {selectedAccount?.account_holder_name || 'Pending bank account'} · {selectedAccount?.bank_name || 'Unknown bank'}
                                    </p>
                                </div>
                                <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-full font-medium">
                                    Pending
                                </span>
                            </ModalHeader>
                            <ModalBody>
                                <div className="grid min-h-[calc(100dvh-149px)] grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_420px]">
                                    <div className="bg-gray-100 p-6 md:p-8">
                                        <div className="flex h-full min-h-[50vh] items-center justify-center rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                                            {!selectedAccount?.proof_document_r2_key ? (
                                                <p className="text-sm font-medium text-gray-400">No proof document uploaded for this bank account.</p>
                                            ) : loadingProof === selectedAccount._id && !selectedProof ? (
                                                <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    Loading proof document...
                                                </div>
                                            ) : selectedProof?.isPdf ? (
                                                <iframe
                                                    src={selectedProof.url}
                                                    title="Bank proof"
                                                    className="h-[calc(100dvh-220px)] min-h-[560px] w-full rounded-xl border border-gray-200 bg-white"
                                                />
                                            ) : selectedProof ? (
                                                <img
                                                    src={selectedProof.url}
                                                    alt="Bank proof"
                                                    className="max-h-[calc(100dvh-220px)] w-auto max-w-full rounded-xl object-contain"
                                                />
                                            ) : (
                                                <p className="text-sm font-medium text-gray-400">Proof document could not be loaded.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-100 bg-white p-6 md:p-8 xl:border-l xl:border-t-0">
                                        <div className="space-y-8">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Bank Account Details</p>
                                                <div className="mt-5 space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500">Bank</p>
                                                        <p className="mt-1 text-sm font-semibold text-gray-900">{selectedAccount?.bank_name || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500">Full account number</p>
                                                        <p className="mt-1 text-sm font-semibold text-gray-900">{selectedAccount?.account_number || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500">Account name</p>
                                                        <p className="mt-1 text-sm font-semibold text-gray-900">{selectedAccount?.account_holder_name || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Submission Info</p>
                                                <div className="mt-5 space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500">Submitted on</p>
                                                        <p className="mt-1 text-sm font-semibold text-gray-900">
                                                            {selectedAccount ? new Date(selectedAccount.created_at).toLocaleString() : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500">User ID</p>
                                                        <p className="mt-1 break-all font-mono text-xs text-gray-700">{selectedAccount?.user_id || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSelectedAccountActioning}
                                    className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={() => selectedAccount && handleReject(selectedAccount._id)}
                                    disabled={!selectedAccount || isSelectedAccountActioning}
                                    className="flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-50"
                                >
                                    {isSelectedAccountActioning ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <X className="h-4 w-4" />
                                    )}
                                    Reject
                                </button>
                                <button
                                    type="button"
                                    onClick={() => selectedAccount && handleApprove(selectedAccount._id)}
                                    disabled={!selectedAccount || isSelectedAccountActioning}
                                    className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
                                >
                                    {isSelectedAccountActioning ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4" />
                                    )}
                                    Approve
                                </button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
