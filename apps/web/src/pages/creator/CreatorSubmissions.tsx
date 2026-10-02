import { usePaginatedQuery } from 'convex/react';
import { Link } from 'react-router-dom';
import { FileCheck2 } from 'lucide-react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';

export default function CreatorSubmissions() {
    const { results, status, loadMore } = usePaginatedQuery(api.applications.getMyApplications, {}, { initialNumItems: 20 });
    return <section>
        <h1 className="text-2xl font-bold">Submissions</h1>
        <p className="mt-2 text-sm text-gray-500">Track your campaign submissions and their review status.</p>
        {status === 'LoadingFirstPage' ? <p role="status" className="py-12 text-gray-500">Loading submissions…</p> : results.length === 0 ? <div className="mt-8 rounded-2xl border border-gray-100 p-12 text-center"><FileCheck2 className="mx-auto h-10 w-10 text-gray-300" /><h2 className="mt-4 font-semibold">No submissions yet</h2><p className="mt-2 text-sm text-gray-500">Browse campaigns to find your next opportunity.</p><Link to="/creator/campaigns" className="mt-5 inline-block rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white">Browse campaigns</Link></div> : <>
            <div className="mt-8 divide-y divide-gray-100 rounded-2xl border border-gray-100">
                {results.map((application) => <div key={application._id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="min-w-0"><h2 className="font-semibold">{application.campaignName ?? 'Campaign unavailable'}</h2><p className="mt-1 text-sm text-gray-500">{application.businessName ?? 'Brand campaign'}</p></div><StatusBadge status={application.status} /></div>)}
            </div>
            {status !== 'Exhausted' && <Button className="mt-6" disabled={status === 'LoadingMore'} onClick={() => loadMore(20)}>{status === 'LoadingMore' ? 'Loading…' : 'Load more'}</Button>}
        </>}
    </section>;
}
