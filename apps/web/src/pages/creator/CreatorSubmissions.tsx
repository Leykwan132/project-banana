import { useEffect, useState } from 'react';
import { usePaginatedQuery } from 'convex/react';
import { Link, useNavigate } from 'react-router-dom';
import { FileCheck2 } from 'lucide-react';
import { Table, Skeleton, type SortDescriptor } from '@heroui/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { SubmissionStatusBadge, submissionStatus } from '../../lib/submission-status';
import { getNextSortDirection, sortSubmissions, type SortDirection, type SubmissionSortKey } from '../../lib/submission-sort';
import Button from '../../components/ui/Button';
import { CreatorPageHeader } from '../../components/CreatorPageHeader';

export default function CreatorSubmissions() {
    const navigate = useNavigate();
    const { results, status, loadMore } = usePaginatedQuery(api.applications.getMyApplications, {}, { initialNumItems: 20 });
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor | null>(null);
    const sortKey = sortDescriptor?.column as SubmissionSortKey | undefined;
    const sortDirection: SortDirection = sortDescriptor?.direction === 'ascending' ? 'asc' : 'desc';
    useEffect(() => {
        if (sortKey && status === 'CanLoadMore') loadMore(100);
    }, [sortKey, status, loadMore]);

    const sortedResults = sortKey
        ? sortSubmissions(results, sortKey, sortDirection, value => submissionStatus(value).label)
        : results;
    const handleSortChange = (nextDescriptor: SortDescriptor) => {
        const key = nextDescriptor.column as SubmissionSortKey;
        const direction = getNextSortDirection(sortKey ?? null, sortDirection, key);
        setSortDescriptor({
            column: key,
            direction: direction === 'desc' ? 'descending' : 'ascending',
        });
    };

    return <section className="animate-fadeIn p-4 text-gray-900 sm:p-8">
        <CreatorPageHeader title="Submissions" description="Track your campaign submissions and their review status." />
        {status === 'LoadingFirstPage' ? <div role="status" aria-label="Loading submissions" className="mt-8 overflow-x-auto rounded-[22px] border border-gray-200 bg-gray-100 p-1">
            <span className="sr-only">Loading submissions…</span>
            <div aria-hidden="true" className="min-w-[720px] overflow-hidden rounded-2xl bg-white">
                <div className="grid grid-cols-[2fr_1.2fr_1.2fr_.6fr_1fr] gap-4 rounded-t-xl bg-gray-100 px-3 py-3">
                    {['Campaign', 'Status', 'Submitted', 'Views', 'Earnings'].map(label => <Skeleton key={label} className="h-3 w-16 rounded-md bg-gray-200" />)}
                </div>
                <div>
                    {Array.from({ length: 5 }, (_, index) => <div key={index} className="grid grid-cols-[2fr_1.2fr_1.2fr_.6fr_1fr] items-center gap-4 border-b border-gray-100 bg-white px-3 py-4">
                        <div className="space-y-2"><Skeleton className="h-4 w-40 max-w-full rounded-md bg-gray-200" /><Skeleton className="h-3 w-24 rounded-md bg-gray-200" /></div>
                        <Skeleton className="h-6 w-28 rounded-full bg-gray-200" />
                        <Skeleton className="h-4 w-24 rounded-md bg-gray-200" />
                        <Skeleton className="h-4 w-10 rounded-md bg-gray-200" />
                        <Skeleton className="h-4 w-20 rounded-md bg-gray-200" />
                    </div>)}
                </div>
            </div>
        </div> : results.length === 0 ? <div className="mt-8 rounded-2xl border border-gray-100 p-12 text-center"><FileCheck2 className="mx-auto h-10 w-10 text-gray-300" /><h2 className="mt-4 font-semibold">No submissions yet</h2><p className="mt-2 text-sm text-gray-500">Browse campaigns to find your next opportunity.</p><Link to="/creator/campaigns" className="mt-5 inline-block rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white">Browse campaigns</Link></div> : <>
            <Table variant="primary" className="mt-8 overflow-hidden !rounded-[22px] !border !border-gray-200 !bg-gray-100 !p-1">
                <Table.ScrollContainer>
                    <Table.Content
                        aria-label="Your campaign submissions"
                        className="min-w-[720px] overflow-hidden rounded-2xl"
                        onRowAction={key => navigate(`/submissions/${encodeURIComponent(String(key))}`)}
                        sortDescriptor={sortDescriptor ?? undefined}
                        onSortChange={handleSortChange}
                    >
                        <Table.Header>
                            <Table.Column className="!border-0 !bg-gray-100 !text-gray-500 [&::after]:!bg-gray-300">CAMPAIGN</Table.Column>
                            <Table.Column id="status" allowsSorting className="!border-0 !bg-gray-100 !text-gray-500 [&::after]:!bg-gray-300">
                                {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>STATUS</Table.SortableColumnHeader>}
                            </Table.Column>
                            <Table.Column id="submitted" allowsSorting className="!border-0 !bg-gray-100 !text-gray-500 [&::after]:!bg-gray-300">
                                {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>SUBMITTED</Table.SortableColumnHeader>}
                            </Table.Column>
                            <Table.Column id="views" allowsSorting className="!border-0 !bg-gray-100 !text-gray-500 [&::after]:!bg-gray-300">
                                {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>VIEWS</Table.SortableColumnHeader>}
                            </Table.Column>
                            <Table.Column id="earnings" allowsSorting className="!border-0 !bg-gray-100 !text-gray-500">
                                {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>EARNINGS</Table.SortableColumnHeader>}
                            </Table.Column>
                        </Table.Header>
                        <Table.Body items={sortedResults} renderEmptyState={() => <div className="p-8 text-center text-gray-500">No submissions yet.</div>}>
                            {application => <Table.Row id={application._id} textValue={application.campaignName ?? 'Campaign unavailable'} className="group cursor-pointer hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-amber-500">
                                <Table.Cell className="!border-b !border-gray-100 !bg-white py-4 !text-gray-900 group-hover:!bg-gray-50"><div className="font-semibold">{application.campaignName ?? 'Campaign unavailable'}</div><div className="mt-1 text-xs text-gray-500">{application.businessName ?? 'Brand campaign'}</div></Table.Cell>
                                <Table.Cell className="!border-b !border-gray-100 !bg-white py-4 !text-gray-900 group-hover:!bg-gray-50"><SubmissionStatusBadge status={application.status} /></Table.Cell>
                                <Table.Cell className="!border-b !border-gray-100 !bg-white py-4 !text-gray-900 group-hover:!bg-gray-50">{new Date(application.created_at).toLocaleDateString('en-MY', { dateStyle: 'medium' })}</Table.Cell>
                                <Table.Cell className="!border-b !border-gray-100 !bg-white py-4 !text-gray-900 group-hover:!bg-gray-50">{(application.views ?? 0).toLocaleString()}</Table.Cell>
                                <Table.Cell className="!border-b !border-gray-100 !bg-white py-4 !text-gray-900 group-hover:!bg-gray-50">RM {(application.earnings ?? 0).toFixed(2)}</Table.Cell>
                            </Table.Row>}
                        </Table.Body>
                    </Table.Content>
                </Table.ScrollContainer>
            </Table>
            {sortKey && status !== 'Exhausted' && <p role="status" className="mt-6 text-sm text-gray-500">Loading remaining submissions to sort…</p>}
            {!sortKey && status !== 'Exhausted' && <Button className="mt-6" disabled={status === 'LoadingMore'} onClick={() => loadMore(20)}>{status === 'LoadingMore' ? 'Loading…' : 'Load more'}</Button>}
        </>}
    </section>;
}
