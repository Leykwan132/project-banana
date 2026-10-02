import { usePaginatedQuery } from 'convex/react';
import { Link } from 'react-router-dom';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { CampaignImage } from '../../components/CampaignImage';

const money = (amount: number) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount);

export default function CreatorCampaigns() {
    const { results, status, loadMore } = usePaginatedQuery(api.campaigns.getActiveCampaigns, {}, { initialNumItems: 12 });
    return (
        <div>
            <h1 className="text-3xl font-semibold tracking-tight">Browse campaigns</h1>
            <p className="mb-8 mt-2 text-gray-600">Explore active campaigns and read the briefs.</p>
            {status === 'LoadingFirstPage' && <p role="status">Loading campaigns…</p>}
            {status !== 'LoadingFirstPage' && results.length === 0 && <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center"><h2 className="text-xl font-semibold">No active campaigns yet</h2><p className="mt-2 text-gray-600">New campaigns will appear here when they’re available.</p></div>}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {results.map(campaign => (
                    <Link key={campaign.campaignId} to={`/creator/campaigns/${campaign.campaignId}`} className="rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-black">
                        <CampaignImage r2Key={campaign.cover_photo_r2_key} url={campaign.cover_photo_url} name={campaign.name} />
                        <p className="mt-4 text-sm text-gray-600">{campaign.business_name ?? 'Brand campaign'}</p>
                        <h2 className="mt-1 text-xl font-semibold">{campaign.name}</h2>
                        <p className="mt-3 text-sm text-gray-600">{campaign.category.join(' · ')}</p>
                        <div className="mt-5 flex justify-between gap-4 border-t border-gray-100 pt-4 text-sm"><span>Base pay<br /><strong>{money(campaign.base_pay)}</strong></span><span>Maximum payout<br /><strong>{money(campaign.maximum_payout)}</strong></span></div>
                        <p className="mt-4 text-sm font-semibold underline">Read brief</p>
                    </Link>
                ))}
            </div>
            {status === 'CanLoadMore' || status === 'LoadingMore' ? <button onClick={() => loadMore(12)} disabled={status === 'LoadingMore'} className="mx-auto mt-8 block rounded-full border border-gray-300 bg-white px-6 py-3 disabled:opacity-50">{status === 'LoadingMore' ? 'Loading…' : 'Load more campaigns'}</button> : null}
        </div>
    );
}
