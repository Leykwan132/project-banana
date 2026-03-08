import { useMemo, useState, useEffect } from 'react';
import { Authenticated, useQuery } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { Skeleton } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { usePostHog } from '@posthog/react';
import {
    LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { ArrowRight, ArrowUpRight, Eye, Heart, MessageCircle, Share, Wallet } from 'lucide-react';
import {
    isProductTourActive,
    PRODUCT_TOUR_STATE_EVENT,
    triggerProductTourStart,
} from '../lib/productTour';

type MetricLabel = 'Views' | 'Likes' | 'Comments' | 'Shares' | 'Amount Spend';
type OverviewDailyStat = {
    date: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    amount_spent: number;
};
type TopCampaignItem = {
    campaignId: string;
    campaignName: string;
    views: number;
};
type TopApplicationItem = {
    applicationId: string;
    campaignName: string;
    views: number;
    postUrl?: string | null;
};

const METRICS: MetricLabel[] = ['Views', 'Likes', 'Comments', 'Shares', 'Amount Spend'];
const TOUR_MOCK_METRIC_TOTALS: Record<MetricLabel, number> = {
    Views: 482160,
    Likes: 31420,
    Comments: 5870,
    Shares: 2140,
    'Amount Spend': 18500,
};
const TOUR_MOCK_DAILY_STATS: OverviewDailyStat[] = [
    { date: '2026-03-01', views: 38250, likes: 2210, comments: 430, shares: 168, amount_spent: 1200 },
    { date: '2026-03-02', views: 49780, likes: 3015, comments: 532, shares: 210, amount_spent: 1850 },
    { date: '2026-03-03', views: 53260, likes: 3350, comments: 605, shares: 246, amount_spent: 2200 },
    { date: '2026-03-04', views: 54810, likes: 3485, comments: 622, shares: 258, amount_spent: 2360 },
    { date: '2026-03-05', views: 60350, likes: 3990, comments: 735, shares: 289, amount_spent: 2540 },
    { date: '2026-03-06', views: 62840, likes: 4285, comments: 810, shares: 301, amount_spent: 2780 },
    { date: '2026-03-07', views: 73120, likes: 5120, comments: 980, shares: 368, amount_spent: 3090 },
];
const TOUR_MOCK_TOP_CAMPAIGNS: TopCampaignItem[] = [
    { campaignId: 'tour-campaign-1', campaignName: 'Glow Serum Launch', views: 158400 },
    { campaignId: 'tour-campaign-2', campaignName: 'Weekend Bundle Push', views: 119250 },
    { campaignId: 'tour-campaign-3', campaignName: 'March UGC Sprint', views: 92100 },
    { campaignId: 'tour-campaign-4', campaignName: 'Ramadan Flash Promo', views: 72450 },
    { campaignId: 'tour-campaign-5', campaignName: 'Creator Test Batch', views: 39960 },
];
const TOUR_MOCK_TOP_APPLICATIONS: TopApplicationItem[] = [
    { applicationId: 'tour-post-1', campaignName: 'Glow Serum Launch', views: 52840, postUrl: 'https://www.tiktok.com' },
    { applicationId: 'tour-post-2', campaignName: 'Weekend Bundle Push', views: 43810, postUrl: 'https://www.instagram.com' },
    { applicationId: 'tour-post-3', campaignName: 'March UGC Sprint', views: 39120, postUrl: 'https://www.tiktok.com' },
    { applicationId: 'tour-post-4', campaignName: 'Ramadan Flash Promo', views: 32890, postUrl: 'https://www.instagram.com' },
    { applicationId: 'tour-post-5', campaignName: 'Creator Test Batch', views: 27310, postUrl: 'https://www.tiktok.com' },
];

const formatDateLabel = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
};

const formatAsOfDateLabel = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
};

const getYesterdayDateKeyUtc = () => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().split('T')[0] as string;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const formatMetricValue = (metric: MetricLabel, value: number) => {
    if (metric === 'Amount Spend') return `RM ${currencyFormatter.format(value)}`;
    return value.toLocaleString();
};



const getMetricValueFromRow = (
    row: { views: number; likes: number; comments: number; shares: number; amount_spent?: number; earnings?: number },
    metric: MetricLabel
) => {
    if (metric === 'Views') return row.views;
    if (metric === 'Likes') return row.likes;
    if (metric === 'Comments') return row.comments;
    if (metric === 'Shares') return row.shares;
    return row.amount_spent ?? row.earnings ?? 0;
};

const normalizeExternalUrl = (url: string) => {
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
};

export default function Overview() {
    const navigate = useNavigate();
    const posthog = usePostHog();
    const [currentMetric, setCurrentMetric] = useState<MetricLabel>('Views');
    const [isTourActive, setIsTourActive] = useState(() => isProductTourActive());

    // Check if user has a business
    const business = useQuery(api.businesses.getMyBusiness);

    useEffect(() => {
        if (business === null || (business && business.is_onboarded === false)) {
            navigate('/onboarding');
        }
    }, [business, navigate]);

    useEffect(() => {
        const syncTourState = () => {
            setIsTourActive(isProductTourActive());
        };
        window.addEventListener(PRODUCT_TOUR_STATE_EVENT, syncTourState);
        return () => {
            window.removeEventListener(PRODUCT_TOUR_STATE_EVENT, syncTourState);
        };
    }, []);

    const businessDailyStats = useQuery(
        api.analytics.getBusinessDailyStatsLast30Days,
        business ? { businessId: business._id } : "skip"
    );

    const businessTotalStats = useQuery(
        api.analytics.getBusinessTotalStats,
        business ? { businessId: business._id } : "skip"
    );
    const topOverviewLists = useQuery(
        api.analytics.getBusinessTopOverviewLists,
        business ? { businessId: business._id, limit: 5 } : "skip"
    );
    const subscription = useQuery(api.stripe.getSubscriptionDetails);

    // Loading state for charts
    const isLoading = !isTourActive && (business === undefined
        || subscription === undefined
        || (business ? businessDailyStats === undefined || businessTotalStats === undefined : false));
    const isTopListsLoading = !isTourActive && (business === undefined || (business ? topOverviewLists === undefined : false));
    const topCampaigns: TopCampaignItem[] = isTourActive
        ? TOUR_MOCK_TOP_CAMPAIGNS
        : (topOverviewLists?.campaigns ?? []) as TopCampaignItem[];
    const topApplications: TopApplicationItem[] = isTourActive
        ? TOUR_MOCK_TOP_APPLICATIONS
        : (topOverviewLists?.applications ?? []) as TopApplicationItem[];

    const totalViews = isTourActive ? TOUR_MOCK_METRIC_TOTALS.Views : (businessTotalStats?.views ?? business?.total_views ?? 0);
    const totalAmountSpend = isTourActive ? TOUR_MOCK_METRIC_TOTALS['Amount Spend'] : (businessTotalStats?.amount_spent ?? 0);

    const metricTotals: Record<MetricLabel, number> = {
        Views: totalViews,
        Likes: isTourActive ? TOUR_MOCK_METRIC_TOTALS.Likes : (businessTotalStats?.likes ?? business?.total_likes ?? 0),
        Comments: isTourActive ? TOUR_MOCK_METRIC_TOTALS.Comments : (businessTotalStats?.comments ?? business?.total_comments ?? 0),
        Shares: isTourActive ? TOUR_MOCK_METRIC_TOTALS.Shares : (businessTotalStats?.shares ?? business?.total_shares ?? 0),
        'Amount Spend': totalAmountSpend,
    };

    const effectiveDailyStats = useMemo(
        () => (isTourActive ? TOUR_MOCK_DAILY_STATS : (businessDailyStats ?? [])),
        [isTourActive, businessDailyStats]
    );

    const chartData = useMemo(() => {
        return effectiveDailyStats.map((row) => ({
            name: formatDateLabel(row.date),
            value: getMetricValueFromRow(row, currentMetric),
        }));
    }, [effectiveDailyStats, currentMetric]);

    const asOfDateLabel = useMemo(() => {
        const latestDateKey = effectiveDailyStats[effectiveDailyStats.length - 1]?.date ?? getYesterdayDateKeyUtc();
        return formatAsOfDateLabel(latestDateKey);
    }, [effectiveDailyStats]);



    const renderTooltip = (props: unknown) => {
        if (!props || typeof props !== 'object') return null;
        const active = Boolean((props as { active?: boolean }).active);
        const payload = (props as { payload?: Array<{ value?: number }> }).payload;
        const label = (props as { label?: string }).label;
        if (active && payload && payload.length) {
            const value = Number(payload[0].value ?? 0);

            let displayValue = '';
            if (currentMetric === 'Amount Spend') {
                displayValue = `RM${currencyFormatter.format(value)} spent`;
            } else {
                displayValue = `${value.toLocaleString()} ${currentMetric.toLowerCase()}`;
            }

            return (
                <div className="bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl flex flex-col items-center gap-1">
                    <p className="font-bold text-lg leading-none">{displayValue}</p>
                    <p className="text-gray-400 text-xs font-medium">{label}</p>
                </div>
            );
        }
        return null;
    };

    const CurrentIcon = currentMetric === 'Views' ? Eye
        : currentMetric === 'Likes' ? Heart
            : currentMetric === 'Comments' ? MessageCircle
                : currentMetric === 'Shares' ? Share
                    : Wallet;

    return (
        <div className="p-8 font-sans text-gray-900">
            <div className="mb-8 rounded-[2rem] border border-black bg-black p-6 shadow-[0_14px_36px_rgba(17,24,39,0.25)] md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/80">
                            2 min guide
                        </p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-4xl">
                            New to Lumina?
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm text-white/75 md:text-base">
                            Start this quick tour to learn the basics.
                        </p>
                    </div>
                    <div className="w-full lg:w-auto">
                        <button
                            type="button"
                            onClick={() => {
                                posthog.capture('product_tour_start_clicked', {
                                    surface: 'overview_banner',
                                });
                                triggerProductTourStart();
                            }}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-gray-100 lg:w-auto"
                        >
                            Start guide
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            <h1 className="text-2xl font-bold mb-6">Overview</h1>

            <div data-tour-id="overview-performance-section">
                <div data-tour-id="overview-metrics" className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
                    {/* Stats - Display Items (Matching Campaign Details) */}
                    {METRICS.map((label) => (
                        <div
                            key={label}
                            onClick={() => {
                                setCurrentMetric(label);
                            }}
                            className={`p-6 rounded-3xl border transition-all cursor-pointer ${currentMetric === label
                                ? 'bg-[#F9FAFB] border-black shadow-sm'
                                : 'bg-white border-[#F4F6F8] hover:border-gray-200'
                                }`}
                        >
                            <div className="text-gray-900 font-medium mb-4 text-sm">{label}</div>
                            <div className="flex items-baseline gap-2 mb-2">
                                <div className="text-3xl font-bold">{formatMetricValue(label, metricTotals[label])}</div>
                            </div>
                            <div className="text-xs font-medium text-gray-500">
                                As of {asOfDateLabel}
                            </div>
                        </div>
                    ))}
                </div>

                <Authenticated>
                    {/* Chart - Clickable/Content Component (White BG + Light Border) */}
                    {/* Chart - Clickable/Content Component (Matching Campaign Details) */}
                    <div className="bg-[#F9FAFB] p-8 rounded-3xl mb-8">
                        <div className="flex flex-col mb-8 pointer-events-none">
                            <div className="flex items-center gap-2 mb-4">
                                <CurrentIcon size={20} className="text-gray-500" />
                                <span className="text-gray-500 font-medium text-sm">
                                    {currentMetric === 'Amount Spend' ? 'Business total' : `Total ${currentMetric}`}
                                </span>
                            </div>
                            <h3 className="text-5xl font-bold text-gray-900 mb-2">
                                {formatMetricValue(currentMetric, metricTotals[currentMetric])}
                            </h3>
                            <span className="text-gray-500 text-sm">
                                As of {asOfDateLabel}
                            </span>
                        </div>
                        <div className="h-[300px] w-full">
                            {isLoading ? (
                                <div className="space-y-4 h-full flex flex-col justify-end">
                                    <Skeleton className="h-4 w-3/5 rounded-lg" />
                                    <Skeleton className="h-4 w-4/5 rounded-lg" />
                                    <Skeleton className="h-4 w-2/5 rounded-lg" />
                                    <Skeleton className="h-4 w-3/4 rounded-lg" />
                                    <Skeleton className="h-4 w-1/2 rounded-lg" />
                                    <Skeleton className="h-4 w-4/5 rounded-lg" />
                                    <Skeleton className="h-4 w-3/5 rounded-lg" />
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={chartData}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                            dy={10}
                                            interval={2}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                        />
                                        <Tooltip
                                            content={renderTooltip}
                                            cursor={{ stroke: '#F4F6F8', strokeWidth: 2 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#FF5722" // Adjusting Line color to match screenshot
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 6, fill: '#FF5722', strokeWidth: 2, stroke: 'white' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </Authenticated>
            </div>

            <Authenticated>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#F9FAFB] p-8 rounded-3xl flex flex-col">
                        <div className="mb-6">
                            <h3 className="font-bold text-gray-900">Top Campaigns by Views</h3>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {isTopListsLoading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <div key={index} className="py-4">
                                        <Skeleton className="h-5 w-full rounded-lg" />
                                    </div>
                                ))
                            ) : topCampaigns.length > 0 ? (
                                topCampaigns.map((campaign) => (
                                    <button
                                        key={campaign.campaignId}
                                        type="button"
                                        onClick={() => {
                                            if (isTourActive) return;
                                            navigate(`/campaigns/${campaign.campaignId}?tab=analytics`);
                                        }}
                                        className="w-full py-4 px-3 -mx-3 rounded-xl flex items-center justify-between text-left cursor-default hover:bg-gray-200/50 transition-colors"
                                    >
                                        <span className="text-sm font-semibold text-gray-900 truncate pr-3">
                                            {campaign.campaignName}
                                        </span>
                                        <span className="flex items-center gap-4 shrink-0">
                                            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                                                <Eye size={14} className="text-gray-400" />
                                                {campaign.views.toLocaleString()}
                                            </span>
                                            <ArrowUpRight size={16} className="text-gray-400" />
                                        </span>
                                    </button>
                                ))
                            ) : (
                                <p className="py-4 text-sm text-gray-500">No campaign analytics yet.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#F9FAFB] p-8 rounded-3xl flex flex-col">
                        <div className="mb-6">
                            <h3 className="font-bold text-gray-900">Top Posts by Views</h3>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {isTopListsLoading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <div key={index} className="py-4">
                                        <Skeleton className="h-5 w-full rounded-lg" />
                                    </div>
                                ))
                            ) : topApplications.length > 0 ? (
                                topApplications.map((application) => (
                                    <a
                                        key={application.applicationId}
                                        href={application.postUrl ? normalizeExternalUrl(application.postUrl) : "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full py-4 px-3 -mx-3 rounded-xl flex items-center justify-between text-left cursor-default hover:bg-gray-200/50 transition-colors"
                                    >
                                        <span className="text-sm font-semibold text-gray-900 truncate pr-3">
                                            {application.campaignName}
                                        </span>
                                        <span className="flex items-center gap-4 shrink-0">
                                            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                                                <Eye size={14} className="text-gray-400" />
                                                {application.views.toLocaleString()}
                                            </span>
                                            <ArrowUpRight size={16} className="text-gray-400" />
                                        </span>
                                    </a>
                                ))
                            ) : (
                                <p className="py-4 text-sm text-gray-500">No application links available yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </Authenticated>
        </div>
    );
}
