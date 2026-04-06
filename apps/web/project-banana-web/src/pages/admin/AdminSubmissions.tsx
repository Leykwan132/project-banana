import { useEffect, useMemo, useState } from 'react';
import { useAction, useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '../../../../../../packages/backend/convex/_generated/api';
import type { Id } from '../../../../../../packages/backend/convex/_generated/dataModel';
import { toast } from '../../components/ui/Toast';
import { Building2, Check, ChevronRight, Loader2, MessageSquare, Play, Search, User, X } from 'lucide-react';
import { Pagination } from '@heroui/react';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '../../components/ui/Modal';
import ReactPlayer from 'react-player';

const ITEMS_PER_PAGE = 20;

const formatSubmittedAt = (timestamp: number) =>
    new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

export default function AdminSubmissions() {
    const {
        results: allLoadedSubmissions,
        status: paginationStatus,
        loadMore,
    } = usePaginatedQuery(api.admin.getPendingSubmissions, {}, { initialNumItems: ITEMS_PER_PAGE });

    const totalCount = useQuery(api.admin.getPendingSubmissionsCount) ?? 0;
    const approveMutation = useMutation(api.submissions.approveSubmission);
    const requestChangesMutation = useMutation(api.submissions.requestChanges);
    const generateVideoUrl = useAction(api.admin.generateAdminVideoAccessUrl);

    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [businessFilter, setBusinessFilter] = useState('all');
    const [selectedId, setSelectedId] = useState<Id<'submissions'> | null>(null);
    const [approvalTargetId, setApprovalTargetId] = useState<Id<'submissions'> | null>(null);
    const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
    const [loadingVideo, setLoadingVideo] = useState<Id<'submissions'> | null>(null);
    const [actionLoading, setActionLoading] = useState<Id<'submissions'> | null>(null);
    const [feedback, setFeedback] = useState('');
    const [showFeedback, setShowFeedback] = useState(false);

    const filteredSubmissions = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return allLoadedSubmissions.filter((submission) => {
            const matchesSearch = !normalizedSearch
                || (submission.creator_name ?? '').toLowerCase().includes(normalizedSearch);
            const matchesBusiness = businessFilter === 'all'
                || (submission.business_name ?? 'Unknown Business') === businessFilter;

            return matchesSearch && matchesBusiness;
        });
    }, [allLoadedSubmissions, businessFilter, searchTerm]);

    const businessOptions = useMemo(
        () => Array.from(new Set(allLoadedSubmissions.map((submission) => submission.business_name ?? 'Unknown Business'))).sort((a, b) => a.localeCompare(b)),
        [allLoadedSubmissions],
    );

    const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE));
    const pagedSubmissions = filteredSubmissions.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    const selectedSubmission = useMemo(
        () => allLoadedSubmissions.find((submission) => submission._id === selectedId) ?? null,
        [allLoadedSubmissions, selectedId],
    );
    const approvalTarget = useMemo(
        () => allLoadedSubmissions.find((submission) => submission._id === approvalTargetId) ?? null,
        [allLoadedSubmissions, approvalTargetId],
    );

    const selectedDetail = useQuery(
        api.admin.getSubmissionWithCampaign,
        selectedId ? { submissionId: selectedId } : 'skip',
    );

    const isLoading = paginationStatus === 'LoadingFirstPage';
    const isReviewOpen = !!selectedId;
    const isApprovalOpen = !!approvalTargetId;
    const isSelectedSubmissionActioning = !!selectedId && actionLoading === selectedId;

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        const neededItems = newPage * ITEMS_PER_PAGE;
        if (neededItems > filteredSubmissions.length && paginationStatus === 'CanLoadMore') {
            loadMore(neededItems - filteredSubmissions.length);
        }
    };

    const handleOpenReview = (submissionId: Id<'submissions'>) => {
        setSelectedId(submissionId);
        setFeedback('');
        setShowFeedback(false);
    };

    const handleCloseReview = () => {
        if (selectedId && actionLoading === selectedId) {
            return;
        }

        setSelectedId(null);
        setFeedback('');
        setShowFeedback(false);
    };

    const handleOpenApproveModal = (submissionId: Id<'submissions'>) => {
        setApprovalTargetId(submissionId);
    };

    const handleCloseApproveModal = () => {
        if (approvalTargetId && actionLoading === approvalTargetId) {
            return;
        }

        setApprovalTargetId(null);
    };

    useEffect(() => {
        setPage(1);
    }, [businessFilter, searchTerm]);

    useEffect(() => {
        if ((searchTerm.trim() || businessFilter !== 'all') && paginationStatus === 'CanLoadMore') {
            loadMore(ITEMS_PER_PAGE);
        }
    }, [businessFilter, loadMore, paginationStatus, searchTerm]);

    useEffect(() => {
        if (selectedId && !selectedSubmission) {
            setSelectedId(null);
        }
    }, [selectedId, selectedSubmission]);

    useEffect(() => {
        if (!selectedDetail?.r2_key) {
            return;
        }
        if (videoUrls[selectedDetail._id] || loadingVideo === selectedDetail._id) {
            return;
        }

        const submissionId = selectedDetail._id;
        const r2Key = selectedDetail.r2_key;

        const loadVideo = async () => {
            setLoadingVideo(submissionId);
            try {
                const url = await generateVideoUrl({ r2Key });
                if (url) {
                    setVideoUrls((prev) => ({ ...prev, [submissionId]: url }));
                }
            } catch (error) {
                console.error('Failed to load video:', error);
                toast({
                    title: 'Unable to load video',
                    description: error instanceof Error ? error.message : 'Please try opening this submission again.',
                    color: 'danger',
                });
            } finally {
                setLoadingVideo((current) => (current === submissionId ? null : current));
            }
        };

        void loadVideo();
    }, [generateVideoUrl, loadingVideo, selectedDetail, videoUrls]);

    const handleApprove = async (id: Id<'submissions'>) => {
        setActionLoading(id);
        try {
            await approveMutation({ submissionId: id, feedback: feedback.trim() || undefined });
            toast({
                title: 'Submission approved',
                color: 'success',
            });
            setApprovalTargetId(null);
            handleCloseReview();
        } catch (error) {
            console.error('Failed to approve submission:', error);
            toast({
                title: 'Approval failed',
                description: error instanceof Error ? error.message : 'Unable to approve this submission right now.',
                color: 'danger',
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handleRequestChanges = async (id: Id<'submissions'>) => {
        if (!feedback.trim()) {
            setShowFeedback(true);
            toast({
                title: 'Feedback required',
                description: 'Please add feedback before requesting changes.',
                color: 'warning',
            });
            return;
        }

        setActionLoading(id);
        try {
            await requestChangesMutation({ submissionId: id, feedback: feedback.trim() });
            toast({
                title: 'Changes requested',
                color: 'success',
            });
            handleCloseReview();
        } catch (error) {
            console.error('Failed to request changes:', error);
            toast({
                title: 'Request failed',
                description: error instanceof Error ? error.message : 'Unable to request changes right now.',
                color: 'danger',
            });
        } finally {
            setActionLoading(null);
        }
    };

    const selectedVideoUrl = selectedDetail ? videoUrls[selectedDetail._id] ?? selectedDetail.video_url ?? null : null;

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Submissions</h1>
                    <p className="text-sm text-gray-500">Review pending creator submissions, filter by business, and approve only after checking the campaign requirements · {totalCount} pending</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
            ) : allLoadedSubmissions.length === 0 ? (
                <div className="text-center py-20 text-gray-400 text-sm font-medium">
                    No pending submissions
                </div>
            ) : (
                <>
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <label className="relative w-full max-w-sm">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search creator name"
                                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-gray-300"
                            />
                        </label>

                        <label className="flex items-center gap-2 text-sm text-gray-500">
                            <span>Business</span>
                            <select
                                value={businessFilter}
                                onChange={(event) => setBusinessFilter(event.target.value)}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-300"
                            >
                                <option value="all">All businesses</option>
                                {businessOptions.map((businessName) => (
                                    <option key={businessName} value={businessName}>
                                        {businessName}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-100 rounded-t-xl text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-3">Creator</div>
                        <div className="col-span-3">Business</div>
                        <div className="col-span-3">Campaign</div>
                        <div className="col-span-2">Submitted</div>
                        <div className="col-span-1 text-right">Review</div>
                    </div>

                    <div className="divide-y divide-gray-100 rounded-b-xl border border-t-0 border-gray-200 bg-white">
                        {pagedSubmissions.map((submission) => (
                            <button
                                key={submission._id}
                                type="button"
                                onClick={() => handleOpenReview(submission._id)}
                                className="grid w-full grid-cols-12 gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50"
                            >
                                <div className="col-span-3 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-gray-900">{submission.creator_name ?? 'Unknown Creator'}</p>
                                            <p className="truncate text-xs text-gray-400 font-mono">{submission.user_id.slice(0, 18)}...</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-3 min-w-0">
                                    <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                                        <Building2 className="w-3.5 h-3.5" />
                                        <span className="truncate">{submission.business_name ?? 'Unknown Business'}</span>
                                    </div>
                                </div>
                                <div className="col-span-3 min-w-0">
                                    <p className="truncate text-sm font-semibold text-gray-900">{submission.campaign_name ?? 'Unknown Campaign'}</p>
                                    <p className="text-xs text-gray-500">Attempt #{submission.attempt_number} · {submission.type}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-500">{formatSubmittedAt(submission.created_at)}</p>
                                </div>
                                <div className="col-span-1 flex items-center justify-end">
                                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700">
                                        Review
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {filteredSubmissions.length === 0 ? (
                        <div className="bg-white py-16 text-center text-sm font-medium text-gray-400">
                            No submissions match that creator or business
                        </div>
                    ) : null}

                    {totalPages > 1 && filteredSubmissions.length > 0 && (
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
                isOpen={isReviewOpen}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        handleCloseReview();
                    }
                }}
                size="5xl"
                scrollBehavior="inside"
                isDismissable={!isSelectedSubmissionActioning}
                hideCloseButton={isSelectedSubmissionActioning}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <span className="text-xl font-bold text-gray-900">Review submission</span>
                                <span className="text-sm font-normal text-gray-500">
                                    Check the video against the campaign requirements before approving.
                                </span>
                            </ModalHeader>
                            <ModalBody>
                                {!selectedDetail ? (
                                    <div className="flex min-h-[22rem] items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                    </div>
                                ) : (
                                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black">
                                            <div className="aspect-[9/16] min-h-[24rem]">
                                                {loadingVideo === selectedDetail._id ? (
                                                    <div className="flex h-full items-center justify-center">
                                                        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                                                    </div>
                                                ) : selectedVideoUrl ? (
                                                    <ReactPlayer
                                                        src={selectedVideoUrl}
                                                        controls
                                                        width="100%"
                                                        height="100%"
                                                        style={{ maxHeight: '100%' }}
                                                    />
                                                ) : (
                                                    <div className="flex h-full flex-col items-center justify-center gap-2 text-white/40">
                                                        <Play className="h-10 w-10" />
                                                        <span className="text-sm">No video available</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between gap-6">
                                                        <span className="text-sm text-gray-500">Creator</span>
                                                        <span className="text-right text-sm font-semibold text-gray-900">{selectedDetail.creator_name}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-6">
                                                        <span className="text-sm text-gray-500">Business</span>
                                                        <span className="text-right text-sm font-semibold text-gray-900">{selectedDetail.campaign_business_name}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-6">
                                                        <span className="text-sm text-gray-500">Campaign</span>
                                                        <span className="text-right text-sm font-semibold text-gray-900">{selectedDetail.campaign_name}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-6">
                                                        <span className="text-sm text-gray-500">Submitted</span>
                                                        <span className="text-right text-sm font-semibold text-gray-900">{formatSubmittedAt(selectedDetail.created_at)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-6">
                                                        <span className="text-sm text-gray-500">Attempt</span>
                                                        <span className="text-right text-sm font-semibold text-gray-900">#{selectedDetail.attempt_number}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-gray-200 bg-white p-5">
                                                <div className="mb-4">
                                                    <h3 className="text-sm font-semibold text-gray-900">Campaign requirements</h3>
                                                    <p className="text-sm text-gray-500">Review every requirement before approving this submission.</p>
                                                </div>
                                                <div className="space-y-3">
                                                    {selectedDetail.campaign_requirements.length > 0 ? (
                                                        selectedDetail.campaign_requirements.map((requirement, index) => (
                                                            <div key={`${selectedDetail._id}-${index}`} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                                                                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-gray-500">
                                                                    <Check className="h-3.5 w-3.5" />
                                                                </div>
                                                                <p className="text-sm leading-6 text-gray-700">{requirement}</p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-gray-400">No requirements were configured for this campaign.</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-gray-200 bg-white p-5">
                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-gray-900">Feedback</h3>
                                                        <p className="text-sm text-gray-500">Optional for approvals. Required if you request changes.</p>
                                                    </div>
                                                    {!showFeedback && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowFeedback(true)}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                                                        >
                                                            <MessageSquare className="h-3.5 w-3.5" />
                                                            Add feedback
                                                        </button>
                                                    )}
                                                </div>
                                                {showFeedback ? (
                                                    <textarea
                                                        value={feedback}
                                                        onChange={(event) => setFeedback(event.target.value)}
                                                        placeholder="Add review notes for the creator"
                                                        className="h-28 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-300 placeholder:text-gray-400"
                                                    />
                                                ) : (
                                                    <p className="text-sm text-gray-400">No feedback added yet.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </ModalBody>
                            <ModalFooter>
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleCloseReview();
                                        onClose();
                                    }}
                                    disabled={isSelectedSubmissionActioning}
                                    className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                >
                                    Close
                                </button>
                                {selectedDetail ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => handleRequestChanges(selectedDetail._id)}
                                            disabled={isSelectedSubmissionActioning}
                                            className="flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-50"
                                        >
                                            {isSelectedSubmissionActioning ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <X className="h-4 w-4" />
                                            )}
                                            Request changes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenApproveModal(selectedDetail._id)}
                                            disabled={isSelectedSubmissionActioning}
                                            className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
                                        >
                                            <Check className="h-4 w-4" />
                                            Approve
                                        </button>
                                    </>
                                ) : null}
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            <Modal
                isOpen={isApprovalOpen}
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
                                <span className="text-xl font-bold text-gray-900">Approve submission?</span>
                                <span className="text-sm font-normal text-gray-500">
                                    This will move the submission to ready-to-post for the creator.
                                </span>
                            </ModalHeader>
                            <ModalBody>
                                {approvalTarget ? (
                                    <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                        <div className="flex items-center justify-between gap-6">
                                            <span className="text-sm text-gray-500">Creator</span>
                                            <span className="text-right text-sm font-semibold text-gray-900">{approvalTarget.creator_name ?? 'Unknown Creator'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-6">
                                            <span className="text-sm text-gray-500">Business</span>
                                            <span className="text-right text-sm font-semibold text-gray-900">{approvalTarget.business_name ?? 'Unknown Business'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-6">
                                            <span className="text-sm text-gray-500">Campaign</span>
                                            <span className="text-right text-sm font-semibold text-gray-900">{approvalTarget.campaign_name ?? 'Unknown Campaign'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-6">
                                            <span className="text-sm text-gray-500">Attempt</span>
                                            <span className="text-right text-sm font-semibold text-gray-900">#{approvalTarget.attempt_number}</span>
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
                                    Confirm approval
                                </button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
