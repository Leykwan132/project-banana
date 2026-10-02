import { usePaginatedQuery } from 'convex/react';
import { Link } from 'react-router-dom';
import { Progress, Skeleton } from '@heroui/react';
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
function CampaignCardSkeletons({ count }: { count: number }) {
    return <div aria-hidden="true" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }, (_, index) => <div key={index} className="flex h-full min-w-0 flex-col rounded-2xl bg-gray-50 p-4">
            <div className="relative">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <div className="absolute left-3 top-3 flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                </div>
            </div>
            <Skeleton className="mt-4 h-3 w-24 rounded-md" />
            <Skeleton className="mt-2 h-5 w-4/5 rounded-md" />
            <div className="min-h-4 flex-1" />
            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                <div><Skeleton className="h-3 w-14 rounded-md" /><Skeleton className="mt-2 h-4 w-20 rounded-md" /></div>
                <div><Skeleton className="h-3 w-20 rounded-md" /><Skeleton className="mt-2 h-4 w-24 rounded-md" /></div>
            </div>
        </div>)}
    </div>;
}

export default function CreatorCampaigns() {
    const { results, status, loadMore } = usePaginatedQuery(api.campaigns.getActiveCampaigns, {}, { initialNumItems: 12 });
    const campaigns = results;
    const loadingMore = status === 'LoadingMore';
    return <section className="animate-fadeIn p-4 text-gray-900 sm:p-8">
        <CreatorPageHeader title="Browse campaigns" description="Explore active campaigns and read the briefs." />
        {status === 'LoadingFirstPage' && <div role="status" aria-label="Loading campaigns">
            <span className="sr-only">Loading campaigns…</span>
            <CampaignCardSkeletons count={6} />
        </div>}
        {status !== 'LoadingFirstPage' && results.length === 0 && <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center"><h2 className="text-xl font-semibold">No active campaigns yet</h2><p className="mt-2 text-gray-600">New campaigns will appear here when they’re available.</p></div>}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {campaigns.map(campaign => <Link key={campaign.campaignId} to={`/creator/campaigns/${campaign.campaignId}`} className="group flex h-full min-w-0 flex-col rounded-2xl bg-gray-50 p-4 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500">
                <div className="relative">
                    <CampaignImage aspect="square" r2Key={campaign.cover_photo_url || campaign.cover_photo_r2_key ? campaign.cover_photo_r2_key : campaign.logo_r2_key} url={campaign.cover_photo_url || campaign.cover_photo_r2_key ? campaign.cover_photo_url : campaign.logo_url} name={campaign.name} />
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
                <div className="min-h-4 flex-1" aria-hidden="true" />
                <div className="border-t border-gray-200 pt-4">
                    <Progress
                        aria-label={`Campaign budget: ${money(campaign.budget_claimed)} claimed of ${money(campaign.total_budget)}`}
                        label={<span className="text-xs font-medium text-gray-500">{money(campaign.budget_claimed)} claimed</span>}
                        value={Math.max(0, Math.min(campaign.budget_claimed, campaign.total_budget))}
                        maxValue={campaign.total_budget > 0 ? campaign.total_budget : 1}
                        valueLabel={`Total budget ${money(campaign.total_budget)}`}
                        showValueLabel
                        size="sm"
                        color="primary"
                        classNames={{ label: 'text-xs', value: 'text-xs font-medium text-gray-500', track: 'h-2' }}
                    />
                </div>
            </Link>)}
        </div>
        {loadingMore && <div role="status" aria-label="Loading more campaigns" className="mt-6"><span className="sr-only">Loading more campaigns…</span><CampaignCardSkeletons count={3} /></div>}
        {status === 'CanLoadMore' && <button onClick={() => loadMore(12)} className="mx-auto mt-8 block rounded-full border border-gray-300 bg-white px-6 py-3">Load more campaigns</button>}
    </section>;
}
