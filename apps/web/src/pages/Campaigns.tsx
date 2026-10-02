import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, usePaginatedQuery } from 'convex/react';
import { api } from '../../../../packages/backend/convex/_generated/api';

import { Rocket, Plus, type LucideIcon } from 'lucide-react';

import { Skeleton, Table, type SortDescriptor } from "@heroui/react";
import { toast } from "../components/ui/Toast";
import StatusBadge from '../components/ui/StatusBadge';
import { isProductTourActive, PRODUCT_TOUR_STATE_EVENT } from '../lib/productTour';
import { CampaignStatus } from '../lib/constants';
import { getCampaignCategoryVisual } from '../lib/campaignCategoryVisuals';
import { businessTableCellClassName, businessTableClassName, businessTableColumnClassName, businessTableContentClassName } from '../components/ui/businessTableStyles';

// Empty State Component
const EmptyState = ({ onCreate, isCreateDisabled = false }: { onCreate: () => void; isCreateDisabled?: boolean }) => (
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
            disabled={isCreateDisabled}
            data-tour-id="campaigns-create-button"
            className="bg-[#1C1C1C] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1C1C1C]"
        >
            <Plus className="w-4 h-4" />
            Create Campaign
        </button>
    </div>
);

interface CampaignData {
    _id: string; // Using string to avoid Id import complexity, will cast if needed or just treat as accessible
    name: string;
    status: CampaignStatus;
    total_budget: number;
    budget_claimed: number;
    submissions: number;
    created_at: number;
    // Add other fields if strictly necessary for the UI
    [key: string]: any; // Allow loose typing to prevent other errors easily
}

type CampaignRow = {
    id: string;
    name: string;
    submissions: number;
    budget: string;
    claimed: string;
    rawBudget: number;
    rawClaimed: number;
    status: CampaignStatus;
    createdDate: string;
    icon: LucideIcon;
    iconBgClass: string;
    iconColorClass: string;
};

function CampaignTable({
    campaigns,
    sort,
    onSort,
    onOpenCampaign,
}: {
    campaigns: CampaignRow[];
    sort: { key: string; direction: 'asc' | 'desc' } | null;
    onSort: (key: string) => void;
    onOpenCampaign: (id: string) => void;
}) {
    const sortDescriptor: SortDescriptor | undefined = sort ? {
        column: sort.key,
        direction: sort.direction === 'asc' ? 'ascending' : 'descending',
    } : undefined;

    return <Table variant="primary" className={businessTableClassName}>
        <Table.ScrollContainer>
            <Table.Content
                aria-label="Campaigns"
                className={`${businessTableContentClassName} min-w-[900px]`}
                sortDescriptor={sortDescriptor}
                onSortChange={descriptor => onSort(String(descriptor.column))}
                onRowAction={key => onOpenCampaign(String(key))}
            >
                <Table.Header>
                    <Table.Column id="name" isRowHeader allowsSorting className={businessTableColumnClassName}>
                        {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>CAMPAIGN</Table.SortableColumnHeader>}
                    </Table.Column>
                    <Table.Column id="status" allowsSorting className={businessTableColumnClassName}>
                        {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>STATUS</Table.SortableColumnHeader>}
                    </Table.Column>
                    <Table.Column id="createdDate" allowsSorting className={businessTableColumnClassName}>
                        {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>DATE CREATED</Table.SortableColumnHeader>}
                    </Table.Column>
                    <Table.Column id="submissions" allowsSorting className={businessTableColumnClassName}>
                        {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>SUBMISSIONS</Table.SortableColumnHeader>}
                    </Table.Column>
                    <Table.Column id="budget" allowsSorting className={businessTableColumnClassName}>
                        {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>BUDGET CLAIMED</Table.SortableColumnHeader>}
                    </Table.Column>
                </Table.Header>
                <Table.Body items={campaigns}>
                    {campaign => <Table.Row id={campaign.id} textValue={campaign.name} className="group cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500">
                        <Table.Cell className={businessTableCellClassName}>
                            <div className="flex items-center gap-3">
                                <div className={`rounded-lg p-2 ${campaign.iconBgClass} ${campaign.iconColorClass}`}><campaign.icon className="h-5 w-5" /></div>
                                <span className="font-semibold text-gray-900">{campaign.name}</span>
                            </div>
                        </Table.Cell>
                        <Table.Cell className={businessTableCellClassName}><StatusBadge status={campaign.status} /></Table.Cell>
                        <Table.Cell className={`${businessTableCellClassName} font-medium`}>{campaign.createdDate}</Table.Cell>
                        <Table.Cell className={`${businessTableCellClassName} font-medium`}>{campaign.submissions}</Table.Cell>
                        <Table.Cell className={businessTableCellClassName}>
                            <div className="flex min-w-36 flex-col gap-1">
                                <span className={`font-semibold ${campaign.rawClaimed >= campaign.rawBudget && campaign.rawBudget > 0 ? 'text-green-600' : 'text-gray-900'}`}>{campaign.claimed}</span>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                                    <div className={`h-full rounded-full transition-all duration-300 ${campaign.rawClaimed >= campaign.rawBudget && campaign.rawBudget > 0 ? 'bg-green-500' : 'bg-gray-900'}`} style={{ width: `${Math.min(100, Math.max(0, (campaign.rawClaimed / (campaign.rawBudget || 1)) * 100))}%` }} />
                                </div>
                                <span className="text-right text-xs font-medium text-gray-400">{campaign.budget}</span>
                            </div>
                        </Table.Cell>
                    </Table.Row>}
                </Table.Body>
            </Table.Content>
        </Table.ScrollContainer>
    </Table>;
}

const TOUR_MOCK_CAMPAIGNS: CampaignData[] = [
    {
        _id: 'tour-campaign-001',
        name: 'Glow Serum Campaign Pitch',
        status: CampaignStatus.Active,
        total_budget: 8500,
        budget_claimed: 3200,
        submissions: 41,
        created_at: new Date('2026-02-26T08:30:00.000Z').getTime(),
    },
    {
        _id: 'tour-campaign-002',
        name: 'Weekend Bundle Awareness',
        status: CampaignStatus.Paused,
        total_budget: 6400,
        budget_claimed: 2580,
        submissions: 28,
        created_at: new Date('2026-02-19T10:15:00.000Z').getTime(),
    },
    {
        _id: 'tour-campaign-003',
        name: 'March Creator Sprint',
        status: CampaignStatus.Active,
        total_budget: 12000,
        budget_claimed: 7450,
        submissions: 67,
        created_at: new Date('2026-02-10T09:00:00.000Z').getTime(),
    },
    {
        _id: 'tour-campaign-004',
        name: 'Valentine Promo Recap',
        status: CampaignStatus.Completed,
        total_budget: 5300,
        budget_claimed: 5300,
        submissions: 36,
        created_at: new Date('2026-01-28T11:20:00.000Z').getTime(),
    },
    {
        _id: 'tour-campaign-005',
        name: 'UGC Trial Batch',
        status: CampaignStatus.Completed,
        total_budget: 3000,
        budget_claimed: 2925,
        submissions: 19,
        created_at: new Date('2026-01-12T07:45:00.000Z').getTime(),
    },
];

const getActiveCampaignLimit = (planType?: string | null) => {
    switch ((planType ?? 'payasyougo').toLowerCase()) {
        case 'growth':
            return 5;
        case 'unlimited':
            return null;
        case 'starter':
        case 'payasyougo':
        default:
            return 1;
    }
};

const CampaignsSkeleton = () => {
    const rows = Array.from({ length: 5 }, (_, id) => ({ id }));
    return (
        <Table variant="primary" className={businessTableClassName}>
            <Table.ScrollContainer>
                <Table.Content aria-label="Loading campaigns" aria-busy="true" className={`${businessTableContentClassName} min-w-[900px]`}>
                    <Table.Header>
                        {['Campaign', 'Status', 'Date created', 'Submissions', 'Budget claimed'].map(label => <Table.Column key={label} className={businessTableColumnClassName}>{label.toUpperCase()}</Table.Column>)}
                    </Table.Header>
                    <Table.Body items={rows}>
                        {row => <Table.Row id={row.id}>
                            <Table.Cell className={businessTableCellClassName}><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-lg" /><Skeleton className="h-4 w-40 rounded-lg" /></div></Table.Cell>
                            <Table.Cell className={businessTableCellClassName}><Skeleton className="h-6 w-16 rounded-full" /></Table.Cell>
                            <Table.Cell className={businessTableCellClassName}><Skeleton className="h-4 w-24 rounded-lg" /></Table.Cell>
                            <Table.Cell className={businessTableCellClassName}><Skeleton className="h-4 w-8 rounded-lg" /></Table.Cell>
                            <Table.Cell className={businessTableCellClassName}><div className="flex min-w-36 flex-col gap-1.5"><Skeleton className="h-3 w-12 rounded-lg" /><Skeleton className="h-1.5 w-full rounded-full" /><Skeleton className="ml-auto h-3 w-12 rounded-lg" /></div></Table.Cell>
                        </Table.Row>}
                    </Table.Body>
                </Table.Content>
            </Table.ScrollContainer>
        </Table>
    );
};

export default function Campaigns() {
    const navigate = useNavigate();
    const [isTourActive, setIsTourActive] = useState(() => isProductTourActive());

    useEffect(() => {
        const syncTourState = () => {
            setIsTourActive(isProductTourActive());
        };
        window.addEventListener(PRODUCT_TOUR_STATE_EVENT, syncTourState);
        return () => {
            window.removeEventListener(PRODUCT_TOUR_STATE_EVENT, syncTourState);
        };
    }, []);

    // Data Fetching
    const business = useQuery(api.businesses.getMyBusiness);
    const activeCampaignCount = useQuery(
        api.campaigns.getActiveCampaignCount,
        business?._id ? { businessId: business._id } : "skip",
    );

    // Fetch campaigns
    // If business is not loaded yet, we skip. 
    // If business is loaded but null (not onboarded), we'll handle that in UI logic or skip too.
    const { results, status } = usePaginatedQuery(
        api.campaigns.getCampaignsByBusiness,
        business?._id ? { businessId: business._id } : "skip",
        { initialNumItems: 50 }
    );

    // Filter campaigns
    const campaigns = (isTourActive ? TOUR_MOCK_CAMPAIGNS : (results || [])) as CampaignData[];
    const activeCampaignLimit = getActiveCampaignLimit(business?.subscription_plan_type);
    const isCheckingCampaignLimit = !isTourActive
        && Boolean(business?._id)
        && activeCampaignLimit !== null
        && activeCampaignCount === undefined;
    const hasReachedCampaignLimit = !isTourActive
        && activeCampaignLimit !== null
        && (activeCampaignCount ?? 0) >= activeCampaignLimit;
    const handleCreateCampaign = () => {
        if (isCheckingCampaignLimit) {
            return;
        }

        if (hasReachedCampaignLimit) {
            toast({
                title: 'Active campaign limit reached',
                description: 'You have reached the maximum number of active campaigns for your current plan. End or pause one active campaign before creating a new one.',
                color: 'warning',
            });

            return;
        }

        navigate('/campaign/new');
    };

    // Derived state for filtered lists
    const ongoingCampaigns = campaigns.filter((c) =>
        c.status === CampaignStatus.Active || c.status === CampaignStatus.Paused
    ).map((c) => ({
        ...getCampaignCategoryVisual(Array.isArray(c.category) ? c.category[0] : c.category),
        id: c._id,
        name: c.name,
        submissions: c.submissions || 0,
        budget: `Rm ${c.total_budget}`,
        claimed: `Rm ${c.budget_claimed}`,
        rawBudget: c.total_budget || 0,
        rawClaimed: c.budget_claimed || 0,
        status: c.status,
        createdDate: new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    }));

    const pastCampaigns = campaigns.filter((c) =>
        c.status === CampaignStatus.Completed
        || c.status === CampaignStatus.PendingCancellation
        || c.status === CampaignStatus.Cancelled
    ).map((c) => {
        return {
            ...getCampaignCategoryVisual(Array.isArray(c.category) ? c.category[0] : c.category),
            id: c._id,
            name: c.name,
            submissions: c.submissions || 0,
            budget: `Rm ${c.total_budget}`,
            claimed: `Rm ${c.budget_claimed}`,
            rawBudget: c.total_budget || 0,
            rawClaimed: c.budget_claimed || 0,
            status: c.status,
            createdDate: new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        };
    });

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

    const isLoading = !isTourActive && (status === "LoadingFirstPage" || business === undefined);

    if (isLoading) {
        return (
            <div className="p-8 font-sans text-gray-900 animate-fadeIn">
                <h1 className="text-2xl font-bold mb-6">Campaigns</h1>

                {/* Ongoing Campaigns Skeleton */}
                <div className="mb-12" data-tour-id="campaigns-overview-section">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold">Ongoing Campaigns</h2>
                        <button data-tour-id="campaigns-create-button" disabled className="bg-[#1C1C1C] text-white px-5 py-2.5 rounded-xl text-sm font-semibold opacity-50 cursor-not-allowed flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" />
                            Create Campaign
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
                <EmptyState onCreate={handleCreateCampaign} isCreateDisabled={isCheckingCampaignLimit} />
            </div>
        )
    }

    return (
        <div className="p-8 font-sans text-gray-900 animate-fadeIn">
            <h1 className="text-2xl font-bold mb-6">Campaigns</h1>

            {/* Ongoing Campaigns */}
            <div className="mb-12" data-tour-id="campaigns-overview-section">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold">Ongoing Campaigns</h2>
                    <button
                        onClick={handleCreateCampaign}
                        disabled={isCheckingCampaignLimit}
                        data-tour-id="campaigns-create-button"
                        className="bg-[#1C1C1C] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1C1C1C]"
                    >
                        <Plus className="w-4 h-4" />
                        Create Campaign
                    </button>
                </div>

                {sortedOngoing.length > 0 ? (
                    <CampaignTable campaigns={sortedOngoing} sort={ongoingSort} onSort={key => requestSort(key)} onOpenCampaign={id => navigate(`/campaigns/${id}`)} />
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
                    <CampaignTable campaigns={sortedPast} sort={pastSort} onSort={key => requestSort(key, true)} onOpenCampaign={id => navigate(`/campaigns/${id}`)} />
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
