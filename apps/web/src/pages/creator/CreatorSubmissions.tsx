import { useEffect, useState } from 'react';
import { usePaginatedQuery } from 'convex/react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FileCheck2 } from 'lucide-react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { submissionStatuses, submissionStatus, SubmissionStatusBadge } from '../../lib/submission-status';
import { CampaignImage } from '../../components/CampaignImage';
import Button from '../../components/ui/Button';
import CreatorSubmissionDetails, { type CreatorApplication } from './CreatorSubmissionDetails';

export function SubmissionCard({ application, onClick }: { application: CreatorApplication; onClick: () => void }) {
    return <button onClick={onClick} aria-label={`View submission for ${application.campaignName ?? 'unavailable campaign'}`} className="group min-w-0 rounded-2xl border border-gray-100 bg-white p-4 text-left transition hover:border-gray-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500">
        <CampaignImage name={application.campaignName ?? 'Campaign'} url={application.campaignCoverPhotoUrl ?? application.campaignLogoUrl} r2Key={application.campaignCoverPhotoUrl ? undefined : application.campaignLogoR2Key} />
        <div className="mt-4"><SubmissionStatusBadge status={application.status} /></div>
        <h2 className="mt-3 truncate font-semibold text-gray-900">{application.campaignName ?? 'Campaign unavailable'}</h2>
        <p className="mt-1 truncate text-sm text-gray-500">{application.businessName ?? 'Brand campaign'}</p>
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4"><span className="text-xs text-gray-400">{new Date(application.created_at).toLocaleDateString('en-MY', { dateStyle: 'medium' })}</span><span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600">View details <ArrowUpRight size={15} /></span></div>
    </button>;
}

export default function CreatorSubmissions() {
    const { results, status, loadMore } = usePaginatedQuery(api.applications.getMyApplications, {}, { initialNumItems: 20 });
    const [filter, setFilter] = useState('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    // Existing paginated API has no status argument. Search remaining pages when filtering,
    // so an empty first page cannot hide matching submissions further back in history.
    useEffect(() => { if (filter !== 'all' && status === 'CanLoadMore') loadMore(100); }, [filter, status, loadMore]);
    const visible = results.filter(application => filter === 'all' || application.status === filter);
    const filteringMore = filter !== 'all' && status !== 'Exhausted' && status !== 'LoadingFirstPage';
    const options = [...new Set([...Object.keys(submissionStatuses).filter(key => key !== 'pending_review'), ...results.map(application => application.status)])];
    const selected = results.find(application => application._id === selectedId) ?? null;
    return <section>
        <div className="flex flex-wrap items-start justify-between gap-5"><div><h1 className="text-2xl font-bold">Submissions</h1><p className="mt-2 text-sm text-gray-500">Track your campaign submissions and their review status.</p></div><div><label htmlFor="submission-status" className="mb-2 block text-xs font-medium text-gray-500">Filter by status</label><select id="submission-status" value={filter} onChange={event => setFilter(event.target.value)} className="min-w-48 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"><option value="all">All statuses</option>{options.map(key => <option key={key} value={key}>{submissionStatus(key).label}</option>)}</select></div></div>
        {status === 'LoadingFirstPage' ? <p role="status" className="py-12 text-gray-500">Loading submissions…</p> : results.length === 0 ? <div className="mt-8 rounded-2xl border border-gray-100 p-12 text-center"><FileCheck2 className="mx-auto h-10 w-10 text-gray-300" /><h2 className="mt-4 font-semibold">No submissions yet</h2><p className="mt-2 text-sm text-gray-500">Browse campaigns to find your next opportunity.</p><Link to="/creator/campaigns" className="mt-5 inline-block rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white">Browse campaigns</Link></div> : <>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{visible.map(application => <SubmissionCard key={application._id} application={application} onClick={() => setSelectedId(application._id)} />)}</div>
            {filteringMore && <p role="status" className="mt-6 text-sm text-gray-500">Checking remaining submissions…</p>}
            {visible.length === 0 && !filteringMore && <p className="mt-8 rounded-2xl border border-gray-100 p-10 text-center text-gray-500">No submissions with this status.</p>}
            {filter === 'all' && status !== 'Exhausted' && <Button className="mt-6" disabled={status === 'LoadingMore'} onClick={() => loadMore(20)}>{status === 'LoadingMore' ? 'Loading…' : 'Load more'}</Button>}
        </>}
        <CreatorSubmissionDetails application={selected} onClose={() => setSelectedId(null)} />
    </section>;
}
