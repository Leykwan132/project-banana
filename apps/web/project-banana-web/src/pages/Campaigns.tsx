import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, usePaginatedQuery } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';

import { Layers, Check, Rocket, ArrowUp, ArrowDown } from 'lucide-react';

import { Chip } from "@heroui/chip";
import { Skeleton } from "@heroui/skeleton";
import { CheckIcon, ActiveIcon, PausedIcon } from '../components/Icons';

// Empty State Component
const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
    <div className="flex flex-col items-center justify-center p-20 bg-[#F9FAFB] rounded-3xl text-center animate-fadeIn">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
            <Rocket className="w-10 h-10 text-gray-900" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No campaigns yet</h3>
        <p className="text-gray-500 mb-8 max-w-sm">
            Create your first campaign to start receiving user-generated content for your brand.
        </p>
        <button
            onClick={onCreate}
            className="bg-[#1C1C1C] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
            Create Campaign
        </button>
    </div>
);

interface CampaignData {
    _id: string; // Using string to avoid Id import complexity, will cast if needed or just treat as accessible
    name: string;
    status: string;
    total_budget: number;
    budget_claimed: number;
    submissions: number;
    created_at: number;
    // Add other fields if strictly necessary for the UI
    [key: string]: any; // Allow loose typing to prevent other errors easily
}

const CampaignsSkeleton = () => {
    return (
        <div className="bg-white overflow-hidden">
            <div className="bg-[#F4F6F8] rounded-sm mt-2 grid grid-cols-10 gap-4 p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-5 pl-2">Campaigns</div>
                <div className="col-span-1 flex items-center justify-center">Date Created</div>
                <div className="col-span-1 flex items-center justify-center">Submissions</div>
                <div className="col-span-1 flex items-center justify-center">Budget</div>
                <div className="col-span-1 flex items-center justify-center">Claimed</div>
                <div className="col-span-1 flex items-center justify-center">Status</div>
            </div>
            <div className="divide-y divide-[#F4F6F8]">
                {Array(5).fill(0).map((_, index) => (
                    <div key={index} className="grid grid-cols-10 gap-4 p-6 items-center">
                        <div className="col-span-5 flex items-center gap-3">
                            <Skeleton className="rounded-lg w-10 h-10" />
                            <div className="space-y-2 w-3/4">
                                <Skeleton className="h-4 w-3/5 rounded-lg" />
                            </div>
                        </div>
                        <div className="col-span-1 flex justify-center"><Skeleton className="h-4 w-16 rounded-lg" /></div>
                        <div className="col-span-1 flex justify-center"><Skeleton className="h-4 w-8 rounded-lg" /></div>
                        <div className="col-span-1 flex justify-center"><Skeleton className="h-4 w-16 rounded-lg" /></div>
                        <div className="col-span-1 flex justify-center"><Skeleton className="h-4 w-16 rounded-lg" /></div>
                        <div className="col-span-1 flex justify-center"><Skeleton className="h-6 w-16 rounded-full" /></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function Campaigns() {
    const navigate = useNavigate();

    // Data Fetching
    const business = useQuery(api.businesses.getMyBusiness);

    // Fetch campaigns
    // If business is not loaded yet, we skip. 
    // If business is loaded but null (not onboarded), we'll handle that in UI logic or skip too.
    const { results, status } = usePaginatedQuery(
        api.campaigns.getCampaignsByBusiness,
        business?._id ? { businessId: business._id } : "skip",
        { initialNumItems: 50 }
    );

    // Filter campaigns
    const campaigns = (results || []) as CampaignData[];

    // Derived state for filtered lists
    const ongoingCampaigns = campaigns.filter((c) =>
        ['active', 'paused'].includes(c.status)
    ).map((c) => ({
        id: c._id,
        name: c.name,
        submissions: c.submissions || 0,
        budget: `Rm ${c.total_budget}`,
        claimed: `Rm ${c.budget_claimed}`,
        status: c.status,
        icon: Layers, // Default icon for now
        iconColor: 'text-gray-600',
        iconBg: 'bg-gray-100',
        createdDate: new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    }));

    const pastCampaigns = campaigns.filter((c) =>
        c.status === 'completed'
    ).map((c) => ({
        id: c._id,
        name: c.name,
        submissions: c.submissions || 0,
        budget: `Rm ${c.total_budget}`,
        claimed: `Rm ${c.budget_claimed}`,
        status: c.status,
        icon: Check, // Default icon for completed
        iconColor: 'text-green-600',
        iconBg: 'bg-green-100',
        createdDate: new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    }));

    // Sorting State
    const [ongoingSort, setOngoingSort] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [pastSort, setPastSort] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const sortDisplayData = (data: typeof ongoingCampaigns, sortConfig: { key: string, direction: 'asc' | 'desc' } | null) => {
        if (!sortConfig) return data;

        return [...data].sort((a: any, b: any) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Helper to clean currency strings
            const parseCurrency = (val: string) => {
                if (typeof val === 'string' && (val.toLowerCase().startsWith('rm') || val === 'Not set')) {
                    if (val === 'Not set') return -1; // Treat 'Not set' as lowest
                    return parseFloat(val.replace(/[^0-9.-]+/g, ''));
                }
                return val;
            };

            // Handle specific columns
            if (['budget', 'claimed'].includes(sortConfig.key)) {
                aValue = parseCurrency(aValue);
                bValue = parseCurrency(bValue);
            } else if (sortConfig.key === 'createdDate') {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    };

    const sortedOngoing = useMemo(() => sortDisplayData(ongoingCampaigns, ongoingSort), [ongoingCampaigns, ongoingSort]);
    const sortedPast = useMemo(() => sortDisplayData(pastCampaigns, pastSort), [pastCampaigns, pastSort]);

    const requestSort = (key: string, isPast: boolean = false) => {
        const currentSort = isPast ? pastSort : ongoingSort;
        let direction: 'asc' | 'desc' = 'asc';

        if (currentSort && currentSort.key === key && currentSort.direction === 'asc') {
            direction = 'desc';
        }

        if (isPast) {
            setPastSort({ key, direction });
        } else {
            setOngoingSort({ key, direction });
        }
    };

    const SortIcon = ({ sortConfig, columnKey }: { sortConfig: { key: string, direction: 'asc' | 'desc' } | null, columnKey: string }) => {
        if (!sortConfig || sortConfig.key !== columnKey) return null;
        return sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 ml-1 inline" /> : <ArrowDown className="w-4 h-4 ml-1 inline" />;
    };

    const isLoading = status === "LoadingFirstPage" || business === undefined;

    if (isLoading) {
        return (
            <div className="p-8 font-sans text-gray-900 animate-fadeIn">
                <h1 className="text-2xl font-bold mb-6">Campaigns</h1>

                {/* Ongoing Campaigns Skeleton */}
                <div className="mb-12">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold">Ongoing Campaigns</h2>
                        <button disabled className="bg-[#1C1C1C] text-white px-5 py-2.5 rounded-xl text-sm font-semibold opacity-50 cursor-not-allowed">
                            + Create Campaign
                        </button>
                    </div>
                    <CampaignsSkeleton />
                </div>
            </div>
        );
    }

    if (ongoingCampaigns.length === 0 && pastCampaigns.length === 0 && results !== undefined) {
        return (
            <div className="p-8 font-sans text-gray-900 animate-fadeIn">
                <h1 className="text-2xl font-bold mb-6">Campaigns</h1>
                <EmptyState onCreate={() => navigate('/campaign/new')} />
            </div>
        )
    }

    return (
        <div className="p-8 font-sans text-gray-900 animate-fadeIn">
            <h1 className="text-2xl font-bold mb-6">Campaigns</h1>

            {/* Ongoing Campaigns */}
            <div className="mb-12">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold">Ongoing Campaigns</h2>
                    <button
                        onClick={() => navigate('/campaign/new')}
                        className="bg-[#1C1C1C] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
                    >
                        + Create Campaign
                    </button>
                </div>

                {sortedOngoing.length > 0 ? (
                    <div className="bg-white overflow-hidden">
                        <div className="bg-[#F4F6F8] rounded-sm mt-2  grid grid-cols-10 gap-4 p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <div className="col-span-5 pl-2 cursor-pointer hover:text-gray-600" onClick={() => requestSort('name')}>
                                Campaigns <SortIcon sortConfig={ongoingSort} columnKey="name" />
                            </div>
                            <div className="col-span-1 flex items-center justify-center cursor-pointer hover:text-gray-600" onClick={() => requestSort('createdDate')}>
                                Date Created <SortIcon sortConfig={ongoingSort} columnKey="createdDate" />
                            </div>
                            <div className="col-span-1 flex items-center justify-center cursor-pointer hover:text-gray-600" onClick={() => requestSort('submissions')}>
                                Submissions <SortIcon sortConfig={ongoingSort} columnKey="submissions" />
                            </div>
                            <div className="col-span-1 flex items-center justify-center cursor-pointer hover:text-gray-600" onClick={() => requestSort('budget')}>
                                Budget <SortIcon sortConfig={ongoingSort} columnKey="budget" />
                            </div>
                            <div className="col-span-1 flex items-center justify-center cursor-pointer hover:text-gray-600" onClick={() => requestSort('claimed')}>
                                Claimed <SortIcon sortConfig={ongoingSort} columnKey="claimed" />
                            </div>
                            <div className="col-span-1 flex items-center justify-center cursor-pointer hover:text-gray-600" onClick={() => requestSort('status')}>
                                Status <SortIcon sortConfig={ongoingSort} columnKey="status" />
                            </div>
                        </div>

                        <div className="divide-y divide-[#F4F6F8]">
                            {sortedOngoing.map((campaign: any, index: number) => (
                                <div
                                    key={index}
                                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                                    className="grid grid-cols-10 gap-4 p-6 items-center hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    <div className="col-span-5 flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${campaign.iconBg} ${campaign.iconColor}`}>
                                            <campaign.icon className="w-5 h-5" />
                                        </div>
                                        <span className="font-semibold text-gray-900">{campaign.name}</span>
                                    </div>
                                    <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center">{campaign.createdDate}</div>
                                    <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center">{campaign.submissions}</div>
                                    <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center">{campaign.budget}</div>
                                    <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center">{campaign.claimed}</div>
                                    <div className="col-span-1 flex items-center justify-center">
                                        <Chip
                                            color={campaign.status === 'active' ? 'success' : campaign.status === 'paused' ? 'warning' : 'default'}
                                            startContent={
                                                campaign.status === 'active' ? <ActiveIcon size={20} /> :
                                                    campaign.status === 'paused' ? <PausedIcon size={20} /> :
                                                        <CheckIcon size={20} />
                                            }
                                            variant="flat"
                                        >
                                            {campaign.status}
                                        </Chip>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500 bg-[#F9FAFB] rounded-3xl">
                        No ongoing campaigns found.
                    </div>
                )}
            </div>

            {/* Completed Campaigns */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold">Completed Campaigns</h2>
                </div>

                {sortedPast.length > 0 ? (
                    <div className="bg-white overflow-hidden">
                        <div className="bg-[#F4F6F8] rounded-sm mt-2 grid grid-cols-10 gap-4 p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <div className="col-span-5 pl-2 cursor-pointer hover:text-gray-600" onClick={() => requestSort('name', true)}>
                                Campaigns <SortIcon sortConfig={pastSort} columnKey="name" />
                            </div>
                            <div className="col-span-1 flex items-center justify-center cursor-pointer hover:text-gray-600" onClick={() => requestSort('createdDate', true)}>
                                Date Created <SortIcon sortConfig={pastSort} columnKey="createdDate" />
                            </div>
                            <div className="col-span-1 flex items-center justify-center cursor-pointer hover:text-gray-600" onClick={() => requestSort('submissions', true)}>
                                Submissions <SortIcon sortConfig={pastSort} columnKey="submissions" />
                            </div>
                            <div className="col-span-1 flex items-center justify-center cursor-pointer hover:text-gray-600" onClick={() => requestSort('budget', true)}>
                                Budget <SortIcon sortConfig={pastSort} columnKey="budget" />
                            </div>
                            <div className="col-span-1 flex items-center justify-center cursor-pointer hover:text-gray-600" onClick={() => requestSort('claimed', true)}>
                                Claimed <SortIcon sortConfig={pastSort} columnKey="claimed" />
                            </div>
                            <div className="col-span-1 flex items-center justify-center cursor-pointer hover:text-gray-600" onClick={() => requestSort('status', true)}>
                                Status <SortIcon sortConfig={pastSort} columnKey="status" />
                            </div>
                        </div>

                        <div className="divide-y divide-[#F4F6F8]">
                            {sortedPast.map((campaign: any, index: number) => (
                                <div
                                    key={index}
                                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                                    className="grid grid-cols-10 gap-4 p-6 items-center hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    <div className="col-span-5 flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${campaign.iconBg} ${campaign.iconColor}`}>
                                            <campaign.icon className="w-5 h-5" />
                                        </div>
                                        <span className="font-semibold text-gray-900">{campaign.name}</span>
                                    </div>
                                    <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center">{campaign.createdDate}</div>
                                    <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center">{campaign.submissions}</div>
                                    <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center">{campaign.budget}</div>
                                    <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center">{campaign.claimed}</div>
                                    <div className="col-span-1 flex items-center justify-center">
                                        <Chip
                                            color={campaign.status === 'active' ? 'success' : campaign.status === 'paused' ? 'warning' : 'default'}
                                            startContent={
                                                campaign.status === 'active' ? <ActiveIcon size={20} /> :
                                                    campaign.status === 'paused' ? <PausedIcon size={20} /> :
                                                        <CheckIcon size={20} />
                                            }
                                            variant="flat"
                                        >
                                            {campaign.status}
                                        </Chip>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500 bg-[#F9FAFB] rounded-3xl">
                        No completed campaigns found.
                    </div>
                )}
            </div>

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
