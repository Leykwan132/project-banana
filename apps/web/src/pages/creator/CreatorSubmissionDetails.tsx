import { useEffect, useRef, useState } from 'react';
import { useAction, useMutation, useQuery, usePaginatedQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import type { Doc } from '../../../../../packages/backend/convex/_generated/dataModel';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, Loader2, Upload, Video } from 'lucide-react';
import { usePostHog } from '@posthog/react';
import { SubmissionStatusBadge } from '../../lib/submission-status';
import { getCreatorSubmissionAction } from '../../lib/creator-submission-flow';
import Button from '../../components/ui/Button';
import { CreatorPageHeader } from '../../components/CreatorPageHeader';

export type CreatorApplication = FunctionReturnType<typeof api.applications.getMyApplications>['page'][number];
function safeUrl(value?: string) {
    if (!value) return undefined;
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
const date = (value: number) => new Date(value).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' });

function SubmissionAttempt({ submission }: { submission: Doc<'submissions'> }) {
    const feedback = useQuery(api.submissions.getLatestSubmissionFeedback, { submissionId: submission._id });
    const getVideo = useAction(api.submissions.generateVideoAccessUrl);
    const [media, setMedia] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        if (!submission.r2_key) return;
        let active = true;
        getVideo({ submissionId: submission._id }).then(url => { if (active) { setMedia(url); setError(!url); } }).catch(() => { if (active) setError(true); });
        return () => { active = false; };
    }, [getVideo, submission._id, submission.r2_key, retry]);
    const url = safeUrl(submission.r2_key ? (media ?? undefined) : submission.video_url);
    return <article className="rounded-2xl border border-gray-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Attempt {submission.attempt_number}</h3><SubmissionStatusBadge status={submission.status} /></div>
        <p className="mt-2 text-xs text-gray-500">Submitted {date(submission.created_at)}</p>
        {url && (submission.type === 'video' ? <video controls preload="metadata" src={url} className="mt-4 max-h-96 w-full rounded-xl bg-gray-950" onError={() => setError(true)} /> : <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm underline">View uploaded content</a>)}
        {!url && submission.r2_key && !error && <p className="mt-4 text-sm text-gray-500" role="status">Loading uploaded content…</p>}
        {error && <div className="mt-4 text-sm text-gray-500">Unable to load the uploaded content.{submission.r2_key && <button className="ml-2 underline" onClick={() => { setError(false); setRetry(value => value + 1); }}>Retry</button>}</div>}
        {feedback === undefined ? <p className="mt-4 text-sm text-gray-500" role="status">Loading feedback…</p> : feedback && <div className="mt-4 rounded-xl bg-gray-50 p-4"><p className="text-sm font-semibold">Feedback from {feedback.authorName}</p><p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{feedback.text}</p></div>}
    </article>;
}

function isPlatformUrl(value: string, domain: 'instagram.com' | 'tiktok.com') {
    try {
        const url = new URL(value);
        return ['https:', 'http:'].includes(url.protocol) && (url.hostname === domain || url.hostname.endsWith(`.${domain}`));
    } catch {
        return false;
    }
}

function SubmissionActions({ application }: { application: CreatorApplication }) {
    const campaign = useQuery(api.campaigns.getCampaign, { campaignId: application.campaign_id });
    const generateVideoUploadUrl = useAction(api.submissions.generateVideoUploadUrl);
    const createSubmission = useMutation(api.submissions.createSubmission);
    const updateApplicationStatus = useMutation(api.applications.updateApplicationStatus);
    const posthog = usePostHog();
    const navigate = useNavigate();
    const fileInput = useRef<HTMLInputElement>(null);
    const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
    const [instagramLink, setInstagramLink] = useState(application.ig_post_url ?? '');
    const [tiktokLink, setTikTokLink] = useState(application.tiktok_post_url ?? '');
    const [isTikTokFeatureEnabled, setIsTikTokFeatureEnabled] = useState(() => posthog.isFeatureEnabled('enable-tiktok-feature') ?? false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const syncFeatureFlag = () => setIsTikTokFeatureEnabled(posthog.isFeatureEnabled('enable-tiktok-feature') ?? false);
        syncFeatureFlag();
        return posthog.onFeatureFlags(syncFeatureFlag);
    }, [posthog]);

    const action = campaign ? getCreatorSubmissionAction(application.status, campaign.status) : null;
    const isActionRequired = application.status === 'action_required';
    const missingDescription = application.missing_post_description as {
        instagram?: { reuploadRequired?: boolean };
        tiktok?: { reuploadRequired?: boolean };
    } | undefined;
    const instagramNeedsRelink = missingDescription?.instagram?.reuploadRequired === true;
    const tiktokNeedsRelink = missingDescription?.tiktok?.reuploadRequired === true;
    const isTargetedRelink = isActionRequired && (instagramNeedsRelink || tiktokNeedsRelink);
    const isPayAsYouGo = (campaign?.business_plan_type ?? 'payasyougo').toLowerCase() === 'payasyougo';
    const requiresBothPlatforms = campaign?.requires_both_platform_posts ?? false;
    const allowTikTok = !isPayAsYouGo && (
        isTikTokFeatureEnabled || requiresBothPlatforms || tiktokNeedsRelink || Boolean(application.tiktok_post_url)
    );
    const requiresInstagram = isTargetedRelink
        ? instagramNeedsRelink
        : (requiresBothPlatforms || isPayAsYouGo || !allowTikTok);
    const requiresTikTok = isTargetedRelink ? tiktokNeedsRelink : (requiresBothPlatforms && allowTikTok);
    const showInstagram = !isTargetedRelink || instagramNeedsRelink;
    const showTikTok = allowTikTok && (!isActionRequired || tiktokNeedsRelink);

    const handleVideoUpload = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        if (!selectedVideo) {
            setError('Choose a video to upload.');
            return;
        }
        if (selectedVideo.type && !selectedVideo.type.startsWith('video/')) {
            setError('Choose a video file to continue.');
            return;
        }

        setIsSubmitting(true);
        try {
            const contentType = selectedVideo.type || 'video/mp4';
            const { uploadUrl, r2Key } = await generateVideoUploadUrl({ contentType });
            const response = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': contentType },
                body: selectedVideo,
            });
            if (!response.ok) throw new Error('The video upload did not complete. Please try again.');

            await createSubmission({ applicationId: application._id, r2_key: r2Key });
            setSelectedVideo(null);
            if (fileInput.current) fileInput.current.value = '';
            setSuccess('Your video has been submitted for review.');
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : 'Unable to submit your video. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLinkSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        const instagram = instagramLink.trim();
        const tiktok = tiktokLink.trim();

        if (requiresInstagram && !instagram) return setError('Please provide your Instagram post URL.');
        if (requiresTikTok && !tiktok) return setError('Please provide your TikTok post URL.');
        if (!requiresInstagram && !requiresTikTok && !instagram && !tiktok) return setError('Add at least one post URL.');
        if (instagram && !isPlatformUrl(instagram, 'instagram.com')) return setError('Enter a valid Instagram URL.');
        if (tiktok && !allowTikTok) return setError('TikTok URL submission is not available on this campaign.');
        if (tiktok && !isPlatformUrl(tiktok, 'tiktok.com')) return setError('Enter a valid TikTok URL.');

        setIsSubmitting(true);
        try {
            await updateApplicationStatus({
                applicationId: application._id,
                status: 'verifying',
                ig_post_url: instagram || undefined,
                tiktok_post_url: tiktok || undefined,
            });
            setSuccess('Your post links have been sent for verification.');
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to submit your links. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return <section className="rounded-2xl bg-gray-50 p-5" aria-label="Create a submission">
        {action === null ? <p role="status" className="text-sm text-gray-500">Loading submission options…</p> : <>
            {action === 'upload-video' && <form onSubmit={handleVideoUpload} className="space-y-4">
                <div><h2 className="font-semibold">Submit a video</h2><p className="mt-1 text-sm text-gray-500">Upload your video for campaign review.</p></div>
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center transition-colors hover:bg-gray-50">
                    <Video className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium">{selectedVideo?.name ?? 'Choose a video file'}</span>
                    <span className="text-xs text-gray-500">MP4, MOV, or WebM</span>
                    <input ref={fileInput} type="file" accept="video/*" className="sr-only" onChange={event => setSelectedVideo(event.target.files?.[0] ?? null)} />
                </label>
                <button type="submit" disabled={isSubmitting || !selectedVideo} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50">
                    {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</> : <><Upload className="h-4 w-4" />Submit video</>}
                </button>
            </form>}

            {action === 'submit-links' && <form onSubmit={handleLinkSubmit} className="space-y-4">
                <div><h2 className="font-semibold">Submit your post links</h2><p className="mt-1 text-sm text-gray-500">Add the campaign post URL{requiresBothPlatforms ? 's' : ''} for verification.</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                    {showInstagram && <label className="space-y-1.5 text-sm font-medium text-gray-700">Instagram URL{requiresInstagram ? ' *' : ''}<input type="url" value={instagramLink} onChange={event => setInstagramLink(event.target.value)} placeholder="https://www.instagram.com/..." className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal text-gray-900 outline-none focus:border-gray-400" /></label>}
                    {showTikTok && <label className="space-y-1.5 text-sm font-medium text-gray-700">TikTok URL{requiresTikTok ? ' *' : ''}<input type="url" value={tiktokLink} onChange={event => setTikTokLink(event.target.value)} placeholder="https://www.tiktok.com/..." className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal text-gray-900 outline-none focus:border-gray-400" /></label>}
                </div>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-wait disabled:opacity-50">
                    {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</> : <>Submit links<ArrowRight className="h-4 w-4" /></>}
                </button>
            </form>}

            {action === 'waiting' && <div><h2 className="font-semibold">Submission under review</h2><p className="mt-1 text-sm text-gray-500">You can submit again after the review is complete.</p></div>}
            {action === 'create-another' && <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold">Ready for another campaign submission?</h2><p className="mt-1 text-sm text-gray-500">Start a new application for this campaign.</p></div><button type="button" onClick={() => campaign && navigate(`/creator/campaigns/${campaign._id}`)} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800">Create another<ArrowRight className="h-4 w-4" /></button></div>}
            {action === 'closed' && <div><h2 className="font-semibold">Submissions are closed</h2><p className="mt-1 text-sm text-gray-500">This campaign is no longer accepting this type of submission.</p></div>}
        </>}
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p role="status" className="mt-3 text-sm text-emerald-700">{success}</p>}
    </section>;
}

function Details({ application }: { application: CreatorApplication }) {
    // The application comes from the authenticated getMyApplications result, never a URL-supplied ID.
    const submissions = useQuery(api.submissions.getSubmissionsByApplication, { applicationId: application._id });
    return <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
            <SubmissionStatusBadge status={application.status} />
            <p className="text-sm text-gray-500">Created {date(application.created_at)}</p>
        </div>
        <SubmissionActions application={application} />
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl bg-gray-50 p-5">
            {([['Views', application.views], ['Likes', application.likes], ['Comments', application.comments], ['Shares', application.shares]] as const).map(([label, value]) => <div key={label}><p className="text-xs font-medium text-gray-500">{label}</p><p className="mt-1 font-semibold">{(value ?? 0).toLocaleString()}</p></div>)}
            <div className="col-span-2 border-t border-gray-200 pt-4"><p className="text-xs font-medium text-gray-500">Earnings</p><p className="mt-1 font-semibold">RM {(application.earnings ?? 0).toFixed(2)}</p></div>
        </div>
        {(safeUrl(application.ig_post_url) || safeUrl(application.tiktok_post_url)) && <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">{safeUrl(application.ig_post_url) && <a href={safeUrl(application.ig_post_url)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Instagram post ↗</a>}{safeUrl(application.tiktok_post_url) && <a href={safeUrl(application.tiktok_post_url)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">TikTok post ↗</a>}</div>}
        <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Submission history</h2>
            {submissions === undefined ? <p role="status" className="text-sm text-gray-500">Loading submission history…</p> : submissions.length === 0 ? <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">No content has been submitted yet.</p> : submissions.map(submission => <SubmissionAttempt key={submission._id} submission={submission} />)}
        </section>
    </div>;
}

export default function CreatorSubmissionDetails() {
    const { applicationId } = useParams();
    const navigate = useNavigate();
    const { results, status, loadMore } = usePaginatedQuery(api.applications.getMyApplications, {}, { initialNumItems: 20 });
    const application = results.find(item => item._id === applicationId);
    // Resolve shared/reloaded URLs through the authenticated list. The legacy getApplication
    // query does not check ownership; never expose another creator's application through it.
    useEffect(() => { if (!application && status === 'CanLoadMore') loadMore(100); }, [application, status, loadMore]);
    return <section className="animate-fadeIn p-4 text-gray-900 sm:p-8">
        <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex items-center">
                <Button variant="ghost" onClick={() => navigate('/creator/submissions')} icon={<ChevronLeft className="h-5 w-5" />} className="pl-0 hover:bg-transparent hover:text-gray-600">Back</Button>
            </div>
            {!application ? (status === 'Exhausted' ? <div><h1 className="text-2xl font-semibold tracking-tight">Submission unavailable</h1><p className="mt-2 text-gray-500">This submission could not be found in your account.</p></div> : <p role="status" className="py-8 text-gray-500">Loading submission…</p>) : <>
                <CreatorPageHeader title={application.campaignName ?? 'Campaign unavailable'} description={application.businessName ?? 'Brand campaign'} />
                <Details key={application._id} application={application} />
            </>}
        </div>
    </section>;
}
