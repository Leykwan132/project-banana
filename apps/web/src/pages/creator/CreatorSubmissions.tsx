import { useEffect, useState } from 'react';
import { usePaginatedQuery } from 'convex/react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, FileCheck2 } from 'lucide-react';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button as HeroButton, Skeleton } from '@heroui/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { submissionStatuses, submissionStatus, SubmissionStatusBadge } from '../../lib/submission-status';
import Button from '../../components/ui/Button';
import { CreatorPageHeader } from '../../components/CreatorPageHeader';

export default function CreatorSubmissions() {
    const navigate = useNavigate();
    const { results, status, loadMore } = usePaginatedQuery(api.applications.getMyApplications, {}, { initialNumItems: 20 });
    const [filter, setFilter] = useState('all');
    // Search remaining pages when filtering; an empty first page must not hide older matches.
    useEffect(() => { if (filter !== 'all' && status === 'CanLoadMore') loadMore(100); }, [filter, status, loadMore]);
    const visible = results.filter(application => filter === 'all' || application.status === filter);
    const filteringMore = filter !== 'all' && status !== 'Exhausted' && status !== 'LoadingFirstPage';
    const options = [{ key: 'all', label: 'All statuses' }, ...[...new Set([...Object.keys(submissionStatuses).filter(key => key !== 'pending_review'), ...results.map(application => application.status)])].map(key => ({ key, label: submissionStatus(key).label }))];
    return <section className="animate-fadeIn p-4 text-gray-900 sm:p-8">
        <CreatorPageHeader title="Submissions" description="Track your campaign submissions and their review status.">
            <div><p id="submission-filter-label" className="mb-2 text-xs font-medium text-gray-500">Filter by status</p>
                <Dropdown disableAnimation><DropdownTrigger><HeroButton disableRipple disableAnimation aria-labelledby="submission-filter-label submission-filter-value" variant="bordered" className="w-56 min-w-56 max-w-56 shrink-0 justify-between border-gray-200" endContent={<ChevronDown size={16} />}><span id="submission-filter-value" className="min-w-0 flex-1 truncate text-left">{filter === 'all' ? 'All statuses' : submissionStatus(filter).label}</span></HeroButton></DropdownTrigger>
                    <DropdownMenu aria-label="Filter submissions by status" selectionMode="single" disallowEmptySelection selectedKeys={new Set([filter])} onSelectionChange={keys => { const key = Array.from(keys)[0]; if (key) setFilter(String(key)); }} items={options}>{item => <DropdownItem key={item.key}>{item.label}</DropdownItem>}</DropdownMenu>
                </Dropdown>
            </div>
        </CreatorPageHeader>
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
                <TableHeader><TableColumn>CAMPAIGN</TableColumn><TableColumn>STATUS</TableColumn><TableColumn>SUBMITTED</TableColumn><TableColumn>VIEWS</TableColumn><TableColumn>EARNINGS</TableColumn></TableHeader>
                <TableBody items={visible} emptyContent={filteringMore ? 'Checking remaining submissions…' : 'No submissions with this status.'}>
                    {application => <TableRow key={application._id} textValue={application.campaignName ?? 'Campaign unavailable'}>
                        <TableCell><div className="font-semibold">{application.campaignName ?? 'Campaign unavailable'}</div><div className="mt-1 text-xs text-gray-500">{application.businessName ?? 'Brand campaign'}</div></TableCell>
                        <TableCell><SubmissionStatusBadge status={application.status} /></TableCell>
                        <TableCell>{new Date(application.created_at).toLocaleDateString('en-MY', { dateStyle: 'medium' })}</TableCell>
                        <TableCell>{(application.views ?? 0).toLocaleString()}</TableCell>
                        <TableCell>RM {(application.earnings ?? 0).toFixed(2)}</TableCell>
                    </TableRow>}
                </TableBody>
            </Table>
            {filteringMore && visible.length > 0 && <p role="status" className="mt-6 text-sm text-gray-500">Checking remaining submissions…</p>}
            {filter === 'all' && status !== 'Exhausted' && <Button className="mt-6" disabled={status === 'LoadingMore'} onClick={() => loadMore(20)}>{status === 'LoadingMore' ? 'Loading…' : 'Load more'}</Button>}
        </>}
    </section>;
}
