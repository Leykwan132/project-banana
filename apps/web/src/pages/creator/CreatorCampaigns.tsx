import { useEffect, useState } from 'react';
import { usePaginatedQuery } from 'convex/react';
import { Link } from 'react-router-dom';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button, Skeleton } from '@heroui/react';
import { ChevronDown } from 'lucide-react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { CampaignImage } from '../../components/CampaignImage';
import { CampaignCategoryTag } from '../../components/CampaignCategoryTag';
import { CreatorPageHeader } from '../../components/CreatorPageHeader';

const money = (amount: number) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount);
const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'always' });
const campaignAge = (createdAt: number) => {
    const elapsed = Math.max(0, Date.now() - createdAt);
    const minutes = Math.floor(elapsed / 60_000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return relativeTime.format(-minutes, 'minute');
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return relativeTime.format(-hours, 'hour');
    const days = Math.floor(hours / 24);
    if (days < 30) return relativeTime.format(-days, 'day');
    const months = Math.floor(days / 30);
    if (months < 12) return relativeTime.format(-months, 'month');
    return relativeTime.format(-Math.floor(months / 12), 'year');
};
const sorts = [
    { key: 'newest', label: 'Newest first' },
    { key: 'base-high', label: 'Base pay: highest first' },
    { key: 'base-low', label: 'Base pay: lowest first' },
    { key: 'maximum-high', label: 'Maximum payout: highest first' },
    { key: 'maximum-low', label: 'Maximum payout: lowest first' },
];

export default function CreatorCampaigns() {
    const { results, status, loadMore } = usePaginatedQuery(api.campaigns.getActiveCampaigns, {}, { initialNumItems: 12 });
    const [sort, setSort] = useState('newest');
    // The existing query returns newest-first pages. Load the remainder before completing
    // payout sorting so a high-paying campaign on a later page is not left out.
    useEffect(() => { if (sort !== 'newest' && status === 'CanLoadMore') loadMore(100); }, [sort, status, loadMore]);
    const campaigns = [...results];
    if (sort !== 'newest') {
        const field = sort.startsWith('base') ? 'base_pay' : 'maximum_payout';
        campaigns.sort((a, b) => (a[field] - b[field]) * (sort.endsWith('high') ? -1 : 1));
    }
    const sortingMore = sort !== 'newest' && status !== 'Exhausted' && status !== 'LoadingFirstPage';
    const sortLabel = sorts.find(option => option.key === sort)?.label ?? sorts[0].label;
    return <section className="animate-fadeIn p-4 text-gray-900 sm:p-8">
        <CreatorPageHeader title="Browse campaigns" description="Explore active campaigns and read the briefs.">
            <div><p id="campaign-sort-label" className="mb-2 text-xs font-medium text-gray-500">Sort campaigns</p>
                <Dropdown disableAnimation><DropdownTrigger><Button disableRipple disableAnimation aria-labelledby="campaign-sort-label campaign-sort-value" variant="bordered" className="w-56 min-w-56 max-w-56 shrink-0 justify-between border-gray-200" endContent={<ChevronDown size={16} />}><span id="campaign-sort-value" className="min-w-0 flex-1 truncate text-left">{sortLabel}</span></Button></DropdownTrigger>
                    <DropdownMenu aria-label="Sort campaigns" selectionMode="single" disallowEmptySelection selectedKeys={new Set([sort])} onSelectionChange={keys => { const key = Array.from(keys)[0]; if (key) setSort(String(key)); }} items={sorts}>{item => <DropdownItem key={item.key}>{item.label}</DropdownItem>}</DropdownMenu>
                </Dropdown>
            </div>
        </CreatorPageHeader>
        {status === 'LoadingFirstPage' && <div role="status" aria-label="Loading campaigns" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            <span className="sr-only">Loading campaigns…</span>
            {Array.from({ length: 6 }, (_, index) => <div key={index} aria-hidden="true" className="flex h-full min-w-0 flex-col rounded-2xl bg-gray-50 p-4">
                <div className="relative">
                    <Skeleton className="aspect-video w-full rounded-xl" />
                    <div className="absolute left-3 top-3 flex gap-2">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                </div>
                <Skeleton className="mt-4 h-3 w-24 rounded-md" />
                <Skeleton className="mt-2 h-5 w-4/5 rounded-md" />
                <div className="mt-auto grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                    <div><Skeleton className="h-3 w-14 rounded-md" /><Skeleton className="mt-2 h-4 w-20 rounded-md" /></div>
                    <div><Skeleton className="h-3 w-20 rounded-md" /><Skeleton className="mt-2 h-4 w-24 rounded-md" /></div>
                </div>
            </div>)}
        </div>}
        {status !== 'LoadingFirstPage' && results.length === 0 && <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center"><h2 className="text-xl font-semibold">No active campaigns yet</h2><p className="mt-2 text-gray-600">New campaigns will appear here when they’re available.</p></div>}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {campaigns.map(campaign => <Link key={campaign.campaignId} to={`/creator/campaigns/${campaign.campaignId}`} className="group flex h-full min-w-0 flex-col rounded-2xl bg-gray-50 p-4 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500">
                <div className="relative">
                    <CampaignImage aspect="video" r2Key={campaign.cover_photo_url || campaign.cover_photo_r2_key ? campaign.cover_photo_r2_key : campaign.logo_r2_key} url={campaign.cover_photo_url || campaign.cover_photo_r2_key ? campaign.cover_photo_url : campaign.logo_url} name={campaign.name} />
                    <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
                        {campaign.category.slice(0, 2).map(category => <CampaignCategoryTag key={category} label={category} />)}
                        {campaign.category.length > 2 && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-black">+{campaign.category.length - 2}</span>}
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-xs font-medium text-gray-500">{campaign.business_name ?? 'Brand campaign'}</p>
                    <time dateTime={new Date(campaign.created_at).toISOString()} className="shrink-0 text-xs text-gray-400">{campaignAge(campaign.created_at)}</time>
                </div>
                <h2 className="mt-1 line-clamp-2 font-semibold text-gray-900 group-hover:text-gray-700">{campaign.name}</h2>
                <div className="mt-auto grid grid-cols-2 gap-3 border-t border-gray-200 pt-4">
                    <p className="min-w-0 text-xs text-gray-500">Base pay <strong className="mt-1 block truncate text-sm font-semibold text-gray-900">{money(campaign.base_pay)}</strong></p>
                    <p className="min-w-0 text-xs text-gray-500">Maximum payout <strong className="mt-1 block truncate text-sm font-semibold text-gray-900">{money(campaign.maximum_payout)}</strong></p>
                </div>
            </Link>)}
        </div>
        {sortingMore && <p className="mt-6 text-sm text-gray-500" role="status">Loading remaining campaigns to finish sorting…</p>}
        {sort === 'newest' && (status === 'CanLoadMore' || status === 'LoadingMore') && <button onClick={() => loadMore(12)} disabled={status === 'LoadingMore'} className="mx-auto mt-8 block rounded-full border border-gray-300 bg-white px-6 py-3 disabled:opacity-50">{status === 'LoadingMore' ? 'Loading…' : 'Load more campaigns'}</button>}
    </section>;
}
