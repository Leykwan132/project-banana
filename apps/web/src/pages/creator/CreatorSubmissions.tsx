import { useEffect, useState } from 'react';
import { usePaginatedQuery } from 'convex/react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, ChevronsUpDown, FileCheck2 } from 'lucide-react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Skeleton } from '@heroui/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { SubmissionStatusBadge, submissionStatus } from '../../lib/submission-status';
import { getNextSortDirection, sortSubmissions, type SortDirection, type SubmissionSortKey } from '../../lib/submission-sort';
import Button from '../../components/ui/Button';
import { CreatorPageHeader } from '../../components/CreatorPageHeader';

export default function CreatorSubmissions() {
    const navigate = useNavigate();
    const { results, status, loadMore } = usePaginatedQuery(api.applications.getMyApplications, {}, { initialNumItems: 20 });
    const [sortKey, setSortKey] = useState<SubmissionSortKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    useEffect(() => {
        if (sortKey && status === 'CanLoadMore') loadMore(100);
    }, [sortKey, status, loadMore]);

    const sortedResults = sortKey
        ? sortSubmissions(results, sortKey, sortDirection, value => submissionStatus(value).label)
        : results;
    const handleSort = (key: SubmissionSortKey) => {
        setSortDirection(getNextSortDirection(sortKey, sortDirection, key));
        setSortKey(key);
    };
    const sortControl = (key: SubmissionSortKey, label: string) => {
        const nextDirection = sortKey === key && sortDirection === 'desc' ? 'ascending' : 'descending';
        const Icon = sortKey !== key ? ChevronsUpDown : sortDirection === 'desc' ? ChevronDown : ChevronUp;
        return <button type="button" onClick={() => handleSort(key)} aria-label={`Sort by ${label}, ${nextDirection}`} aria-pressed={sortKey === key} className="inline-flex items-center gap-1.5 text-inherit hover:text-gray-900">
            {label}<Icon aria-hidden="true" className="h-3.5 w-3.5" />
        </button>;
    };

    return <section className="animate-fadeIn p-4 text-gray-900 sm:p-8">
        <CreatorPageHeader title="Submissions" description="Track your campaign submissions and their review status." />
        {status === 'LoadingFirstPage' ? <div role="status" aria-label="Loading submissions" className="mt-8 overflow-x-auto">
            <span className="sr-only">Loading submissions…</span>
            <div aria-hidden="true" className="min-w-[720px]">
                <div className="grid grid-cols-[2fr_1.2fr_1.2fr_.6fr_1fr] gap-4 bg-gray-50 px-3 py-3">
                    {['Campaign', 'Status', 'Submitted', 'Views', 'Earnings'].map(label => <Skeleton key={label} className="h-3 w-16 rounded-md" />)}
                </div>
                <div>
                    {Array.from({ length: 5 }, (_, index) => <div key={index} className="grid grid-cols-[2fr_1.2fr_1.2fr_.6fr_1fr] items-center gap-4 border-b border-gray-100 px-3 py-4">
                        <div className="space-y-2"><Skeleton className="h-4 w-40 max-w-full rounded-md" /><Skeleton className="h-3 w-24 rounded-md" /></div>
                        <Skeleton className="h-6 w-28 rounded-full" />
                        <Skeleton className="h-4 w-24 rounded-md" />
                        <Skeleton className="h-4 w-10 rounded-md" />
                        <Skeleton className="h-4 w-20 rounded-md" />
                    </div>)}
                </div>
            </div>
        </div> : results.length === 0 ? <div className="mt-8 rounded-2xl border border-gray-100 p-12 text-center"><FileCheck2 className="mx-auto h-10 w-10 text-gray-300" /><h2 className="mt-4 font-semibold">No submissions yet</h2><p className="mt-2 text-sm text-gray-500">Browse campaigns to find your next opportunity.</p><Link to="/creator/campaigns" className="mt-5 inline-block rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white">Browse campaigns</Link></div> : <>
            <Table aria-label="Your campaign submissions" className="mt-8" removeWrapper selectionMode="none" onRowAction={key => navigate(`/submissions/${encodeURIComponent(String(key))}`)} classNames={{ base: 'overflow-x-auto', table: 'min-w-[720px]', th: 'bg-gray-50 text-gray-500', td: 'py-4 border-b border-gray-100', tr: 'cursor-pointer hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-amber-500' }}>
                <TableHeader>
                    <TableColumn>CAMPAIGN</TableColumn>
                    <TableColumn aria-sort={sortKey === 'status' ? (sortDirection === 'desc' ? 'descending' : 'ascending') : 'none'}>{sortControl('status', 'STATUS')}</TableColumn>
                    <TableColumn aria-sort={sortKey === 'submitted' ? (sortDirection === 'desc' ? 'descending' : 'ascending') : 'none'}>{sortControl('submitted', 'SUBMITTED')}</TableColumn>
                    <TableColumn aria-sort={sortKey === 'views' ? (sortDirection === 'desc' ? 'descending' : 'ascending') : 'none'}>{sortControl('views', 'VIEWS')}</TableColumn>
                    <TableColumn aria-sort={sortKey === 'earnings' ? (sortDirection === 'desc' ? 'descending' : 'ascending') : 'none'}>{sortControl('earnings', 'EARNINGS')}</TableColumn>
                </TableHeader>
                <TableBody items={sortedResults} emptyContent="No submissions yet.">
                    {application => <TableRow key={application._id} textValue={application.campaignName ?? 'Campaign unavailable'}>
                        <TableCell><div className="font-semibold">{application.campaignName ?? 'Campaign unavailable'}</div><div className="mt-1 text-xs text-gray-500">{application.businessName ?? 'Brand campaign'}</div></TableCell>
                        <TableCell><SubmissionStatusBadge status={application.status} /></TableCell>
                        <TableCell>{new Date(application.created_at).toLocaleDateString('en-MY', { dateStyle: 'medium' })}</TableCell>
                        <TableCell>{(application.views ?? 0).toLocaleString()}</TableCell>
                        <TableCell>RM {(application.earnings ?? 0).toFixed(2)}</TableCell>
                    </TableRow>}
                </TableBody>
            </Table>
            {sortKey && status !== 'Exhausted' && status !== 'LoadingFirstPage' && <p role="status" className="mt-6 text-sm text-gray-500">Loading remaining submissions to sort…</p>}
            {!sortKey && status !== 'Exhausted' && <Button className="mt-6" disabled={status === 'LoadingMore'} onClick={() => loadMore(20)}>{status === 'LoadingMore' ? 'Loading…' : 'Load more'}</Button>}
        </>}
    </section>;
}
