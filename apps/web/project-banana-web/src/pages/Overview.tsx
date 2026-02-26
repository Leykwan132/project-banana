import { useMemo, useState } from 'react';
import { Authenticated, useQuery } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { Skeleton } from '@heroui/react';
import {
    LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Eye, Heart, MessageCircle, Share, Wallet } from 'lucide-react';

type MetricLabel = 'Views' | 'Likes' | 'Comments' | 'Shares' | 'Amount Spend';

const METRICS: MetricLabel[] = ['Views', 'Likes', 'Comments', 'Shares', 'Amount Spend'];

const campaignData = [
    { name: 'Instagram Brand Awareness', value: 4500, maxValue: 5000 },
    { name: 'TikTok Viral Challenge', value: 3200, maxValue: 5000 },
    { name: 'Facebook Retargeting', value: 2800, maxValue: 5000 },
    { name: 'YouTube Product Review', value: 2100, maxValue: 5000 },
];

const creatorData = [
    { name: 'Sarah Jenkins', value: 9200, maxValue: 10000 },
    { name: 'Mike Chen', value: 8500, maxValue: 10000 },
    { name: 'Jessica Smith', value: 7100, maxValue: 10000 },
    { name: 'David Wilson', value: 6800, maxValue: 10000 },
];

// Helper component for the list item
const PerformanceItem = ({ name, value, maxValue }: { name: string, value: number, maxValue: number }) => (
    <div className="flex flex-col gap-2 mb-6 last:mb-0">
        <div className="flex justify-between items-center text-sm">
            <span className="font-bold text-gray-900">{name}</span>
            <span className="font-bold text-gray-900">{value.toLocaleString()}</span>
        </div>
        <div className="h-3 w-full bg-white rounded-full overflow-hidden">
            <div
                className="h-full bg-black rounded-full"
                style={{ width: `${(value / maxValue) * 100}%` }}
            />
        </div>
    </div>
);

const formatDateLabel = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatMetricValue = (metric: MetricLabel, value: number) => {
    if (metric === 'Amount Spend') return `RM ${currencyFormatter.format(value)}`;
    return value.toLocaleString();
};

const getChartPoint = (event: unknown) => {
    if (!event || typeof event !== 'object') return null;
    const point = (event as { activePayload?: Array<{ payload?: { value?: number; name?: string } }> })
        .activePayload?.[0]?.payload;
    if (!point) return null;
    return {
        value: Number(point.value ?? 0),
        name: String(point.name ?? ''),
    };
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

export default function Overview() {
    const [currentMetric, setCurrentMetric] = useState<MetricLabel>('Views');
    const [activeChartData, setActiveChartData] = useState<{ value: number; name: string } | null>(null);

    // Check if user has a business
    const business = useQuery(api.businesses.getMyBusiness);
    const businessDailyStats = useQuery(
        api.analytics.getBusinessDailyStatsLast30Days,
        business ? { businessId: business._id } : "skip"
    );
    const businessTotalStats = useQuery(
        api.analytics.getBusinessTotalStats,
        business ? { businessId: business._id } : "skip"
    );
    const subscription = useQuery(api.stripe.getSubscriptionDetails);

    // Loading state for charts
    const isLoading = business === undefined
        || subscription === undefined
        || (business ? businessDailyStats === undefined || businessTotalStats === undefined : false);

    const latestDailyStat = businessDailyStats?.[businessDailyStats.length - 1];
    const totalViews = businessTotalStats?.views ?? business?.total_views ?? 0;
    const totalAmountSpend = businessTotalStats?.amount_spent ?? 0;

    const metricTotals: Record<MetricLabel, number> = {
        Views: totalViews,
        Likes: businessTotalStats?.likes ?? business?.total_likes ?? 0,
        Comments: businessTotalStats?.comments ?? business?.total_comments ?? 0,
        Shares: businessTotalStats?.shares ?? business?.total_shares ?? 0,
        'Amount Spend': totalAmountSpend,
    };

    const chartData = useMemo(() => {
        return (businessDailyStats ?? []).map((row) => ({
            name: formatDateLabel(row.date),
            value: getMetricValueFromRow(row, currentMetric),
        }));
    }, [businessDailyStats, currentMetric]);

    const latestChartPoint = chartData[chartData.length - 1];

    const getCurrentValue = () => {
        if (activeChartData) return formatMetricValue(currentMetric, activeChartData.value);
        return formatMetricValue(currentMetric, latestChartPoint?.value ?? 0);
    };

    const getCurrentDateLabel = () => {
        if (activeChartData) return activeChartData.name;
        return latestChartPoint?.name ?? 'Last 30 Days';
    };

    const renderTooltip = (props: unknown) => {
        if (!props || typeof props !== 'object') return null;
        const active = Boolean((props as { active?: boolean }).active);
        const payload = (props as { payload?: Array<{ value?: number }> }).payload;
        const label = (props as { label?: string }).label;
        if (active && payload && payload.length) {
            const value = Number(payload[0].value ?? 0);
            return (
                <div className="bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl flex flex-col items-center gap-1">
                    <p className="font-bold text-lg leading-none">{formatMetricValue(currentMetric, value)}</p>
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
            <h1 className="text-2xl font-bold mb-6">Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
                {/* Stats - Display Items (Matching Campaign Details) */}
                {METRICS.map((label) => (
                    <div
                        key={label}
                        onClick={() => {
                            setCurrentMetric(label);
                            setActiveChartData(null);
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
                            As of {new Date().toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
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
                            <span className="text-gray-500 font-medium text-sm">{currentMetric}</span>
                        </div>
                        <h3 className="text-5xl font-bold text-gray-900 mb-2">
                            {getCurrentValue()}
                        </h3>
                        <span className="text-gray-500 text-sm">
                            {getCurrentDateLabel()}
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
                                    onMouseMove={(event) => {
                                        const point = getChartPoint(event);
                                        if (point) {
                                            setActiveChartData(point);
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        setActiveChartData(null);
                                    }}
                                    onClick={(event) => {
                                        const point = getChartPoint(event);
                                        if (point) {
                                            setActiveChartData(point);
                                        }
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                        dy={10}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Best Performing Campaigns */}
                    <div className="bg-[#F9FAFB] p-8 rounded-3xl flex flex-col">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-bold text-gray-900">Best Performing Campaigns</h3>
                            <span className="bg-yellow-400 px-3 py-1 rounded-lg text-xs font-bold">Likes</span>
                        </div>
                        <div className="flex flex-col">
                            {campaignData.map((item, index) => (
                                <PerformanceItem key={index} {...item} />
                            ))}
                        </div>
                    </div>

                    {/* Best Performing Creators */}
                    <div className="bg-[#F9FAFB] p-8 rounded-3xl flex flex-col">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-bold text-gray-900">Best Performing Creators</h3>
                            <span className="bg-yellow-400 px-3 py-1 rounded-lg text-xs font-bold">Likes</span>
                        </div>
                        <div className="flex flex-col">
                            {creatorData.map((item, index) => (
                                <PerformanceItem key={index} {...item} />
                            ))}
                        </div>
                    </div>
                </div>
            </Authenticated>
        </div>
    );
}
