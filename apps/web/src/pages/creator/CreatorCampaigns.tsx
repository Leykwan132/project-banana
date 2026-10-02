import { useEffect, useState } from 'react';
import { usePaginatedQuery } from 'convex/react';
import { Link } from 'react-router-dom';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { CampaignImage } from '../../components/CampaignImage';

const money = (amount: number) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount);
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
    return <section>
        <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
            <div><h1 className="text-3xl font-semibold tracking-tight">Browse campaigns</h1><p className="mt-2 text-gray-600">Explore active campaigns and read the briefs.</p></div>
            <div><p id="campaign-sort-label" className="mb-2 text-xs font-medium text-gray-500">Sort campaigns</p>
                <Dropdown disableAnimation><DropdownTrigger><Button disableRipple disableAnimation aria-labelledby="campaign-sort-label campaign-sort-value" variant="bordered" className="min-w-56 justify-between border-gray-200" endContent={<ChevronDown size={16} />}><span id="campaign-sort-value">{sortLabel}</span></Button></DropdownTrigger>
                    <DropdownMenu aria-label="Sort campaigns" selectionMode="single" disallowEmptySelection selectedKeys={new Set([sort])} onSelectionChange={keys => { const key = Array.from(keys)[0]; if (key) setSort(String(key)); }} items={sorts}>{item => <DropdownItem key={item.key}>{item.label}</DropdownItem>}</DropdownMenu>
                </Dropdown>
            </div>
        </div>
        {status === 'LoadingFirstPage' && <p role="status">Loading campaigns…</p>}
        {status !== 'LoadingFirstPage' && results.length === 0 && <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center"><h2 className="text-xl font-semibold">No active campaigns yet</h2><p className="mt-2 text-gray-600">New campaigns will appear here when they’re available.</p></div>}
        <div className="space-y-4">
            {campaigns.map(campaign => <Link key={campaign.campaignId} to={`/creator/campaigns/${campaign.campaignId}`} className="group flex flex-wrap items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 transition hover:border-gray-200 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500 sm:flex-nowrap sm:gap-5 sm:p-5">
                <div className="w-20 shrink-0 sm:w-28"><CampaignImage aspect="square" r2Key={campaign.cover_photo_url || campaign.cover_photo_r2_key ? campaign.cover_photo_r2_key : campaign.logo_r2_key} url={campaign.cover_photo_url || campaign.cover_photo_r2_key ? campaign.cover_photo_url : campaign.logo_url} name={campaign.name} /></div>
                <div className="min-w-0 flex-1"><p className="text-xs text-gray-500">{campaign.business_name ?? 'Brand campaign'}</p><h2 className="mt-1 font-semibold text-gray-900 sm:text-lg">{campaign.name}</h2><p className="mt-2 text-sm text-gray-500">{campaign.category.join(' · ')}</p><div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm"><p><span className="text-gray-500">Base pay </span><strong className="font-semibold">{money(campaign.base_pay)}</strong></p><p><span className="text-gray-500">Maximum </span><strong className="font-semibold">{money(campaign.maximum_payout)}</strong></p></div></div>
                <div className="flex w-full justify-end sm:w-auto sm:shrink-0"><span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white group-hover:bg-gray-700">Read brief <ArrowUpRight size={15} /></span></div>
            </Link>)}
        </div>
        {sortingMore && <p className="mt-6 text-sm text-gray-500" role="status">Loading remaining campaigns to finish sorting…</p>}
        {sort === 'newest' && (status === 'CanLoadMore' || status === 'LoadingMore') && <button onClick={() => loadMore(12)} disabled={status === 'LoadingMore'} className="mx-auto mt-8 block rounded-full border border-gray-300 bg-white px-6 py-3 disabled:opacity-50">{status === 'LoadingMore' ? 'Loading…' : 'Load more campaigns'}</button>}
    </section>;
}
