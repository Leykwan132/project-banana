import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
// import { useQuery } from 'convex/react';
// import { api } from '../../../../../../packages/backend/convex/_generated/api';
import { ChevronDown, DollarSign, Eye, CheckCircle, ChevronLeft, Plus } from 'lucide-react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { PayoutThresholdModal, RequirementsModal, ScriptsModal } from '../Campaigns';
import type { Threshold, RequirementsData, ScriptsData } from '../Campaigns';
import Button from '../../components/ui/Button';

// Mock Analytics Data
const performanceData = [
    { name: 'Jan', value1: 4000, value2: 2400 },
    { name: 'Feb', value1: 3000, value2: 1398 },
    { name: 'Mar', value1: 2000, value2: 9800 },
    { name: 'Apr', value1: 2780, value2: 3908 },
    { name: 'May', value1: 1890, value2: 4800 },
    { name: 'Jun', value1: 2390, value2: 3800 },
    { name: 'Jul', value1: 3490, value2: 4300 },
];

const bestPosts = [
    { name: 'Link...', value: 186999, maxValue: 200000 },
    { name: 'Link...', value: 186999, maxValue: 200000 },
    { name: 'Link...', value: 186999, maxValue: 200000 },
    { name: 'Link...', value: 186999, maxValue: 200000 },
];

const bestCreators = [
    { name: 'Profile A', value: 186999, maxValue: 200000 },
    { name: 'Profile B', value: 186999, maxValue: 200000 },
    { name: 'Profile C', value: 186999, maxValue: 200000 },
    { name: 'Profile D', value: 186999, maxValue: 200000 },
];

// Helper for Analytics Lists
const PerformanceItem = ({ name, value, maxValue }: { name: string, value: number, maxValue: number }) => (
    <div className="flex flex-col gap-2 mb-6 last:mb-0">
        <div className="flex justify-between items-center text-sm">
            <span className="font-bold text-gray-900">{name}</span>
            <span className="font-bold text-gray-900">{value.toLocaleString()}</span>
        </div>
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
                className="h-full bg-black rounded-full"
                style={{ width: `${(value / maxValue) * 100}%` }}
            />
        </div>
    </div>
);

export default function CampaignDetails() {
    // TODO: Fetch campaign data from Convex
    const { campaignId } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'about' | 'analytics'>('about');

    // --- About Tab State ---
    const [name, setName] = useState("Campaign Name");
    const [totalPayouts, setTotalPayouts] = useState("Rm 5000");
    const [createdDate] = useState("29 Jan, 2026");
    const [assetLink, setAssetLink] = useState("https://www.drive.google.com/...");

    // Modals State
    const [showThresholdModal, setShowThresholdModal] = useState(false);
    const [showRequirementsModal, setShowRequirementsModal] = useState(false);
    const [showScriptsModal, setShowScriptsModal] = useState(false);

    // Data State (Mocked initially)
    const [thresholdData, setThresholdData] = useState<Threshold[]>([
        { views: '10k', amount: '25' },
        { views: '50k', amount: '50' },
    ]);
    const [maxPayout, setMaxPayout] = useState('1500');

    const [reqData, setReqData] = useState<RequirementsData>({
        noAi: true,
        followScript: true,
        language: 'English',
        location: 'Any',
        custom: []
    });

    const [scriptsData, setScriptsData] = useState<ScriptsData>({
        hook: 'Hook description...',
        product: '',
        cta: '',
        custom: []
    });

    // Analytics State
    const [analyticsMetric, setAnalyticsMetric] = useState<'Views' | 'Likes' | 'Comments' | 'Shares'>('Views');


    return (
        <div className="animate-fadeIn relative pb-24 p-8">
            {/* Header / Navigation */}
            <div className="flex justify-between items-center mb-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/campaigns')}
                    icon={<ChevronLeft className="w-5 h-5" />}
                    className="pl-0 hover:bg-transparent hover:text-gray-600"
                >
                    Back
                </Button>
            </div>

            <div className="max-w-6xl">
                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 mb-8">{name}</h1>

                {/* Tabs */}
                <div className="flex items-center gap-8 border-b border-gray-200 mb-8">
                    <button
                        onClick={() => setActiveTab('about')}
                        className={`pb-4 text-sm font-medium transition-all relative ${activeTab === 'about' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        About
                        {activeTab === 'about' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`pb-4 text-sm font-medium transition-all relative ${activeTab === 'analytics' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        Analytics
                        {activeTab === 'analytics' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-t-full" />
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'about' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 animate-fadeIn">
                        {/* Left Column */}
                        <div className="space-y-12">
                            {/* Name Input */}
                            <div className="space-y-4">
                                <label className="text-lg font-bold text-gray-900 block">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-[#F9FAFB] border-none rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-gray-200 transition-all text-gray-600 font-medium"
                                />
                            </div>

                            {/* Total Payouts */}
                            <div className="space-y-4">
                                <label className="text-lg font-bold text-gray-900 block">Total payouts</label>
                                <input
                                    type="text"
                                    value={totalPayouts}
                                    onChange={(e) => setTotalPayouts(e.target.value)}
                                    className="w-full bg-[#F9FAFB] border-none rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-gray-200 transition-all text-gray-600 font-medium"
                                />
                            </div>

                            {/* Requirements Card */}
                            <div className="space-y-4">
                                <label className="text-lg font-bold text-gray-900 block">Requirements</label>
                                <div className="bg-[#F9FAFB] rounded-3xl p-8">
                                    <h3 className="font-bold mb-6">Current Requirements</h3>
                                    <div className="space-y-4 mb-8">
                                        {reqData.noAi && (
                                            <div className="flex items-center gap-3">
                                                <CheckCircle className="w-4 h-4 text-black" />
                                                <span className="text-sm font-medium text-gray-900">No AI generated</span>
                                            </div>
                                        )}
                                        {reqData.followScript && (
                                            <div className="flex items-center gap-3">
                                                <CheckCircle className="w-4 h-4 text-black" />
                                                <span className="text-sm font-medium text-gray-900">Follow Script</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="w-4 h-4 text-black" />
                                            <span className="text-sm font-medium text-gray-900">Speak {reqData.language}</span>
                                        </div>
                                        {/* ... more requirements logic ... */}
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full bg-white hover:bg-gray-50"
                                        onClick={() => setShowRequirementsModal(true)}
                                    >
                                        Update Requirements
                                    </Button>
                                </div>
                            </div>

                            {/* Scripts Card */}
                            <div className="space-y-4">
                                <label className="text-lg font-bold text-gray-900 block">Scripts</label>
                                <div className="bg-[#F9FAFB] rounded-3xl p-8">
                                    <h3 className="font-bold mb-6">Current Scripts</h3>
                                    <div className="space-y-5 mb-8">
                                        {scriptsData.hook && (
                                            <div>
                                                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                                                    <div className="w-2 h-2 rounded bg-black"></div> CTA
                                                </div>
                                                <p className="text-xs text-gray-500 pl-4">Update Requirements</p>
                                            </div>
                                        )}
                                        {scriptsData.hook && (
                                            <div>
                                                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                                                    <div className="w-2 h-2 rounded bg-black"></div> Hook
                                                </div>
                                                <p className="text-xs text-gray-500 pl-4">{scriptsData.hook}</p>
                                            </div>
                                        )}
                                        {/* ... more scripts logic ... */}
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full bg-white hover:bg-gray-50"
                                        onClick={() => setShowScriptsModal(true)}
                                    >
                                        Update Scripts
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-12">
                            {/* Cover Photo */}
                            <div className="space-y-4">
                                <label className="text-lg font-bold text-gray-900 block">Campaign Cover Photo</label>
                                <Button
                                    variant="outline"
                                    className="w-full flex items-center justify-center gap-2 py-4"
                                    icon={<Plus className="w-4 h-4" />}
                                >
                                    Upload photo
                                </Button>
                            </div>

                            {/* Payout Threshold Card */}
                            <div className="space-y-4">
                                <label className="text-lg font-bold text-gray-900 block w-fit relative">
                                    Payout Threshold
                                    <span className="text-red-500 absolute -top-1 -right-3 text-lg leading-none">*</span>
                                </label>
                                <div className="bg-[#F9FAFB] rounded-3xl p-8">
                                    <h3 className="font-bold mb-6">Current Threshold</h3>
                                    <div className="space-y-3 mb-8">
                                        {thresholdData.map((t, i) => (
                                            <div key={i} className="flex items-center gap-12 text-sm">
                                                <div className="flex items-center gap-2 w-24">
                                                    <Eye className="w-4 h-4 text-gray-400" />
                                                    <span className="font-medium">{t.views} view</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="w-4 h-4 text-gray-400" />
                                                    <span className="font-medium">Rm{t.amount}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full bg-white hover:bg-gray-50"
                                        onClick={() => setShowThresholdModal(true)}
                                    >
                                        Update Threshold
                                    </Button>
                                </div>
                            </div>

                            {/* Assets */}
                            <div className="space-y-4">
                                <label className="text-lg font-bold text-gray-900 block">Assets</label>
                                <input
                                    type="text"
                                    value={assetLink}
                                    onChange={(e) => setAssetLink(e.target.value)}
                                    className="w-full bg-[#F9FAFB] border-none rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-gray-200 transition-all text-gray-600 font-medium"
                                />
                            </div>
                        </div>



                        {/* Action Buttons */}
                        <div className="hidden">
                            {/* Placeholder to keep grid structure if needed, or remove completely */}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-fadeIn">
                        {/* Header Controls */}
                        <div className="flex justify-end mb-4">
                            <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">
                                Daily <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Metrics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {['Views', 'Likes', 'Comments', 'Shares'].map((metric) => (
                                <div
                                    key={metric}
                                    onClick={() => setAnalyticsMetric(metric as any)}
                                    className={`p-6 rounded-3xl border transition-all cursor-pointer ${analyticsMetric === metric
                                        ? 'bg-[#F9FAFB] border-black shadow-sm'
                                        : 'bg-white border-[#F4F6F8] hover:border-gray-200'
                                        }`}
                                >
                                    <div className="text-gray-900 font-medium mb-4 text-sm">{metric}</div>
                                    <div className="text-3xl font-bold mb-2">
                                        {metric === 'Views' ? '7,265' :
                                            metric === 'Likes' ? '3,671' :
                                                metric === 'Comments' ? '7,265' : '3,671'}
                                    </div>
                                    <div className={`text-sm font-medium flex items-center gap-1 ${metric === 'Views' ? 'text-emerald-500' : 'text-gray-500'
                                        }`}>
                                        {metric === 'Views' ? '+11.01%' : '-0.03%'}
                                        <span className="text-[10px]">↗</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Chart Section */}
                        <div className="bg-[#F9FAFB] p-8 rounded-3xl">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <span className={`inline-block px-3 py-1 bg-yellow-400 rounded-lg text-xs font-bold mb-2`}>
                                        {analyticsMetric}
                                    </span>
                                    <h3 className="font-bold text-gray-900">Performance Overview</h3>
                                </div>
                            </div>

                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={performanceData}>
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
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="value1"
                                            stroke="#1C1C1C"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="value2"
                                            stroke="#9CA3AF"
                                            strokeWidth={2}
                                            strokeDasharray="5 5" // Dotted line for comparison
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Best Performing Sections */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Campaigns / Posts */}
                            <div className="bg-[#F9FAFB] p-8 rounded-3xl">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="font-bold text-gray-900">Best Performing Posts</h3>
                                    <span className="bg-yellow-400 px-3 py-1 rounded-lg text-xs font-bold">Likes</span>
                                </div>
                                {bestPosts.map((item, i) => (
                                    <PerformanceItem key={i} {...item} />
                                ))}
                            </div>

                            {/* Creators */}
                            <div className="bg-[#F9FAFB] p-8 rounded-3xl">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="font-bold text-gray-900">Best Performing Creators</h3>
                                    <span className="bg-yellow-400 px-3 py-1 rounded-lg text-xs font-bold">Likes</span>
                                </div>
                                {bestCreators.map((item, i) => (
                                    <PerformanceItem key={i} {...item} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showThresholdModal && (
                <PayoutThresholdModal
                    initialData={thresholdData}
                    initialMaxPayout={maxPayout}
                    onClose={() => setShowThresholdModal(false)}
                    onSave={(data, max) => {
                        setThresholdData(data);
                        setMaxPayout(max);
                        setShowThresholdModal(false);
                    }}
                />
            )}

            {showRequirementsModal && (
                <RequirementsModal
                    initialData={reqData}
                    onClose={() => setShowRequirementsModal(false)}
                    onSave={(data) => {
                        setReqData(data);
                        setShowRequirementsModal(false);
                    }}
                />
            )}

            {showScriptsModal && (
                <ScriptsModal
                    initialData={scriptsData}
                    onClose={() => setShowScriptsModal(false)}
                    onSave={(data) => {
                        setScriptsData(data);
                        setShowScriptsModal(false);
                    }}
                />
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            `}</style>

            {/* Action Buttons (Fixed Screen Bottom Right) */}
            {activeTab === 'about' && createPortal(
                <div className="fixed bottom-8 right-8 flex gap-4 z-50">
                    <Button variant="secondary">
                        Pause Campaign
                    </Button>
                    <Button variant="primary">
                        Save Changes
                    </Button>
                </div>,
                document.body
            )}
        </div>
    );
}