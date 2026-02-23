import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2, ArrowRight } from 'lucide-react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { Skeleton } from "@heroui/skeleton";
import ReactPlayer from 'react-player';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import type { Id } from '../../../../../packages/backend/convex/_generated/dataModel';
import Button from '../components/ui/Button';

export default function ReviewSubmission() {
    const navigate = useNavigate();
    const { id: campaignId, submissionId } = useParams();
    const [feedback, setFeedback] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loadingUrl, setLoadingUrl] = useState(false);

    const submission = useQuery(
        api.submissions.getSubmission,
        submissionId ? { submissionId: submissionId as Id<"submissions"> } : "skip"
    );

    const generateVideoAccessUrl = useAction(api.submissions.generateVideoAccessUrl);

    // Load video URL from S3 or fallback to video_url
    useEffect(() => {
        let isMounted = true;

        const loadVideoUrl = async () => {
            if (!submission) return;
            if (submission.s3_key) {
                setLoadingUrl(true);
                try {
                    const signedUrl = await generateVideoAccessUrl({ submissionId: submissionId as Id<"submissions"> });
                    if (isMounted) setVideoUrl(signedUrl);
                } catch (error) {
                    console.error("Failed to generate video access URL:", error);
                    if (isMounted) setVideoUrl(submission.video_url ?? null);
                } finally {
                    if (isMounted) setLoadingUrl(false);
                }
                return;
            }
            setVideoUrl(submission.video_url ?? null);
        };

        void loadVideoUrl();
        console.log(videoUrl)
        return () => {
            isMounted = false;
        };
    }, [submission?._id, submission?.s3_key, submission?.video_url, submissionId]);

    const [successAction, setSuccessAction] = useState<'approved' | 'changes_requested' | null>(null);

    const approveSubmission = useMutation(api.submissions.approveSubmission);
    const requestChanges = useMutation(api.submissions.requestChanges);

    const handleApprove = async () => {
        if (!submissionId) return;
        setIsSubmitting(true);
        try {
            await approveSubmission({
                submissionId: submissionId as Id<"submissions">,
                feedback: feedback || undefined, // Optional
            });
            setSuccessAction('approved');
        } catch (error) {
            console.error("Failed to approve submission:", error);
            alert("Failed to approve submission. Please try again.");
            setIsSubmitting(false); // Only reset if error, keep true if success to prevent double click while modal opens
        }
    };

    const handleRequestChanges = async () => {
        if (!submissionId) return;
        if (!feedback.trim()) {
            alert("Please provide feedback for requested changes.");
            return;
        }
        setIsSubmitting(true);
        try {
            await requestChanges({
                submissionId: submissionId as Id<"submissions">,
                feedback: feedback, // Required
            });
            setSuccessAction('changes_requested');
        } catch (error) {
            console.error("Failed to request changes:", error);
            alert("Failed to request changes. Please try again.");
            setIsSubmitting(false);
        }
    };

    const isLoading = !submission;

    return (
        <div className="min-h-screen bg-white animate-scaleIn flex flex-col md:flex-row relative">
            {/* Left Side - Video */}
            <div className="w-full md:w-1/2 p-12 flex flex-col h-screen relative">
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(`/approvals/${campaignId}`)}
                        icon={<ChevronLeft className="w-5 h-5" />}
                        className="pl-0 hover:bg-transparent hover:text-gray-600"
                    >
                        Back
                    </Button>
                </div>
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">Review submission</h2>
                    <p className="text-gray-500">Please review the submission and leave any feedback to the creator</p>
                </div>

                <div className="flex-1 flex items-center justify-center">
                    {isLoading || loadingUrl ? (
                        <Skeleton className="w-full max-w-[420px] aspect-9/16 rounded-3xl" />
                    ) : videoUrl ? (
                        <div className="w-full max-w-[420px] aspect-9/16 rounded-3xl overflow-hidden bg-black">
                            <ReactPlayer
                                src={videoUrl}
                                controls
                                width="100%"
                                height="100%"
                                style={{ borderRadius: '1.5rem' }}
                            />
                        </div>
                    ) : (
                        <div className="w-full max-w-[420px] aspect-9/16 bg-gray-100 rounded-3xl flex items-center justify-center">
                            <span className="text-gray-400 font-medium">No video available</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side - Feedback Form */}
            <div className="w-full md:w-1/2 p-12 flex flex-col h-screen bg-gray-50 relative items-center justify-center">
                <div className="w-full max-w-lg flex flex-col h-full max-h-[600px] justify-center">
                    <div className="space-y-4 mb-8 flex-1 flex flex-col">
                        <div className="flex flex-col flex-1">
                            <label className="text-lg font-bold text-gray-900 mb-4 block">Feedback</label>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="w-full flex-1 bg-white rounded-2xl p-4 outline-none resize-none placeholder:text-gray-400 text-gray-700 border border-gray-200 focus:border-gray-900 transition-colors"
                                placeholder="Type your feedback here..."
                                disabled={isSubmitting || !!successAction}
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <Button
                            onClick={handleRequestChanges}
                            disabled={isSubmitting || isLoading || !!successAction}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-4 px-8 rounded-xl transition-colors text-md shadow-none"
                        >
                            Request changes
                        </Button>
                        <Button
                            onClick={handleApprove}
                            disabled={isSubmitting || isLoading || !!successAction}
                            className="flex-1 bg-black hover:bg-gray-900 text-white font-medium py-4 px-8 rounded-xl transition-colors text-md shadow-none"
                        >
                            Approve
                        </Button>
                    </div>
                </div>
            </div>

            {/* Full Screen Loading Overlay */}
            {isSubmitting && !successAction && createPortal(
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
                    <p className="text-white font-medium text-lg">Processing...</p>
                </div>,
                document.body
            )}

            {/* Success Modal */}
            {successAction && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-xl w-full max-w-[600px] p-10 shadow-2xl relative overflow-hidden flex flex-col animate-scaleIn">

                        {/* Top Left Icon */}
                        <div className="w-14 h-14 rounded-full border border-gray-100 flex items-center justify-center mb-8 shadow-sm">
                            <img src="/banana-icon.png" alt="Banana" className="w-10 h-10 object-contain" />
                        </div>

                        {/* Title & Description */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-medium text-gray-900 mb-3 tracking-tight">
                                {successAction === 'approved' ? 'Submission Approved' : 'Changes Requested'}
                            </h2>
                            <p className="text-gray-500 text-lg leading-relaxed">
                                {successAction === 'approved'
                                    ? "Great content! The creator will be notified to post it to their account."
                                    : "Your feedback has been sent. The creator will be notified to make the necessary changes."}
                            </p>
                        </div>

                        {/* Middle Image */}
                        <div className="w-full aspect-2/1 bg-gray-100 rounded-3xl mb-10 overflow-hidden relative border border-gray-100 shadow-sm">
                            <img
                                src="/onboarding-bg.png"
                                alt="Status"
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Bottom Right Button */}
                        <div className="flex justify-end">
                            <Button
                                onClick={() => navigate(`/approvals/${campaignId}`)}
                                className="bg-black hover:bg-gray-900 text-white px-8 py-4 rounded-xl shadow-xl shadow-black/10 text-md flex items-center gap-3"
                            >
                                Confirm
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}



            <style>{`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-scaleIn {
                    animation: scaleIn 0.2s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}

