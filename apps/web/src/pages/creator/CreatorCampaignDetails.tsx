import { useQuery } from 'convex/react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import type { Id } from '../../../../../packages/backend/convex/_generated/dataModel';
import { CampaignImage } from '../../components/CampaignImage';
import { CampaignCategoryTag } from '../../components/CampaignCategoryTag';
import Button from '../../components/ui/Button';

export default function CreatorCampaignDetails() {
    const { campaignId } = useParams();
    const navigate = useNavigate();
    const campaign = useQuery(api.campaigns.getCampaign, campaignId ? { campaignId: campaignId as Id<'campaigns'> } : 'skip');
    const backButton = <div className="mb-6 flex items-center"><Button variant="ghost" onClick={() => navigate('/creator/campaigns')} icon={<ChevronLeft className="h-5 w-5" />} className="pl-0 hover:bg-transparent hover:text-gray-600">Back</Button></div>;
    if (campaign === undefined) return <div className="animate-fadeIn p-4 pb-24 text-gray-900 sm:p-8"><div className="mx-auto max-w-3xl">{backButton}<p role="status">Loading campaign…</p></div></div>;
    if (!campaign || campaign.status !== 'active') return <div className="animate-fadeIn p-4 pb-24 text-gray-900 sm:p-8"><div className="mx-auto max-w-3xl">{backButton}<h1 className="text-2xl font-semibold">This campaign is unavailable</h1></div></div>;
    const money = (amount: number) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount);
    return (
        <div className="animate-fadeIn p-4 pb-24 text-gray-900 sm:p-8">
            <div className="mx-auto max-w-3xl">
                {backButton}
                <article>
                    <div className="relative">
                        <CampaignImage name={campaign.name} r2Key={campaign.cover_photo_r2_key} url={campaign.cover_photo_url} />
                        <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
                            {campaign.category.slice(0, 2).map(category => <CampaignCategoryTag key={category} label={category} />)}
                            {campaign.category.length > 2 && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-black">+{campaign.category.length - 2}</span>}
                        </div>
                    </div>
                    <p className="mt-6 text-gray-600">{campaign.business_name ?? 'Brand campaign'}</p>
                    <h1 className="mt-2 text-3xl font-semibold">{campaign.name}</h1>
                    <p className="mt-6 whitespace-pre-wrap leading-relaxed">{campaign.description}</p>
                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                        <section className="rounded-2xl bg-gray-50 p-6"><h2 className="text-xl font-semibold">Requirements</h2><ul className="mt-4 list-disc space-y-2 pl-5">{campaign.requirements.map((requirement, index) => <li key={index}>{requirement}</li>)}</ul>{campaign.requires_both_platform_posts && <p className="mt-4">Posts on both Instagram and TikTok are required.</p>}</section>
                        <section className="rounded-2xl bg-gray-50 p-6"><h2 className="text-xl font-semibold">Payout</h2><p className="mt-3">Base pay: {money(campaign.base_pay ?? 0)}</p><p>Maximum payout: {money(campaign.maximum_payout)}</p><ul className="mt-4 space-y-2">{campaign.payout_thresholds.map((threshold, index) => <li key={index}>{threshold.views.toLocaleString()} views — {money(threshold.payout)}</li>)}</ul></section>
                    </div>
                    {!!campaign.scripts?.length && <section className="mt-8"><h2 className="text-xl font-semibold">Content guidance</h2>{campaign.scripts.map((script, index) => <div className="mt-4" key={index}><h3 className="font-semibold">{script.type}</h3><p className="whitespace-pre-wrap">{script.description}</p></div>)}</section>}
                    {campaign.asset_links && <section className="mt-8"><h2 className="text-xl font-semibold">Campaign assets</h2><p className="mt-3 whitespace-pre-wrap break-words">{campaign.asset_links}</p></section>}
                    {!!campaign.hashtags.length && <p className="mt-6">Hashtags: {campaign.hashtags.join(' ')}</p>}
                    {!!campaign.mentions.length && <p className="mt-3">Mentions: {campaign.mentions.join(' ')}</p>}
                </article>
            </div>
        </div>
    );
}
