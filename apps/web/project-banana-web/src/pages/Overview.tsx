import { useState } from 'react';
import { Authenticated, useQuery } from 'convex/react'; // Added useQuery
import { api } from '../../../../../packages/backend/convex/_generated/api'; // Uncommented
import { Skeleton } from '@heroui/react';
import {
    LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const data = [
    { name: 'Jan', value: 4000 },
    { name: 'Feb', value: 3000 },
    { name: 'Mar', value: 2000 },
    { name: 'Apr', value: 2780 },
    { name: 'May', value: 1890 },
    { name: 'Jun', value: 2390 },
    { name: 'Jul', value: 3490 },
];

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

export default function Overview() {
    const [currentMetric, setCurrentMetric] = useState('Views');
    // const { user, signOut } = useAuth();

    // Check if user has a business
    const business = useQuery(api.businesses.getMyBusiness);
    const subscription = useQuery(api.stripe.getSubscriptionDetails);

    // Loading state for charts
    const isLoading = business === undefined || subscription === undefined;

    return (
        <div className="p-8 font-sans text-gray-900">
            <h1 className="text-2xl font-bold mb-6">Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Stats - Display Items (Matching Campaign Details) */}
                {['Views', 'Likes', 'Comments', 'Shares'].map((label) => (
                    <div
                        key={label}
                        onClick={() => setCurrentMetric(label)}
                        className={`p-6 rounded-3xl border transition-all cursor-pointer ${currentMetric === label
                            ? 'bg-[#F9FAFB] border-black shadow-sm'
                            : 'bg-white border-[#F4F6F8] hover:border-gray-200'
                            }`}
                    >
                        <div className="text-gray-900 font-medium mb-4 text-sm">{label}</div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <div className="text-3xl font-bold">
                                {label === 'Views' ? '7,265' :
                                    label === 'Comments' ? '7,265' : '3,671'}
                            </div>
                        </div>
                        <div className={`text-sm font-medium flex items-center gap-1 ${label === 'Views' ? 'text-emerald-500' : 'text-gray-500'}`}>
                            {label === 'Views' ? '+11.01%' : '-0.03%'}
                            <span className="text-[10px]">↗</span>
                        </div>
                    </div>
                ))}
            </div>

            <Authenticated>
                {/* Chart - Clickable/Content Component (White BG + Light Border) */}
                {/* Chart - Clickable/Content Component (Matching Campaign Details) */}
                <div className="bg-[#F9FAFB] p-8 rounded-3xl mb-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <span className="inline-block px-3 py-1 bg-yellow-400 rounded-lg text-xs font-bold mb-2">
                                {currentMetric}
                            </span>
                            <h3 className="font-bold text-gray-900">Performance Overview</h3>
                        </div>
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
                                <LineChart data={data}>
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
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ stroke: '#F4F6F8', strokeWidth: 2 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#1C1C1C"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 6, fill: '#1C1C1C', strokeWidth: 0 }}
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