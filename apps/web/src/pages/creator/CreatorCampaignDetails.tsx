import { useQuery } from 'convex/react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import type { Id } from '../../../../../packages/backend/convex/_generated/dataModel';
import { CampaignImage } from '../../components/CampaignImage';

export default function CreatorCampaignDetails() {
    const { campaignId } = useParams();
    const campaign = useQuery(api.campaigns.getCampaign, campaignId ? { campaignId: campaignId as Id<'campaigns'> } : 'skip');
    if (campaign === undefined) return <p role="status">Loading campaign…</p>;
    if (!campaign || campaign.status !== 'active') return <div><h1 className="text-2xl font-semibold">This campaign is unavailable</h1><Link to="/creator/campaigns" className="mt-4 inline-block underline">Back to campaigns</Link></div>;
    const money = (amount: number) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount);
    return (
        <article className="mx-auto max-w-3xl">
            <Link to="/creator/campaigns" className="text-sm underline">← Back to campaigns</Link>
            <div className="mt-6"><CampaignImage name={campaign.name} r2Key={campaign.cover_photo_r2_key} url={campaign.cover_photo_url} /></div>
            <p className="mt-6 text-gray-600">{campaign.business_name ?? 'Brand campaign'}</p>
            <h1 className="mt-2 text-3xl font-semibold">{campaign.name}</h1>
            <p className="mt-3 text-sm text-gray-600">{campaign.category.join(' · ')}</p>
            <p className="mt-6 whitespace-pre-wrap leading-relaxed">{campaign.description}</p>
            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6"><h2 className="text-xl font-semibold">Payout</h2><p className="mt-3">Base pay: {money(campaign.base_pay ?? 0)}</p><p>Maximum payout: {money(campaign.maximum_payout)}</p><ul className="mt-4 space-y-2">{campaign.payout_thresholds.map((threshold, index) => <li key={index}>{threshold.views.toLocaleString()} views — {money(threshold.payout)}</li>)}</ul></section>
            <section className="mt-8"><h2 className="text-xl font-semibold">Requirements</h2><ul className="mt-4 list-disc space-y-2 pl-5">{campaign.requirements.map((requirement, index) => <li key={index}>{requirement}</li>)}</ul>{campaign.requires_both_platform_posts && <p className="mt-4">Posts on both Instagram and TikTok are required.</p>}</section>
            {!!campaign.scripts?.length && <section className="mt-8"><h2 className="text-xl font-semibold">Content guidance</h2>{campaign.scripts.map((script, index) => <div className="mt-4" key={index}><h3 className="font-semibold">{script.type}</h3><p className="whitespace-pre-wrap">{script.description}</p></div>)}</section>}
            {campaign.asset_links && <section className="mt-8"><h2 className="text-xl font-semibold">Campaign assets</h2><p className="mt-3 whitespace-pre-wrap break-words">{campaign.asset_links}</p></section>}
            {!!campaign.hashtags.length && <p className="mt-6">Hashtags: {campaign.hashtags.join(' ')}</p>}
            {!!campaign.mentions.length && <p className="mt-3">Mentions: {campaign.mentions.join(' ')}</p>}
        </article>
    );
}
