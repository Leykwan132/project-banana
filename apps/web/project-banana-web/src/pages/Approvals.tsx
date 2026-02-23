import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "@heroui/card";
import { ArrowRight, Rocket } from 'lucide-react';
import { usePaginatedQuery, useQuery, useAction } from "convex/react";
import { Skeleton } from "@heroui/skeleton";
import { api } from "../../../../../packages/backend/convex/_generated/api";

// Fallback images pool — pick one randomly per card so they feel distinct
const FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=2071&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2074&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1533750349088-cd871a92f312?q=80&w=2070&auto=format&fit=crop",
];

function getRandomFallback(seed: string) {
    // Deterministic-ish pick based on string length so it doesn't flicker on re-render
    return FALLBACK_IMAGES[seed.length % FALLBACK_IMAGES.length];
}

// Sub-component: resolves cover photo URL (s3 signed url → direct url → fallback)
function CampaignCoverImage({ campaign }: { campaign: { _id: string; name: string; cover_photo_s3_key?: string; cover_photo_url?: string } }) {
    const generateAccessUrl = useAction(api.campaigns.generateCampaignImageAccessUrl);

    const [src, setSrc] = useState<string | null>(
        !campaign.cover_photo_s3_key ? (campaign.cover_photo_url || getRandomFallback(campaign._id)) : null
    );

    useEffect(() => {
        if (!campaign.cover_photo_s3_key) return;

        let cancelled = false;
        generateAccessUrl({ s3Key: campaign.cover_photo_s3_key })
            .then((url) => {
                if (!cancelled) setSrc(url || campaign.cover_photo_url || getRandomFallback(campaign._id));
            })
            .catch(() => {
                if (!cancelled) setSrc(campaign.cover_photo_url || getRandomFallback(campaign._id));
            });

        return () => { cancelled = true; };
    }, [campaign.cover_photo_s3_key, campaign.cover_photo_url, campaign._id, generateAccessUrl]);

    return (
        <div className="mt-4 w-full aspect-video rounded-sm overflow-hidden bg-gray-100">
            {src ? (
                <img
                    alt={campaign.name}
                    className="w-full h-full object-cover"
                    src={src}
                />
            ) : (
                <Skeleton className="w-full h-full" />
            )}
        </div>
    );
}

// Empty State Component
const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
    <div className="flex flex-col items-center justify-center p-20 bg-[#F9FAFB] rounded-3xl text-center animate-fadeIn">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
            <Rocket className="w-10 h-10 text-gray-900" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No active campaigns</h3>
        <p className="text-gray-500 mb-8 max-w-sm">
            Create a campaign to start receiving and approving user submissions.
        </p>
        <button
            onClick={onCreate}
            className="bg-[#1C1C1C] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
            Create Campaign
        </button>
    </div>
);

export default function Approvals() {
    const navigate = useNavigate();
    const business = useQuery(api.businesses.getMyBusiness);

    const { results, status } = usePaginatedQuery(
        api.campaigns.getCampaignsByFilter,
        business ? { businessId: business._id, status: "active" } : "skip",
        { initialNumItems: 10 }
    );

    if (!business || status === "LoadingFirstPage") {
        return (
            <div className="p-8 font-sans">
                <div className="flex items-center gap-3 mb-6">
                    <h1 className="text-2xl font-bold">Approvals</h1>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Card key={i} className="flex flex-col w-full bg-[#F4F6F8] border-none rounded-md p-6 shadow-none h-[400px]">
                            <div className="flex flex-col items-start w-full space-y-4">
                                <Skeleton className="rounded-lg w-3/4 h-7" />
                                <div className="flex items-center gap-3 mt-3 w-full">
                                    <Skeleton className="rounded-full w-10 h-6" />
                                    <Skeleton className="rounded-lg w-32 h-4" />
                                </div>
                                <Skeleton className="rounded-lg w-24 h-4 mt-8" />
                            </div>
                            <Skeleton className="rounded-sm mt-6 w-full h-48" />
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 font-sans text-gray-900 animate-fadeIn">
            <div className="flex items-center gap-3 mb-6">
                <h1 className="text-2xl font-bold">Approvals</h1>
            </div>

            {results && results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    {results.map((campaign) => (
                        <Card
                            key={campaign._id}
                            isPressable
                            onPress={() => navigate(`/approvals/${campaign._id}`)}
                            className="flex flex-col w-full bg-[#F4F6F8] border-none rounded-md p-6 hover:bg-gray-200 transition-colors duration-200 group shadow-none"
                        >
                            {/* Text Content Section (Top) */}
                            <div className="flex flex-col items-start w-full">
                                <h4 className="text-gray-900 text-xl font-semibold leading-tight line-clamp-2 text-left">
                                    {campaign.name}
                                </h4>
                                <div className="flex items-center gap-3 mt-2">
                                    {campaign.pending_approvals && campaign.pending_approvals > 0 ? (
                                        <>
                                            <span className="px-3 bg-white py-1 rounded-full border border-gray-400 text-sm font-semibold text-gray-700">
                                                {campaign.pending_approvals}
                                            </span>
                                            <span className="text-gray-500 text-sm font-medium">pending submissions</span>
                                        </>
                                    ) : (
                                        <span className="text-gray-400 text-sm font-medium">No pending approvals</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 pt-4 text-orange-500 font-semibold text-sm mt-4 transition-all">
                                    <span>Review now</span>
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>

                            {/* Image Section (Bottom) */}
                            <CampaignCoverImage campaign={campaign} />
                        </Card>
                    ))}
                </div>
            ) : (
                <EmptyState onCreate={() => navigate('/campaign/new')} />
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
