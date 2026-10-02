import { useMutation, useQuery } from 'convex/react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, DollarSign, Eye, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import type { Id } from '../../../../../packages/backend/convex/_generated/dataModel';
import { CampaignImage } from '../../components/CampaignImage';
import { CampaignCategoryTag } from '../../components/CampaignCategoryTag';
import Button from '../../components/ui/Button';

export default function CreatorCampaignDetails() {
    const { campaignId } = useParams();
    const navigate = useNavigate();
    const campaign = useQuery(api.campaigns.getCampaign, campaignId ? { campaignId: campaignId as Id<'campaigns'> } : 'skip');
    const existingApplication = useQuery(api.applications.getNonEarningApplicationByCampaignId, campaignId ? { campaignId: campaignId as Id<'campaigns'> } : 'skip');
    const createApplication = useMutation(api.applications.createApplication);
    const [isCreatingSubmission, setIsCreatingSubmission] = useState(false);
    const [submissionError, setSubmissionError] = useState('');
    const backButton = <div className="mb-6 flex items-center"><Button variant="ghost" onClick={() => navigate('/creator/campaigns')} icon={<ChevronLeft className="h-5 w-5" />} className="pl-0 hover:bg-transparent hover:text-gray-600">Back</Button></div>;
    if (campaign === undefined) return <div className="animate-fadeIn p-4 pb-24 text-gray-900 sm:p-8"><div className="mx-auto max-w-3xl">{backButton}<p role="status">Loading campaign…</p></div></div>;
    if (!campaign || campaign.status !== 'active') return <div className="animate-fadeIn p-4 pb-24 text-gray-900 sm:p-8"><div className="mx-auto max-w-3xl">{backButton}<h1 className="text-2xl font-semibold">This campaign is unavailable</h1></div></div>;
    const money = (amount: number) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
    const openSubmission = async () => {
        setSubmissionError('');
        if (existingApplication) {
            navigate(`/submissions/${existingApplication._id}`);
            return;
        }

        setIsCreatingSubmission(true);
        try {
            const applicationId = await createApplication({ campaignId: campaign._id });
            navigate(`/submissions/${applicationId}`);
        } catch (error) {
            setSubmissionError(error instanceof Error ? error.message : 'Unable to create a submission. Please try again.');
        } finally {
            setIsCreatingSubmission(false);
        }
    };
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
                    <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gray-50 p-5">
                        <div>
                            <h2 className="font-semibold">{existingApplication ? 'Your campaign submission' : 'Ready to join this campaign?'}</h2>
                            <p className="mt-1 text-sm text-gray-500">{existingApplication ? 'Continue your submission and review its history.' : 'Create an application to submit your video and track its review.'}</p>
                        </div>
                        <button type="button" onClick={openSubmission} disabled={isCreatingSubmission || existingApplication === undefined} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-wait disabled:opacity-60">
                            {isCreatingSubmission ? <><Loader2 className="h-4 w-4 animate-spin" />Creating…</> : <>{existingApplication ? 'Continue submission' : 'Create submission'}<ArrowRight className="h-4 w-4" /></>}
                        </button>
                        {submissionError && <p role="alert" className="w-full text-sm text-red-600">{submissionError}</p>}
                    </section>
                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                        <section className="rounded-3xl bg-[#F8F9FA] p-6"><h2 className="text-base font-semibold">Requirements</h2><ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-600">{campaign.requirements.map((requirement, index) => <li key={index}>{requirement}</li>)}</ul>{campaign.requires_both_platform_posts && <p className="mt-4 text-sm text-gray-600">Posts on both Instagram and TikTok are required.</p>}</section>
                        <section className="rounded-3xl bg-[#F8F9FA] p-6">
                            <h2 className="text-base font-semibold">Payout</h2>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-white p-4">
                                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Base pay per video</span>
                                    <span className="text-sm font-semibold text-gray-900">{money(campaign.base_pay ?? 0)}</span>
                                </div>
                                <div className="rounded-2xl bg-white p-4">
                                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Maximum payout</span>
                                    <span className="text-sm font-semibold text-gray-900">{money(campaign.maximum_payout)}</span>
                                </div>
                            </div>
                            {!!campaign.payout_thresholds.length && <>
                                <div className="my-3 border-t border-dashed border-gray-200" />
                                <ul className="space-y-3">
                                    {campaign.payout_thresholds.map((threshold, index) => (
                                        <li key={index} className="flex items-center gap-5 text-sm text-gray-600">
                                            <span className="flex min-w-0 flex-1 items-center gap-2"><Eye className="h-4 w-4 shrink-0 text-gray-400" />Every {threshold.views.toLocaleString()} views</span>
                                            <span className="flex shrink-0 items-center gap-2">
                                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-white"><DollarSign className="h-2.5 w-2.5" /></span>
                                                {money(threshold.payout)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </>}
                        </section>
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
