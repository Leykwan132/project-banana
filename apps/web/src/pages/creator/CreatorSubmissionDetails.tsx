import { useEffect, useState } from 'react';
import { useAction, useQuery, usePaginatedQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import type { Doc } from '../../../../../packages/backend/convex/_generated/dataModel';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { Link, useParams } from 'react-router-dom';
import { SubmissionStatusBadge } from '../../lib/submission-status';

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

function Details({ application }: { application: CreatorApplication }) {
    // The application comes from the authenticated getMyApplications result, never a URL-supplied ID.
    const submissions = useQuery(api.submissions.getSubmissionsByApplication, { applicationId: application._id });
    return <>
        <SubmissionStatusBadge status={application.status} />
        <p className="text-sm text-gray-500">Created {date(application.created_at)}</p>
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 p-5">
            {([['Views', application.views], ['Likes', application.likes], ['Comments', application.comments], ['Shares', application.shares]] as const).map(([label, value]) => <div key={label}><p className="text-xs text-gray-500">{label}</p><p className="mt-1 font-semibold">{(value ?? 0).toLocaleString()}</p></div>)}
            <div className="col-span-2 border-t border-gray-200 pt-3"><p className="text-xs text-gray-500">Earnings</p><p className="mt-1 font-semibold">RM {(application.earnings ?? 0).toFixed(2)}</p></div>
        </div>
        {(safeUrl(application.ig_post_url) || safeUrl(application.tiktok_post_url)) && <div className="flex gap-4 text-sm">{safeUrl(application.ig_post_url) && <a href={safeUrl(application.ig_post_url)} target="_blank" rel="noopener noreferrer" className="underline">Instagram post ↗</a>}{safeUrl(application.tiktok_post_url) && <a href={safeUrl(application.tiktok_post_url)} target="_blank" rel="noopener noreferrer" className="underline">TikTok post ↗</a>}</div>}
        <h2 className="mt-2 text-lg font-semibold">Submission history</h2>
        {submissions === undefined ? <p role="status" className="text-sm text-gray-500">Loading submission history…</p> : submissions.length === 0 ? <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">No content has been submitted yet.</p> : submissions.map(submission => <SubmissionAttempt key={submission._id} submission={submission} />)}
    </>;
}

export default function CreatorSubmissionDetails() {
    const { applicationId } = useParams();
    const { results, status, loadMore } = usePaginatedQuery(api.applications.getMyApplications, {}, { initialNumItems: 20 });
    const application = results.find(item => item._id === applicationId);
    // Resolve shared/reloaded URLs through the authenticated list. The legacy getApplication
    // query does not check ownership; never expose another creator's application through it.
    useEffect(() => { if (!application && status === 'CanLoadMore') loadMore(100); }, [application, status, loadMore]);
    return <section className="mx-auto max-w-4xl">
        <Link to="/creator/submissions" className="mb-6 inline-block text-sm text-gray-500 hover:text-gray-900">← Back to submissions</Link>
        {!application ? (status === 'Exhausted' ? <div><h1 className="text-2xl font-bold">Submission unavailable</h1><p className="mt-3 text-gray-500">This submission could not be found in your account.</p></div> : <p role="status" className="py-8 text-gray-500">Loading submission…</p>) : <>
            <h1 className="text-2xl font-bold">{application.campaignName ?? 'Campaign unavailable'}</h1>
            <p className="mt-2 text-gray-500">{application.businessName ?? 'Brand campaign'}</p>
            <div className="mt-6 flex flex-col gap-5"><Details key={application._id} application={application} /></div>
        </>}
    </section>;
}
