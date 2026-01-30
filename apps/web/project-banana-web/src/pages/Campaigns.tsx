import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';

import { Layers, FilePlus, AlertCircle, ShoppingBag, Radio, Coffee, Music, Video, ChevronLeft, Plus, X, Check, Eye, DollarSign, Loader2, ArrowUp, ArrowDown } from 'lucide-react';

import { Chip } from "@heroui/chip";
import { CheckIcon, ActiveIcon, PausedIcon } from '../components/Icons';

const ongoingCampaigns = [
    { id: '1', name: 'Chakra Soft UI Version', submissions: 2344, budget: 'Rm 2000', claimed: 'Rm 1200', status: 'active', icon: Layers, iconColor: 'text-purple-600', iconBg: 'bg-purple-100', createdDate: 'Oct 24, 2025' },
    { id: '2', name: 'Add Progress Track', submissions: 2344, budget: 'Rm 2000', claimed: 'Rm 200', status: 'paused', icon: FilePlus, iconColor: 'text-blue-600', iconBg: 'bg-blue-100', createdDate: 'Oct 25, 2025' },
    { id: '3', name: 'Fix Platform Errors', submissions: 2344, budget: 'Not set', claimed: 'Rm 0', status: 'active', icon: AlertCircle, iconColor: 'text-red-500', iconBg: 'bg-red-100', createdDate: 'Oct 26, 2025' },
    { id: '4', name: 'Add the New Pricing Page', submissions: 2344, budget: 'Rm 2000', claimed: 'Rm 500', status: 'active', icon: Layers, iconColor: 'text-blue-500', iconBg: 'bg-blue-100', createdDate: 'Oct 28, 2025' },
    { id: '5', name: 'Redesign New Online Shop', submissions: 2344, budget: 'Rm 2000', claimed: 'Rm 800', status: 'paused', icon: ShoppingBag, iconColor: 'text-red-500', iconBg: 'bg-red-100', createdDate: 'Oct 29, 2025' },
];

const pastCampaigns = [
    { id: '6', name: 'Summer Marketing Blitz', submissions: 5102, budget: 'Rm 15000', claimed: 'Rm 15000', status: 'completed', icon: Coffee, iconColor: 'text-orange-600', iconBg: 'bg-orange-100', createdDate: 'Jun 15, 2025' },
    { id: '7', name: 'Q3 Product Refresh', submissions: 3200, budget: 'Rm 8000', claimed: 'Rm 8000', status: 'completed', icon: ShoppingBag, iconColor: 'text-pink-600', iconBg: 'bg-pink-100', createdDate: 'Aug 01, 2025' },
    { id: '8', name: 'Influencer Outreach', submissions: 1205, budget: 'Rm 5000', claimed: 'Rm 5000', status: 'completed', icon: Video, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-100', createdDate: 'Sep 10, 2025' },
    { id: '9', name: 'Holiday Special', submissions: 8500, budget: 'Rm 20000', claimed: 'Rm 20000', status: 'completed', icon: Music, iconColor: 'text-teal-600', iconBg: 'bg-teal-100', createdDate: 'Dec 01, 2025' },
];



export interface Threshold {
    views: string;
    amount: string;
}

export const parseViews = (views: string): number => {
    const v = views.toLowerCase().trim();
    if (v.endsWith('k')) {
        return parseFloat(v.replace('k', '')) * 1000;
    }
    if (v.endsWith('m')) {
        return parseFloat(v.replace('m', '')) * 1000000;
    }
    return parseFloat(v) || 0;
};

export const PayoutThresholdModal = ({ onClose, onSave, initialData, initialMaxPayout }: {
    onClose: () => void,
    onSave: (data: Threshold[], max: string) => void,
    initialData: Threshold[],
    initialMaxPayout: string
}) => {
    // ... component implementation
    const [thresholds, setThresholds] = useState<Threshold[]>(
        initialData.length > 0 ? initialData : Array(5).fill({ views: '', amount: '' })
    );
    const [maxPayout, setMaxPayout] = useState(initialMaxPayout);

    const handleThresholdChange = (index: number, field: keyof Threshold, value: string) => {
        const newThresholds = [...thresholds];
        newThresholds[index] = { ...newThresholds[index], [field]: value };
        setThresholds(newThresholds);
    };

    const handleRecommend = () => {
        setThresholds([
            { views: '10k', amount: '15' },
            { views: '50k', amount: '35' },
            { views: '100k', amount: '75' },
            { views: '250k', amount: '150' },
            { views: '500k', amount: '300' },
        ]);
        setMaxPayout('1500');
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
            <div className="bg-white rounded-3xl w-[95vw] max-w-480 h-[90vh] overflow-y-auto z-10 p-14 animate-scaleIn flex flex-col md:flex-row gap-20 relative">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors p-2"
                >
                    <X className="w-6 h-6" />
                </button>
                {/* Left Side - Inputs */}
                <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">Payout Threshold</h2>
                    <p className="text-gray-500 mb-8">This is the part where we assign pay per view.</p>

                    <div className="space-y-6">
                        {thresholds.map((threshold, index) => (
                            <div key={index} className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="font-medium text-gray-900 text-sm">Every</label>
                                    <input
                                        type="text"
                                        placeholder="View"
                                        value={threshold.views}
                                        onChange={(e) => handleThresholdChange(index, 'views', e.target.value)}
                                        className="w-full bg-[#F9FAFB] border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all placeholder:text-gray-300"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="font-medium text-gray-900 text-sm">We pay</label>
                                    <input
                                        type="text"
                                        placeholder="Rm"
                                        value={threshold.amount}
                                        onChange={(e) => handleThresholdChange(index, 'amount', e.target.value)}
                                        className="w-full bg-[#F9FAFB] border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all placeholder:text-gray-300"
                                    />
                                </div>
                            </div>
                        ))}

                        <div className="pt-4">
                            <label className="font-medium text-gray-900 text-sm block mb-2">Maximum Payout</label>
                            <input
                                type="text"
                                placeholder="Rm"
                                value={maxPayout}
                                onChange={(e) => setMaxPayout(e.target.value)}
                                className="w-1/2 bg-[#F9FAFB] border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all placeholder:text-gray-300"
                            />
                            <p className="text-xs text-gray-400 mt-2">This is the maximum amount the creator can earn</p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Preview */}
                <div className="flex-1 bg-[#F9FAFB] rounded-3xl p-12 flex flex-col items-center justify-center relative">
                    <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm text-center">
                        <div className="w-12 h-12 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-sm border border-gray-100">
                            {/* Simple placeholder logo */}
                            <span className="text-2xl font-bold text-gray-800">a</span>
                        </div>
                        <h3 className="text-xl font-bold mb-1">Payouts</h3>
                        <p className="text-xs text-gray-500 mb-8">How much do I get paid?</p>

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between text-xs font-bold text-gray-900 mb-2">
                                <span>Views</span>
                                <span>Amount</span>
                            </div>
                            {thresholds.map((t, i) => (
                                t.views && t.amount ? (
                                    <div key={i} className="flex justify-between text-xs text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Radio className="w-3 h-3" />
                                            <span>{t.views} views</span>
                                        </div>
                                        <span className="font-medium text-gray-900">Rm {t.amount}</span>
                                    </div>
                                ) : null
                            ))}
                            {maxPayout && (
                                <div className="flex justify-between text-xs text-gray-600 pt-2 border-t border-dashed border-gray-200 mt-2">
                                    <span>Maximum Payout</span>
                                    <span className="font-medium text-gray-900">Rm {maxPayout}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="absolute bottom-8 right-8 flex gap-4">
                        <button
                            onClick={handleRecommend}
                            className="bg-[#FFD700] text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#FCD100] transition-colors"
                        >
                            Try Recommended
                        </button>
                        <button
                            onClick={() => onSave(thresholds, maxPayout)}
                            className="bg-black text-white px-8 py-3 rounded-xl font-medium text-sm hover:bg-gray-900 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export interface RequirementsData {
    noAi: boolean;
    followScript: boolean;
    language: string;
    location: string;
    custom: string[];
}

export const RequirementsModal = ({ onClose, onSave, initialData }: {
    onClose: () => void,
    onSave: (data: RequirementsData) => void,
    initialData: RequirementsData
}) => {
    // ... component implementation
    const [data, setData] = useState<RequirementsData>(initialData);
    const [newCustom, setNewCustom] = useState('');

    const handleRecommend = () => {
        setData({
            noAi: true,
            followScript: true,
            language: 'English',
            location: 'Any',
            custom: ['Review before posting', 'Use provided assets in video']
        });
    };

    const addCustom = () => {
        if (newCustom.trim()) {
            setData({ ...data, custom: [...data.custom, newCustom] });
            setNewCustom('');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
            <div className="bg-white rounded-3xl w-[95vw] max-w-480 h-[90vh] overflow-y-auto z-10 p-14 animate-scaleIn flex flex-col md:flex-row gap-20 relative">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors p-2"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Left Side - Inputs */}
                <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">Requirements</h2>
                    <p className="text-gray-500 mb-8">Please select the requirements for your video submissions.</p>

                    <div className="space-y-8">
                        {/* Content Section */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-900">Content</h3>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setData({ ...data, noAi: !data.noAi })}
                                    className={`flex-1 flex flex-col items-start p-4 rounded-2xl border-2 transition-all ${data.noAi ? 'border-black bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                >
                                    <span className="text-xs text-gray-500 font-medium mb-1">content</span>
                                    <span className="text-lg font-bold text-gray-900">No AI Content</span>
                                </button>
                                <button
                                    onClick={() => setData({ ...data, followScript: !data.followScript })}
                                    className={`flex-1 flex flex-col items-start p-4 rounded-2xl border-2 transition-all ${data.followScript ? 'border-black bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                >
                                    <span className="text-xs text-gray-500 font-medium mb-1">content</span>
                                    <span className="text-lg font-bold text-gray-900">Follow Script 1:1</span>
                                </button>
                            </div>
                        </div>

                        {/* Language & Location */}
                        <div className="flex gap-4">
                            <div className="flex-1 space-y-4">
                                <h3 className="font-bold text-gray-900">Language</h3>
                                <div className="p-4 rounded-2xl border-2 border-gray-100 bg-white">
                                    <span className="text-xs text-gray-500 font-medium mb-1 block">language</span>
                                    <input
                                        type="text"
                                        value={data.language}
                                        onChange={(e) => setData({ ...data, language: e.target.value })}
                                        className="text-lg font-bold text-gray-900 w-full outline-none placeholder:text-gray-300"
                                        placeholder="Enter language"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 space-y-4">
                                <h3 className="font-bold text-gray-900">Location</h3>
                                <div className="p-4 rounded-2xl border-2 border-gray-100 bg-white">
                                    <span className="text-xs text-gray-500 font-medium mb-1 block">location</span>
                                    <input
                                        type="text"
                                        value={data.location}
                                        onChange={(e) => setData({ ...data, location: e.target.value })}
                                        className="text-lg font-bold text-gray-900 w-full outline-none placeholder:text-gray-300"
                                        placeholder="Any"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Custom */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-900">Custom</h3>
                            <div className="space-y-3">
                                {data.custom.map((req, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group hover:bg-gray-100 transition-colors">
                                        <div className="w-2 h-2 rounded-full bg-black"></div>
                                        <span className="flex-1 font-medium">{req}</span>
                                        <button
                                            onClick={() => setData({ ...data, custom: data.custom.filter((_, idx) => idx !== i) })}
                                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCustom}
                                        onChange={(e) => setNewCustom(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                                        placeholder="+ Add your own"
                                        className="flex-1 bg-gray-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-gray-200 transition-all font-medium"
                                    />
                                    <button
                                        onClick={addCustom}
                                        className="bg-black text-white px-6 rounded-xl font-medium hover:bg-gray-800 transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Preview */}
                <div className="flex-1 bg-[#F9FAFB] rounded-3xl p-12 flex flex-col items-center justify-center relative">
                    <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm text-center">
                        <div className="w-12 h-12 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-sm border border-gray-100">
                            {/* Simple placeholder logo */}
                            <span className="text-2xl font-bold text-gray-800">a</span>
                        </div>
                        <h3 className="text-xl font-bold mb-1">Requirements</h3>
                        <p className="text-xs text-gray-500 mb-8">How does my post get approved?</p>

                        <div className="bg-[#F9FAFB] rounded-xl p-4 text-left space-y-3">
                            {data.noAi && (
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 mt-0.5 text-black shrink-0" />
                                    <span className="text-xs font-semibold text-gray-900">No AI generated</span>
                                </div>
                            )}
                            {data.followScript && (
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 mt-0.5 text-black shrink-0" />
                                    <span className="text-xs font-semibold text-gray-900">Follow Script</span>
                                </div>
                            )}
                            {data.language && (
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 mt-0.5 text-black shrink-0" />
                                    <span className="text-xs font-semibold text-gray-900">Speak {data.language}</span>
                                </div>
                            )}
                            {data.location && data.location.toLowerCase() !== 'any' && (
                                <div className="flex items-start gap-3">
                                    <Check className="w-4 h-4 mt-0.5 text-black shrink-0" />
                                    <span className="text-xs font-semibold text-gray-900">Creator from {data.location}</span>
                                </div>
                            )}
                            {data.custom.map((req, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <Check className="w-4 h-4 mt-0.5 text-black shrink-0" />
                                    <span className="text-xs font-semibold text-gray-900">{req}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="absolute bottom-8 right-8 flex gap-4">
                        <button
                            onClick={handleRecommend}
                            className="bg-[#FFD700] text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#FCD100] transition-colors"
                        >
                            Try Recommended
                        </button>
                        <button
                            onClick={() => onSave(data)}
                            className="bg-black text-white px-8 py-3 rounded-xl font-medium text-sm hover:bg-gray-900 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export interface ScriptItem {
    type: string;
    description: string;
}

export interface ScriptsData {
    hook: string;
    product: string;
    cta: string;
    custom: ScriptItem[];
}

export const ScriptsModal = ({ onClose, onSave, initialData }: {
    onClose: () => void,
    onSave: (data: ScriptsData) => void,
    initialData: ScriptsData
}) => {
    // ... component implementation
    const [data, setData] = useState<ScriptsData>(initialData);
    const [newCustom, setNewCustom] = useState<ScriptItem>({ type: '', description: '' });

    const handleRecommend = () => {
        setData({
            hook: "3 things to change, 1 is the we has to be we, 2 is the so has to be so.",
            product: "2 things to change, 1 is the we has to be we, 2 is the so has to be so.",
            cta: "3 things to change, 1 is the we has to be we, 2 is the so has to be so.",
            custom: []
        });
    };

    const addCustom = () => {
        if (newCustom.type.trim() && newCustom.description.trim()) {
            setData({ ...data, custom: [...data.custom, newCustom] });
            setNewCustom({ type: '', description: '' });
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
            <div className="bg-white rounded-3xl w-[95vw] max-w-480 h-[90vh] overflow-y-auto z-10 p-14 animate-scaleIn flex flex-col md:flex-row gap-20 relative">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors p-2"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Left Side - Inputs */}
                <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">Scripts (Optional)</h2>
                    <p className="text-gray-500 mb-8">This is the part where we set the scripts for the video.</p>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="font-semibold text-gray-900">Hook</label>
                            <textarea
                                value={data.hook}
                                onChange={(e) => setData({ ...data, hook: e.target.value })}
                                className="w-full bg-[#f8f9fa] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all min-h-[80px] resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="font-semibold text-gray-900">Product</label>
                            <textarea
                                value={data.product}
                                onChange={(e) => setData({ ...data, product: e.target.value })}
                                className="w-full bg-[#f8f9fa] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all min-h-[80px] resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="font-semibold text-gray-900">CTA</label>
                            <textarea
                                value={data.cta}
                                onChange={(e) => setData({ ...data, cta: e.target.value })}
                                className="w-full bg-[#f8f9fa] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all min-h-[80px] resize-none"
                            />
                        </div>

                        {/* Custom */}
                        <div className="space-y-4 pt-2">
                            <h3 className="font-bold text-gray-900">Custom</h3>
                            <div className="space-y-3">
                                {data.custom.map((item, i) => (
                                    <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl group relative">
                                        <div className="flex-1">
                                            <div className="font-bold text-sm text-gray-900">{item.type}</div>
                                            <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                                        </div>
                                        <button
                                            onClick={() => setData({ ...data, custom: data.custom.filter((_, idx) => idx !== i) })}
                                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}

                                <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                                    <input
                                        type="text"
                                        value={newCustom.type}
                                        onChange={(e) => setNewCustom({ ...newCustom, type: e.target.value })}
                                        placeholder="Type (e.g. Start of video)"
                                        className="w-full bg-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-gray-200 text-sm font-medium"
                                    />
                                    <textarea
                                        value={newCustom.description}
                                        onChange={(e) => setNewCustom({ ...newCustom, description: e.target.value })}
                                        placeholder="Description"
                                        className="w-full bg-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-gray-200 text-sm h-20 resize-none"
                                    />
                                    <button
                                        onClick={addCustom}
                                        className="w-full bg-black text-white py-2 rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors"
                                    >
                                        + Add your own
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Preview */}
                <div className="flex-1 bg-[#F9FAFB] rounded-3xl p-12 flex flex-col items-center justify-center relative">
                    <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm text-center">
                        <div className="w-12 h-12 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-sm border border-gray-100">
                            <span className="text-2xl font-bold text-gray-800">a</span>
                        </div>
                        <h3 className="text-xl font-bold mb-1">Scripts</h3>
                        <p className="text-xs text-gray-500 mb-8">These line must appear in the video</p>

                        <div className="space-y-6 text-left">
                            {(data.hook || data.product || data.cta) && (
                                <>
                                    {data.hook && (
                                        <div>
                                            <h4 className="font-bold text-sm mb-1">Start of video</h4>
                                            <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">{data.hook}</p>
                                        </div>
                                    )}
                                    {data.product && (
                                        <div>
                                            <h4 className="font-bold text-sm mb-1">Product</h4>
                                            <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">{data.product}</p>
                                        </div>
                                    )}
                                    {data.cta && (
                                        <div>
                                            <h4 className="font-bold text-sm mb-1">End of video</h4>
                                            <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">{data.cta}</p>
                                        </div>
                                    )}
                                </>
                            )}

                            {data.custom.map((item, i) => (
                                <div key={i}>
                                    <h4 className="font-bold text-sm mb-1">{item.type}</h4>
                                    <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">{item.description}</p>
                                </div>
                            ))}

                            {!data.hook && !data.product && !data.cta && data.custom.length === 0 && (
                                <p className="text-xs text-center text-gray-300 italic">No scripts configured yet</p>
                            )}
                        </div>
                    </div>

                    <div className="absolute bottom-8 right-8 flex gap-4">
                        <button
                            onClick={handleRecommend}
                            className="bg-[#FFD700] text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#FCD100] transition-colors"
                        >
                            Try Recommended
                        </button>
                        <button
                            onClick={() => onSave(data)}
                            className="bg-black text-white px-8 py-3 rounded-xl font-medium text-sm hover:bg-gray-900 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

const CreateCampaign = ({ onBack }: { onBack: () => void }) => {
    const business = useQuery(api.businesses.getMyBusiness);
    const createCampaign = useMutation(api.campaigns.createCampaign);

    const [name, setName] = useState('');
    const [totalPayouts, setTotalPayouts] = useState('');
    const [assets, setAssets] = useState('');
    const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
    const [thresholdData, setThresholdData] = useState<Threshold[]>([]);
    const [maxPayout, setMaxPayout] = useState('');

    const [isReqModalOpen, setIsReqModalOpen] = useState(false);
    const [reqData, setReqData] = useState<RequirementsData>({
        noAi: false,
        followScript: false,
        language: '',
        location: '',
        custom: []
    });

    const [isScriptsModalOpen, setIsScriptsModalOpen] = useState(false);
    const [scriptsData, setScriptsData] = useState<ScriptsData>({
        hook: '',
        product: '',
        cta: '',
        custom: []
    });

    const handleSaveScripts = (data: ScriptsData) => {
        setScriptsData(data);
        setIsScriptsModalOpen(false);
    };

    const handleSaveReq = (data: RequirementsData) => {
        setReqData(data);
        setIsReqModalOpen(false);
    };

    const [isPublishing, setIsPublishing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handlePublish = async () => {
        if (!business) return;

        setIsPublishing(true);
        try {
            await createCampaign({
                businessId: business._id,
                status: "active",
                name: name,
                total_budget: parseFloat(totalPayouts) || 0,
                asset_links: assets,
                maximum_payout: parseFloat(maxPayout) || 0,
                payout_thresholds: thresholdData
                    .filter(t => t.views && t.amount)
                    .map(t => ({
                        views: parseViews(t.views),
                        payout: parseFloat(t.amount) || 0
                    })),
                requirements: [
                    ...(reqData.noAi ? [{ description: "No AI Content" }] : []),
                    ...(reqData.followScript ? [{ description: "Follow Script 1:1" }] : []),
                    ...(reqData.language ? [{ description: `Speak ${reqData.language}` }] : []),
                    ...(reqData.location ? [{ description: `Creator from ${reqData.location}` }] : []),
                    ...reqData.custom.map(c => ({ description: c }))
                ],
                scripts: [
                    ...(scriptsData.hook ? [{ type: "Hook", description: scriptsData.hook }] : []),
                    ...(scriptsData.product ? [{ type: "Product", description: scriptsData.product }] : []),
                    ...(scriptsData.cta ? [{ type: "CTA", description: scriptsData.cta }] : []),
                    ...scriptsData.custom
                ]
            });
            setShowSuccess(true);
        } catch (error) {
            console.error("Failed to publish campaign:", error);
            // Optionally set error state here
        } finally {
            setIsPublishing(false);
        }
    };

    const handleSaveThreshold = (data: Threshold[], max: string) => {
        setThresholdData(data);
        setMaxPayout(max);
        setIsThresholdModalOpen(false);
    };

    return (
        <div className="animate-fadeIn relative">
            {isThresholdModalOpen && (
                <PayoutThresholdModal
                    onClose={() => setIsThresholdModalOpen(false)}
                    onSave={handleSaveThreshold}
                    initialData={thresholdData}
                    initialMaxPayout={maxPayout}
                />
            )}

            {isReqModalOpen && (
                <RequirementsModal
                    onClose={() => setIsReqModalOpen(false)}
                    onSave={handleSaveReq}
                    initialData={reqData}
                />
            )}

            {isScriptsModalOpen && (
                <ScriptsModal
                    onClose={() => setIsScriptsModalOpen(false)}
                    onSave={handleSaveScripts}
                    initialData={scriptsData}
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Back
                </button>

            </div>

            <h1 className="text-2xl font-bold mb-8">Setup new campaign</h1>

            <div className="flex flex-col md:flex-row gap-8 md:gap-12 max-w-6xl">
                {/* Left Column */}
                <div className="flex-1 flex flex-col gap-8">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="font-semibold text-gray-900 block w-fit relative">
                            Name
                            <span className="text-red-500 absolute -top-1 -right-3 text-lg leading-none">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[#F4F6F8] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                        />
                    </div>

                    {/* Total Payouts */}
                    <div className="space-y-2">
                        <label className="font-semibold text-gray-900 block w-fit relative">
                            Total payouts
                            <span className="text-red-500 absolute -top-1 -right-3 text-lg leading-none">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">Rm</span>
                            <input
                                type="number"
                                value={totalPayouts}
                                onChange={(e) => setTotalPayouts(e.target.value)}
                                className="w-full bg-[#F4F6F8] rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                            />
                        </div>
                    </div>

                    {/* Requirements */}
                    <div className="space-y-2">
                        <label className="font-semibold text-gray-900 block w-fit relative">
                            Requirements
                            <span className="text-red-500 absolute -top-1 -right-3 text-lg leading-none">*</span>
                        </label>
                        {reqData.noAi || reqData.followScript || reqData.language || reqData.location || reqData.custom.length > 0 ? (
                            <div className="bg-[#F8F9FA] rounded-3xl p-6">
                                <h3 className="font-bold text-sm mb-4 text-gray-900">Current Requirements</h3>
                                <div className="space-y-3 mb-6">
                                    {reqData.noAi && (
                                        <div className="flex items-start gap-3">
                                            <Check className="w-4 h-4 mt-0.5 text-black shrink-0" />
                                            <span className="text-sm text-gray-600">No AI generated</span>
                                        </div>
                                    )}
                                    {reqData.followScript && (
                                        <div className="flex items-start gap-3">
                                            <Check className="w-4 h-4 mt-0.5 text-black shrink-0" />
                                            <span className="text-sm text-gray-600">Follow Script</span>
                                        </div>
                                    )}
                                    {reqData.language && (
                                        <div className="flex items-start gap-3">
                                            <Check className="w-4 h-4 mt-0.5 text-black shrink-0" />
                                            <span className="text-sm text-gray-600">Speak {reqData.language}</span>
                                        </div>
                                    )}
                                    {reqData.location && reqData.location.toLowerCase() !== 'any' && (
                                        <div className="flex items-start gap-3">
                                            <Check className="w-4 h-4 mt-0.5 text-black shrink-0" />
                                            <span className="text-sm text-gray-600">Creator from {reqData.location}</span>
                                        </div>
                                    )}
                                    {reqData.custom.map((req, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <Check className="w-4 h-4 mt-0.5 text-black shrink-0" />
                                            <span className="text-sm text-gray-600">{req}</span>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setIsReqModalOpen(true)}
                                    className="w-full bg-white rounded-xl py-3 font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors text-gray-900"
                                >
                                    Update Requirements
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsReqModalOpen(true)}
                                className="w-full bg-[#F4F6F8] rounded-xl px-4 py-3 flex items-center justify-center font-medium hover:bg-gray-200 transition-colors gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Requirements
                            </button>
                        )}
                    </div>

                    {/* Scripts */}
                    <div className="space-y-2">
                        <label className="font-semibold text-gray-900 block w-fit relative">
                            Scripts
                        </label>
                        {scriptsData.hook || scriptsData.product || scriptsData.cta || scriptsData.custom.length > 0 ? (
                            <div className="bg-[#F8F9FA] rounded-3xl p-6">
                                <h3 className="font-bold text-sm mb-4 text-gray-900">Current Scripts</h3>
                                <div className="space-y-4 mb-6">
                                    {scriptsData.hook && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-sm bg-black mt-1.5 shrink-0" />
                                            <div className="flex-1">
                                                <span className="text-sm font-bold text-gray-900 block">Hook</span>
                                                <p className="text-xs text-gray-500 line-clamp-2">{scriptsData.hook}</p>
                                            </div>
                                        </div>
                                    )}
                                    {scriptsData.product && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-sm bg-black mt-1.5 shrink-0" />
                                            <div className="flex-1">
                                                <span className="text-sm font-bold text-gray-900 block">Product</span>
                                                <p className="text-xs text-gray-500 line-clamp-2">{scriptsData.product}</p>
                                            </div>
                                        </div>
                                    )}
                                    {scriptsData.cta && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-sm bg-black mt-1.5 shrink-0" />
                                            <div className="flex-1">
                                                <span className="text-sm font-bold text-gray-900 block">CTA</span>
                                                <p className="text-xs text-gray-500 line-clamp-2">{scriptsData.cta}</p>
                                            </div>
                                        </div>
                                    )}
                                    {scriptsData.custom.map((item, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-sm bg-black mt-1.5 shrink-0" />
                                            <div className="flex-1">
                                                <span className="text-sm font-bold text-gray-900 block">{item.type}</span>
                                                <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setIsScriptsModalOpen(true)}
                                    className="w-full bg-white rounded-xl py-3 font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors text-gray-900"
                                >
                                    Update Scripts
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsScriptsModalOpen(true)}
                                className="w-full bg-[#F4F6F8] rounded-xl px-4 py-3 flex items-center justify-center font-medium hover:bg-gray-200 transition-colors gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Scripts
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex-1 flex flex-col gap-8">
                    {/* Campaign Cover Photo */}
                    <div className="space-y-2">
                        <label className="font-semibold text-gray-900 block w-fit relative">
                            Campaign Cover Photo
                            <span className="text-red-500 absolute -top-1 -right-3 text-lg leading-none">*</span>
                        </label>
                        <button className="w-full bg-[#F4F6F8] rounded-xl px-4 py-3 flex items-center justify-center font-medium hover:bg-gray-200 transition-colors gap-2">
                            <Plus className="w-4 h-4" />
                            Upload photo
                        </button>
                    </div>

                    {/* Payout Threshold */}
                    <div className="space-y-2">
                        <label className="font-semibold text-gray-900 block w-fit relative">
                            Payout Threshold
                            <span className="text-red-500 absolute -top-1 -right-3 text-lg leading-none">*</span>
                        </label>
                        {thresholdData.some(t => t.views && t.amount) ? (
                            <div className="bg-[#F8F9FA] rounded-3xl p-6">
                                <h3 className="font-bold text-sm mb-4 text-gray-900">Current Threshold</h3>
                                <div className="space-y-3 mb-6">
                                    {thresholdData.map((t, i) => (
                                        t.views && t.amount ? (
                                            <div key={i} className="flex items-center gap-6 text-sm text-gray-600">
                                                <div className="flex items-center gap-2 min-w-[100px]">
                                                    <Eye className="w-4 h-4 text-gray-400" />
                                                    <span>{t.views} view</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-900 text-white text-[10px] font-bold">
                                                        <DollarSign className="w-2.5 h-2.5" />
                                                    </div>
                                                    <span>Rm{t.amount}</span>
                                                </div>
                                            </div>
                                        ) : null
                                    ))}
                                </div>
                                <button
                                    onClick={() => setIsThresholdModalOpen(true)}
                                    className="w-full bg-white rounded-xl py-3 font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors text-gray-900"
                                >
                                    Update Threshold
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsThresholdModalOpen(true)}
                                className="w-full bg-[#F4F6F8] rounded-xl px-4 py-3 flex items-center justify-center font-medium hover:bg-gray-200 transition-colors gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Thresholds
                            </button>
                        )}
                    </div>

                    {/* Assets */}
                    <div className="space-y-2">
                        <label className="font-semibold text-gray-900 block w-fit relative">
                            Assets
                        </label>
                        <input
                            type="text"
                            value={assets}
                            onChange={(e) => setAssets(e.target.value)}
                            placeholder="https://www.drive.google.com/..."
                            className="w-full bg-[#F4F6F8] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all placeholder:text-gray-400"
                        />
                    </div>
                </div>
            </div>

            {showSuccess && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" />
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full relative z-10 animate-scaleIn text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Campaign Published!</h3>
                        <p className="text-gray-500 mb-8">
                            Your campaign is now live and visible to all creators. Changes usually take about 5 minutes to propagate.
                        </p>
                        <button
                            onClick={onBack}
                            className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-900 transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            )}

            <div className="fixed bottom-8 right-8 flex gap-4 z-40">
                <button
                    disabled={isPublishing}
                    className="bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-900 px-8 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-lg disabled:opacity-50"
                >
                    Save Draft
                </button>
                <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="bg-[#1C1C1C] text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/20 flex items-center gap-2 min-w-[140px] justify-center disabled:opacity-70"
                >
                    {isPublishing ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Publishing...</span>
                        </>
                    ) : (
                        <span>Publish</span>
                    )}
                </button>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.4s ease-out forwards;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default function Campaigns() {
    const [view, setView] = useState<'list' | 'create'>('list');
    const navigate = useNavigate();

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

    const sortedOngoing = useMemo(() => sortDisplayData(ongoingCampaigns, ongoingSort), [ongoingSort]);
    const sortedPast = useMemo(() => sortDisplayData(pastCampaigns, pastSort), [pastSort]);

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

    if (view === 'create') {
        return <div className="p-8 font-sans text-gray-900"><CreateCampaign onBack={() => setView('list')} /></div>;
    }

    return (
        <div className="p-8 font-sans text-gray-900 animate-fadeIn">
            <h1 className="text-2xl font-bold mb-6">Campaigns</h1>

            {/* Ongoing Campaigns */}
            <div className="mb-12">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold">Ongoing Campaigns</h2>
                    <button
                        onClick={() => setView('create')}
                        className="bg-[#1C1C1C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                        + Create Campaign
                    </button>
                </div>

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
                        {sortedOngoing.map((campaign, index) => (
                            <div
                                key={index}
                                onClick={() => navigate(`/campaigns/${campaign.id}`)}
                                className="grid grid-cols-10 gap-4 p-6 items-center hover:bg-gray-50 transition-colors "
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
            </div>

            {/* Completed Campaigns */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold">Completed Campaigns</h2>
                </div>

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
                        {sortedPast.map((campaign, index) => (
                            <div
                                key={index}
                                onClick={() => navigate(`/campaigns/${campaign.id}`)}
                                className="grid grid-cols-10 gap-4 p-6 items-center hover:bg-gray-50 transition-colors"
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