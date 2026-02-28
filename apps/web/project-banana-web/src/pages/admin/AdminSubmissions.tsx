import { useState, useEffect } from 'react';
import { useQuery, usePaginatedQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../../../../packages/backend/convex/_generated/api';
import type { Id } from '../../../../../../packages/backend/convex/_generated/dataModel';
import { Check, MessageSquare, Loader2, Play } from 'lucide-react';
import ReactPlayer from 'react-player';
import { Pagination } from '@heroui/react';

const ITEMS_PER_PAGE = 20;

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
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
    const [loadingVideo, setLoadingVideo] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [feedback, setFeedback] = useState('');
    const [showFeedback, setShowFeedback] = useState(false);

    const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
    const pagedSubmissions = allLoadedSubmissions.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    // Get selected submission details (with campaign info)
    const selectedDetail = useQuery(
        api.admin.getSubmissionWithCampaign,
        selectedId ? { submissionId: selectedId as Id<"submissions"> } : "skip"
    );

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        const neededItems = newPage * ITEMS_PER_PAGE;
        if (neededItems > allLoadedSubmissions.length && paginationStatus === "CanLoadMore") {
            loadMore(neededItems - allLoadedSubmissions.length);
        }
    };

    // Load video when a submission is selected
    useEffect(() => {
        if (!selectedDetail?.s3_key || videoUrls[selectedDetail._id]) return;
        const loadVideo = async () => {
            setLoadingVideo(selectedDetail._id);
            try {
                const url = await generateVideoUrl({ s3Key: selectedDetail.s3_key! });
                if (url) setVideoUrls((prev) => ({ ...prev, [selectedDetail._id]: url }));
            } catch (e) {
                console.error('Failed to load video:', e);
            }
            setLoadingVideo(null);
        };
        void loadVideo();
    }, [selectedDetail?._id, selectedDetail?.s3_key]);

    const handleApprove = async (id: Id<"submissions">) => {
        setActionLoading(id);
        try {
            await approveMutation({ submissionId: id, feedback: feedback || undefined });
            setSelectedId(null);
            setFeedback('');
            setShowFeedback(false);
        } catch (e) {
            console.error('Failed to approve:', e);
        }
        setActionLoading(null);
    };

    const handleRequestChanges = async (id: Id<"submissions">) => {
        if (!feedback.trim()) {
            setShowFeedback(true);
            return;
        }
        setActionLoading(id);
        try {
            await requestChangesMutation({ submissionId: id, feedback });
            setSelectedId(null);
            setFeedback('');
            setShowFeedback(false);
        } catch (e) {
            console.error('Failed to request changes:', e);
        }
        setActionLoading(null);
    };

    const isLoading = paginationStatus === "LoadingFirstPage";

    return (
        <div className="flex gap-6 h-[calc(100vh-4rem)]">
            {/* List panel */}
            <div className="w-96 flex flex-col">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Submissions</h1>
                <p className="text-sm text-gray-500 mb-6">Review pending content submissions · {totalCount} pending</p>

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
                        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                            {pagedSubmissions.map((sub) => (
                                <button
                                    key={sub._id}
                                    onClick={() => { setSelectedId(sub._id); setFeedback(''); setShowFeedback(false); }}
                                    className={`w-full text-left bg-white border rounded-xl p-4 transition-all ${selectedId === sub._id ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-semibold text-gray-900 text-sm truncate">Submission</p>
                                        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full font-medium uppercase shrink-0">
                                            {sub.type}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Attempt #{sub.attempt_number} · {new Date(sub.created_at).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5 font-mono">User: {sub.user_id.slice(0, 16)}...</p>
                                </button>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex justify-center mt-4 pb-2">
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

            {/* Detail panel */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
                {!selectedDetail ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                        {selectedId ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Select a submission to review'}
                    </div>
                ) : (
                    <>
                        {/* Video preview */}
                        <div className="flex-1 bg-black flex items-center justify-center">
                            {loadingVideo === selectedDetail._id ? (
                                <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
                            ) : videoUrls[selectedDetail._id] ? (
                                <ReactPlayer
                                    src={videoUrls[selectedDetail._id]}
                                    controls
                                    width="100%"
                                    height="100%"
                                    style={{ maxHeight: '100%' }}
                                />
                            ) : selectedDetail.video_url ? (
                                <ReactPlayer
                                    src={selectedDetail.video_url}
                                    controls
                                    width="100%"
                                    height="100%"
                                    style={{ maxHeight: '100%' }}
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-white/40">
                                    <Play className="w-10 h-10" />
                                    <span className="text-sm">No video available</span>
                                </div>
                            )}
                        </div>

                        {/* Actions bar */}
                        <div className="border-t border-gray-100 p-5">
                            {showFeedback && (
                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Type feedback for the creator..."
                                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm mb-3 resize-none h-24 focus:border-gray-900 focus:outline-none transition-colors placeholder:text-gray-400"
                                />
                            )}
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500">
                                    <span className="font-semibold text-gray-900">{selectedDetail.campaign_name}</span> · Attempt #{selectedDetail.attempt_number}
                                </div>
                                <div className="flex items-center gap-2">
                                    {!showFeedback && (
                                        <button
                                            onClick={() => setShowFeedback(true)}
                                            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-2 transition-colors"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Add Feedback
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleRequestChanges(selectedDetail._id as Id<"submissions">)}
                                        disabled={actionLoading === selectedDetail._id}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 rounded-lg px-3 py-2 transition-colors"
                                    >
                                        Request Changes
                                    </button>
                                    <button
                                        onClick={() => handleApprove(selectedDetail._id as Id<"submissions">)}
                                        disabled={actionLoading === selectedDetail._id}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gray-900 hover:bg-black rounded-lg px-3 py-2 transition-colors"
                                    >
                                        {actionLoading === selectedDetail._id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Check className="w-3.5 h-3.5" />
                                        )}
                                        Approve
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
