import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { ChevronLeft, Plus, X, Check, Eye, DollarSign, Wallet, ArrowRight, Swords, Star, Video, MessageSquare, Mic, Scissors, MonitorPlay, Info, Upload, Building } from 'lucide-react';
import { ERROR_CODES } from '../../../../../packages/backend/convex/errors';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Popover, PopoverTrigger, PopoverContent, Button as HeroButton } from "@heroui/react";
import Button from '../components/ui/Button';
import { CAMPAIGN_CATEGORIES } from '../lib/campaignCategories';

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
                                            {/* Assuming Radio was imported from lucide-react or similar in parent but not used here, using generic dot */}
                                            <div className="w-3 h-3 rounded-full bg-gray-300"></div>
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
                    <h2 className="text-2xl font-bold mb-2">Scripts  </h2>
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

const validationSchema = Yup.object({
    name: Yup.string().required('Please enter a campaign name'),
    category: Yup.array().min(1, 'Please select at least one category'),
    totalPayouts: Yup.number()
        .required('Please enter a valid total budget')
        .positive('Please enter a valid total budget'),
    assets: Yup.string().url('Please enter a valid URL'),
    maxPayout: Yup.number()
        .required('Please configure payout thresholds and maximum payout')
        .positive('Please configure payout thresholds and maximum payout'),
    thresholdData: Yup.array().test(
        'at-least-one-threshold',
        'Please add at least one payout threshold',
        (value) => value ? value.some(t => t.views && t.amount) : false
    ),
    reqData: Yup.object().test(
        'at-least-one-requirement',
        'Please set campaign requirements',
        (value: any) => value.noAi || value.followScript || value.language || value.location || value.custom.length > 0
    )
});

export default function CreateCampaign() {
    const business = useQuery(api.businesses.getMyBusiness);
    const createCampaign = useMutation(api.campaigns.createCampaign);
    const generateCampaignImageUploadUrl = useAction(api.campaigns.generateCampaignImageUploadUrl);
    const generateBusinessLogoAccessUrl = useAction(api.businesses.generateLogoAccessUrl);
    const navigate = useNavigate();

    const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
    const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
    const [isReqModalOpen, setIsReqModalOpen] = useState(false);
    const [isScriptsModalOpen, setIsScriptsModalOpen] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(null);
    const [useCompanyLogo, setUseCompanyLogo] = useState(false);

    useEffect(() => {
        const loadCompanyLogo = async () => {
            if (!business) {
                setCompanyLogoPreview(null);
                setUseCompanyLogo(false);
                return;
            }

            if (business.logo_url) {
                setCompanyLogoPreview(business.logo_url);
                return;
            }

            if (business.logo_s3_key) {
                try {
                    const signedUrl = await generateBusinessLogoAccessUrl({ businessId: business._id });
                    setCompanyLogoPreview(signedUrl ?? null);
                } catch (error) {
                    console.error("Failed to fetch company logo preview:", error);
                    setCompanyLogoPreview(null);
                }
                return;
            }

            setCompanyLogoPreview(null);
            setUseCompanyLogo(false);
        };

        void loadCompanyLogo();
    }, [business, generateBusinessLogoAccessUrl]);

    const uploadCampaignImage = async (file: File, imageType: "logo" | "cover") => {
        const { uploadUrl, s3Key } = await generateCampaignImageUploadUrl({
            contentType: file.type,
            imageType,
        });

        const result = await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
        });

        if (!result.ok) {
            throw new Error(`Failed to upload campaign ${imageType}`);
        }

        return s3Key;
    };

    const formik = useFormik({
        initialValues: {
            name: '',
            category: [] as string[],
            totalPayouts: '',
            assets: '',
            maxPayout: '',
            thresholdData: [] as Threshold[],
            reqData: {
                noAi: false,
                followScript: false,
                language: '',
                location: '',
                custom: []
            } as RequirementsData,
            scriptsData: {
                hook: '',
                product: '',
                cta: '',
                custom: []
            } as ScriptsData
        },
        validationSchema,
        onSubmit: async (values, { setSubmitting }) => {
            if (!business) {
                setSubmitting(false);
                return;
            }

            try {
                const hasCompanyLogo = !!(business.logo_url || business.logo_s3_key);
                const shouldUseCompanyLogo = useCompanyLogo && hasCompanyLogo;

                const uploadedLogoS3Key = !shouldUseCompanyLogo && logoFile
                    ? await uploadCampaignImage(logoFile, "logo")
                    : undefined;
                const uploadedCoverS3Key = coverFile
                    ? await uploadCampaignImage(coverFile, "cover")
                    : undefined;

                const campaignId = await createCampaign({
                    businessId: business._id,
                    business_name: business.name,
                    status: "active",
                    name: values.name,
                    logo_url: shouldUseCompanyLogo ? business.logo_url : undefined,
                    logo_s3_key: shouldUseCompanyLogo ? business.logo_s3_key : uploadedLogoS3Key,
                    cover_photo_s3_key: uploadedCoverS3Key,
                    total_budget: parseFloat(values.totalPayouts) || 0,
                    asset_links: values.assets,
                    maximum_payout: parseFloat(values.maxPayout) || 0,
                    payout_thresholds: values.thresholdData
                        .filter(t => t.views && t.amount)
                        .map(t => ({
                            views: parseViews(t.views),
                            payout: parseFloat(t.amount) || 0
                        })),
                    category: values.category,
                    requirements: [
                        ...(values.reqData.noAi ? ["No AI Content"] : []),
                        ...(values.reqData.followScript ? ["Follow Script 1:1"] : []),
                        ...(values.reqData.language ? [`Speak ${values.reqData.language}`] : []),
                        ...(values.reqData.location ? [`Creator from ${values.reqData.location}`] : []),
                        ...values.reqData.custom
                    ],
                    scripts: [
                        ...(values.scriptsData.hook ? [{ type: "Hook", description: values.scriptsData.hook }] : []),
                        ...(values.scriptsData.product ? [{ type: "Product", description: values.scriptsData.product }] : []),
                        ...(values.scriptsData.cta ? [{ type: "CTA", description: values.scriptsData.cta }] : []),
                        ...values.scriptsData.custom
                    ]
                });
                setCreatedCampaignId(campaignId);
                setShowSuccess(true);

            } catch (error: any) {
                console.error("Failed to publish campaign:", error);

                switch (error.data?.code) {
                    case ERROR_CODES.INSUFFICIENT_CREDITS.code:
                        alert(error.data.message);
                        break;
                    default:
                        break;
                }
            } finally {
                setSubmitting(false);
            }
        }
    });

    const handleSaveThreshold = (data: Threshold[], max: string) => {
        formik.setFieldValue('thresholdData', data);
        formik.setFieldValue('maxPayout', max);
        setIsThresholdModalOpen(false);
    };

    const handleSaveReq = (data: RequirementsData) => {
        formik.setFieldValue('reqData', data);
        setIsReqModalOpen(false);
    };

    const handleSaveScripts = (data: ScriptsData) => {
        formik.setFieldValue('scriptsData', data);
        setIsScriptsModalOpen(false);
    };

    const hasCompanyLogo = !!(business?.logo_url || business?.logo_s3_key || companyLogoPreview);
    const displayedLogoPreview = useCompanyLogo ? (companyLogoPreview ?? logoPreview) : logoPreview;

    return (
        <div className="p-8 font-sans text-gray-900 animate-fadeIn relative">
            {isThresholdModalOpen && (
                <PayoutThresholdModal
                    onClose={() => setIsThresholdModalOpen(false)}
                    onSave={handleSaveThreshold}
                    initialData={formik.values.thresholdData}
                    initialMaxPayout={formik.values.maxPayout}
                />
            )}

            {isReqModalOpen && (
                <RequirementsModal
                    onClose={() => setIsReqModalOpen(false)}
                    onSave={handleSaveReq}
                    initialData={formik.values.reqData}
                />
            )}

            {isScriptsModalOpen && (
                <ScriptsModal
                    onClose={() => setIsScriptsModalOpen(false)}
                    onSave={handleSaveScripts}
                    initialData={formik.values.scriptsData}
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={() => navigate('/campaigns')}
                    className="flex items-center text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Back
                </button>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/credits')}
                        className="bg-[#F4F6F8] rounded-full px-4 py-2 flex items-center gap-3 h-10 hover:bg-gray-200 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-600">
                                <span className="text-gray-900 font-bold">Rm {business?.credit_balance?.toFixed(2) ?? '0.00'}</span>
                            </span>
                        </div>
                        <div className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center">
                            <Plus className="w-3 h-3" />
                        </div>
                    </button>
                </div>
            </div>

            <h1 className="text-2xl font-bold mb-8">Setup new campaign</h1>

            <form onSubmit={formik.handleSubmit}>
                <div className="flex flex-col gap-8 max-w-6xl">
                    {/* Row 1: Name & Total Payouts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Name */}
                        <div className="space-y-1">
                            <label className="font-semibold text-gray-900 block w-fit relative">
                                Name
                                <span className="text-red-500 absolute -top-1 -right-3 text-lg leading-none">*</span>
                            </label>
                            <p className="text-sm text-gray-500 mb-4">Give your campaign a clear and catchy title.</p>
                            <input
                                type="text"
                                name="name"
                                placeholder="Campaign name..."
                                value={formik.values.name}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                className={`w-full bg-[#F4F6F8] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all ${formik.touched.name && formik.errors.name ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
                            />
                            {formik.touched.name && formik.errors.name && (
                                <p className="text-red-500 text-sm mt-1 font-medium">{formik.errors.name}</p>
                            )}
                        </div>

                        {/* Total Payouts */}
                        <div className="space-y-1">
                            <label className="font-semibold text-gray-900 block w-fit relative">
                                Total payouts
                                <span className="text-red-500 absolute -top-1 -right-3 text-lg leading-none">*</span>
                            </label>
                            <p className="text-sm text-gray-500 mb-4">Set the total budget for this campaign.</p>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">Rm</span>
                                <input
                                    type="number"
                                    name="totalPayouts"
                                    value={formik.values.totalPayouts}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    className={`w-full bg-[#F4F6F8] rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all ${formik.touched.totalPayouts && formik.errors.totalPayouts ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
                                />
                            </div>
                            {formik.touched.totalPayouts && formik.errors.totalPayouts && (
                                <p className="text-red-500 text-sm mt-1 font-medium">{formik.errors.totalPayouts}</p>
                            )}
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="font-semibold text-gray-900 block w-fit relative">
                                Category
                                <span className="text-red-500 absolute -top-1 -right-3 text-lg leading-none">*</span>
                            </label>
                            <p className="text-sm text-gray-500 mb-4">Select the content categories for your campaign.</p>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            {CAMPAIGN_CATEGORIES.map((cat) => {
                                const Icon = cat.icon;
                                const isSelected = formik.values.category.includes(cat.label);
                                return (
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        key={cat.id}
                                        onClick={() => {
                                            const newCategories = isSelected
                                                ? formik.values.category.filter((c) => c !== cat.label)
                                                : [...formik.values.category, cat.label];
                                            formik.setFieldValue('category', newCategories);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                const newCategories = isSelected
                                                    ? formik.values.category.filter((c) => c !== cat.label)
                                                    : [...formik.values.category, cat.label];
                                                formik.setFieldValue('category', newCategories);
                                            }
                                        }}
                                        className={`relative flex flex-col items-center justify-center gap-3 p-4 w-36 aspect-3/4 rounded-xl border-2 transition-all cursor-pointer ${isSelected ? 'border-black bg-gray-50 scale-[1.02]' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                    >
                                        <div className="absolute top-2 right-2">
                                            <Popover placement="top" showArrow={true} backdrop="transparent">
                                                <PopoverTrigger>
                                                    <HeroButton
                                                        isIconOnly
                                                        variant="light"
                                                        size="sm"
                                                        className="text-gray-400 hover:text-gray-900 transition-colors bg-transparent border-none min-w-0 h-6 w-6"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                        }}
                                                    >
                                                        <Info className="w-4 h-4" strokeWidth={2} />
                                                    </HeroButton>
                                                </PopoverTrigger>
                                                <PopoverContent>
                                                    <div className="px-1 py-2 max-w-[250px]">
                                                        <div className="text-small font-bold mb-1">{cat.label}</div>
                                                        <div className="text-tiny text-default-500 leading-relaxed">{cat.desc}</div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        <div className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${isSelected ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                                            <Icon className="w-5 h-5" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`text-xs font-bold text-center leading-tight ${isSelected ? 'text-black' : 'text-gray-900'}`}>{cat.label}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {formik.touched.category && formik.errors.category && typeof formik.errors.category === 'string' && (
                            <p className="text-red-500 text-sm mt-1 font-medium">{formik.errors.category}</p>
                        )}
                    </div>



                    {/* Row 3: Payout Threshold & Requirements */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Payout Threshold */}
                        <div className="space-y-1">
                            <label className="font-semibold text-gray-900 block w-fit relative">
                                Payout Threshold
                                <span className="text-red-500 absolute -top-1 -right-3 text-lg leading-none">*</span>
                            </label>
                            <p className="text-sm text-gray-500 mb-4">Define view milestones and reward amounts.</p>
                            {formik.touched.thresholdData && formik.errors.thresholdData && typeof formik.errors.thresholdData === 'string' && (
                                <p className="text-red-500 text-sm mb-2 font-medium">{formik.errors.thresholdData}</p>
                            )}
                            {formik.touched.maxPayout && formik.errors.maxPayout && (
                                <p className="text-red-500 text-sm mb-2 font-medium">{formik.errors.maxPayout}</p>
                            )}
                            {formik.values.thresholdData.some(t => t.views && t.amount) ? (
                                <div className="bg-[#F8F9FA] rounded-3xl p-6">
                                    <h3 className="font-bold text-sm mb-4 text-gray-900">Current Threshold</h3>
                                    <div className="space-y-3 mb-6">
                                        {formik.values.thresholdData.map((t, i) => (
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
                                        {formik.values.maxPayout && (
                                            <div className="flex items-center gap-6 text-sm text-gray-600 pt-2 border-t border-dashed border-gray-200 mt-2">
                                                <div className="flex items-center gap-2 min-w-[100px]">
                                                    <span className='font-semibold'>Max Payout</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-900 text-white text-[10px] font-bold">
                                                        <DollarSign className="w-2.5 h-2.5" />
                                                    </div>
                                                    <span>Rm{formik.values.maxPayout}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsThresholdModalOpen(true)}
                                        className="w-full bg-white rounded-xl py-3 font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors text-gray-900"
                                    >
                                        Update Threshold
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsThresholdModalOpen(true)}
                                    className="w-full bg-[#F4F6F8] rounded-xl px-4 py-3 flex items-center justify-center font-medium hover:bg-gray-200 transition-colors gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Thresholds
                                </button>
                            )}
                        </div>

                        {/* Requirements */}
                        <div className="space-y-1">
                            <label className="font-semibold text-gray-900 block w-fit relative">
                                Requirements
                                <span className="text-red-500 absolute -top-1 -right-3 text-lg leading-none">*</span>
                            </label>
                            <p className="text-sm text-gray-500 mb-4">Specify what creators must do or qualifications.</p>
                            {formik.touched.reqData && formik.errors.reqData && typeof formik.errors.reqData === 'string' && (
                                <p className="text-red-500 text-sm mb-2 font-medium">{formik.errors.reqData}</p>
                            )}
                            {formik.values.reqData.noAi || formik.values.reqData.followScript || formik.values.reqData.language || formik.values.reqData.location || formik.values.reqData.custom.length > 0 ? (
                                <div className="bg-[#F8F9FA] rounded-3xl p-6">
                                    <h3 className="font-bold text-sm mb-4 text-gray-900">Current Requirements</h3>
                                    <div className="space-y-3 mb-6">
                                        {formik.values.reqData.noAi && (
                                            <div className="flex items-start gap-3">
                                                <Check className="w-4 h-4 mt-0.5 text-black shrink-0" />
                                                <span className="text-sm text-gray-600">No AI generated</span>
                                            </div>
                                        )}
                                        {formik.values.reqData.followScript && (
                                            <div className="flex items-start gap-3">
                                                <Check className="w-4 h-4 mt-0.5 text-black shrink-0" />
                                                <span className="text-sm text-gray-600">Follow Script</span>
                                            </div>
                                        )}
                                        {formik.values.reqData.language && (
                                            <div className="flex items-start gap-3">
                                                <Check className="w-4 h-4 mt-0.5 text-black shrink-0" />
                                                <span className="text-sm text-gray-600">Speak {formik.values.reqData.language}</span>
                                            </div>
                                        )}
                                        {formik.values.reqData.location && formik.values.reqData.location.toLowerCase() !== 'any' && (
                                            <div className="flex items-start gap-3">
                                                <Check className="w-4 h-4 mt-0.5 text-black shrink-0" />
                                                <span className="text-sm text-gray-600">Creator from {formik.values.reqData.location}</span>
                                            </div>
                                        )}
                                        {formik.values.reqData.custom.map((req, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <Check className="w-4 h-4 mt-0.5 text-black shrink-0" />
                                                <span className="text-sm text-gray-600">{req}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsReqModalOpen(true)}
                                        className="w-full bg-white rounded-xl py-3 font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors text-gray-900"
                                    >
                                        Update Requirements
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsReqModalOpen(true)}
                                    className="w-full bg-[#F4F6F8] rounded-xl px-4 py-3 flex items-center justify-center font-medium hover:bg-gray-200 transition-colors gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Requirements
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Row 3: Scripts & Assets */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Scripts */}
                        <div className="space-y-1">
                            <label className="font-semibold text-gray-900 block w-fit relative">
                                Scripts
                            </label>
                            <p className="text-sm text-gray-500 mb-4">Provide dialogue or instructions for creators.</p>
                            {formik.values.scriptsData.hook || formik.values.scriptsData.product || formik.values.scriptsData.cta || formik.values.scriptsData.custom.length > 0 ? (
                                <div className="bg-[#F8F9FA] rounded-3xl p-6">
                                    <h3 className="font-bold text-sm mb-4 text-gray-900">Current Scripts</h3>
                                    <div className="space-y-4 mb-6">
                                        {formik.values.scriptsData.hook && (
                                            <div className="flex items-start gap-3">
                                                <div className="w-2 h-2 rounded-sm bg-black mt-1.5 shrink-0" />
                                                <div className="flex-1">
                                                    <span className="text-sm font-bold text-gray-900 block">Hook</span>
                                                    <p className="text-xs text-gray-500 line-clamp-2">{formik.values.scriptsData.hook}</p>
                                                </div>
                                            </div>
                                        )}
                                        {formik.values.scriptsData.product && (
                                            <div className="flex items-start gap-3">
                                                <div className="w-2 h-2 rounded-sm bg-black mt-1.5 shrink-0" />
                                                <div className="flex-1">
                                                    <span className="text-sm font-bold text-gray-900 block">Product</span>
                                                    <p className="text-xs text-gray-500 line-clamp-2">{formik.values.scriptsData.product}</p>
                                                </div>
                                            </div>
                                        )}
                                        {formik.values.scriptsData.cta && (
                                            <div className="flex items-start gap-3">
                                                <div className="w-2 h-2 rounded-sm bg-black mt-1.5 shrink-0" />
                                                <div className="flex-1">
                                                    <span className="text-sm font-bold text-gray-900 block">CTA</span>
                                                    <p className="text-xs text-gray-500 line-clamp-2">{formik.values.scriptsData.cta}</p>
                                                </div>
                                            </div>
                                        )}
                                        {formik.values.scriptsData.custom.map((item, i) => (
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
                                        type="button"
                                        onClick={() => setIsScriptsModalOpen(true)}
                                        className="w-full bg-white rounded-xl py-3 font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors text-gray-900"
                                    >
                                        Update Scripts
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsScriptsModalOpen(true)}
                                    className="w-full bg-[#F4F6F8] rounded-xl px-4 py-3 flex items-center justify-center font-medium hover:bg-gray-200 transition-colors gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Scripts
                                </button>
                            )}
                        </div>

                        {/* Assets */}
                        <div className="space-y-1">
                            <label className="font-semibold text-gray-900 block w-fit relative">
                                Assets link
                            </label>
                            <p className="text-sm text-gray-500 mb-4">Share folder with images or reference videos.</p>
                            <input
                                type="text"
                                name="assets"
                                value={formik.values.assets}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                placeholder="https://www.drive.google.com/..."
                                className={`w-full bg-[#F4F6F8] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all placeholder:text-gray-400 ${formik.touched.assets && formik.errors.assets ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
                            />
                            {formik.touched.assets && formik.errors.assets && (
                                <p className="text-red-500 text-sm mt-1 font-medium">{formik.errors.assets as string}</p>
                            )}
                        </div>
                    </div>

                    {/* Row 4: Campaign Logo & Cover */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-1">
                            <label className="font-semibold text-gray-900 block">Campaign logo  </label>
                            <div className="flex justify-between mb-4 ">
                                <p className="text-sm text-gray-500">Upload a campaign icon or use your company logo.</p>
                                {hasCompanyLogo && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); setUseCompanyLogo((prev) => !prev); }}
                                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${useCompanyLogo
                                            ? 'bg-black text-white border-black'
                                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        {useCompanyLogo ? "Using company logo" : "Use company logo"}
                                    </button>
                                )}
                            </div>
                            <label htmlFor="campaign-logo-upload" className="block bg-[#F8F9FA] rounded-3xl p-6 cursor-pointer border-2 border-transparent hover:border-gray-200 transition-all group h-full max-h-[240px]">
                                <div className="h-full flex flex-col items-center justify-center space-y-4">
                                    <div className="w-24 h-24 rounded-full bg-white border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center relative">
                                        {displayedLogoPreview ? (
                                            <>
                                                <img src={displayedLogoPreview} alt="Campaign logo preview" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Upload className="w-6 h-6 text-gray-900" />
                                                </div>
                                            </>
                                        ) : (
                                            <Building className="w-8 h-8 text-gray-300" />
                                        )}
                                    </div>
                                    <div className="text-center group-hover:opacity-70 transition-opacity">
                                        <span className="block text-sm font-semibold text-gray-900">
                                            {logoFile ? "Change logo" : "Click to upload logo"}
                                        </span>
                                        <span className="block text-xs text-gray-500 mt-1">1:1 aspect ratio</span>
                                    </div>
                                </div>
                                <input
                                    id="campaign-logo-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setLogoFile(file);
                                        setLogoPreview(URL.createObjectURL(file));
                                        setUseCompanyLogo(false);
                                    }}
                                />
                            </label>
                        </div>

                        <div className="space-y-1">
                            <label className="font-semibold text-gray-900 block">Campaign cover photo</label>
                            <div className="flex justify-between mb-4">
                                <p className="text-sm text-gray-500">Add a cover image shown for this campaign.</p>
                            </div>
                            <label htmlFor="campaign-cover-upload" className="block bg-[#F8F9FA] rounded-3xl p-6 cursor-pointer border-2 border-transparent hover:border-gray-200 transition-all group h-full max-h-[240px]">
                                <div className="w-full h-full min-h-[140px] rounded-2xl bg-white border-2 border-dashed border-gray-300 overflow-hidden flex flex-col items-center justify-center relative mx-auto">
                                    {coverPreview ? (
                                        <>
                                            <img src={coverPreview} alt="Campaign cover preview" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                                                <div className="text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold text-sm">
                                                    <Upload className="w-4 h-4" /> Change cover
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                                <Upload className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900 mt-2 group-hover:opacity-70 transition-opacity">Click to upload cover</span>
                                            <span className="text-xs text-gray-500 group-hover:opacity-70 transition-opacity">16:9 aspect ratio recommended</span>
                                        </>
                                    )}
                                </div>
                                <input
                                    id="campaign-cover-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setCoverFile(file);
                                        setCoverPreview(URL.createObjectURL(file));
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="fixed bottom-8 right-8 flex gap-4 z-40">

                    <Button
                        type="submit"
                        isLoading={formik.isSubmitting}
                        className="px-8 py-3 font-bold"
                    >
                        {formik.isSubmitting ? 'Publishing...' : 'Publish'}
                    </Button>
                </div>
            </form>

            {showSuccess && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl relative overflow-hidden grid grid-cols-1 md:grid-cols-2  animate-scaleIn">
                        {/* Left Side - Content */}
                        <div className="p-12 flex flex-col justify-center relative">
                            <div className="">
                                <h2 className="text-2xl text-gray-900 font-semibold mb-1">Campaign launched!</h2>
                                <p className="text-gray-500 text-sm mb-8">Here's what you can expect next</p>
                                <div className="space-y-6 mb-8">
                                    <div className="flex gap-4">
                                        <div className="shrink-0 w-8 h-8 rounded-full bg-[#F4F6F8] flex items-center justify-center font-bold text-sm text-gray-900">1</div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 text-sm mb-1">Creators submit videos</h4>
                                            <p className="text-sm text-gray-500 leading-relaxed">Creators will review your campaign requirements and submit their videos.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="shrink-0 w-8 h-8 rounded-full bg-[#F4F6F8] flex items-center justify-center font-bold text-sm text-gray-900">2</div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 text-sm mb-1">Review submissions</h4>
                                            <p className="text-sm text-gray-500 leading-relaxed">You review the videos to ensure they meet your quality standards and scripts.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="shrink-0 w-8 h-8 rounded-full bg-[#F4F6F8] flex items-center justify-center font-bold text-sm text-gray-900">3</div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 text-sm mb-1">Approve & Pay</h4>
                                            <p className="text-sm text-gray-500 leading-relaxed">Credits are only consumed when you approve a video. You pay only for what you like.</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        if (createdCampaignId) {
                                            navigate(`/campaigns/${createdCampaignId}`);
                                        } else {
                                            navigate('/campaigns');
                                        }
                                    }}
                                    className="bg-[#1C1C1C] text-white px-6 py-3 rounded-xl text-sm hover:bg-black transition-colors shadow-lg shadow-black/10 flex items-center gap-2 group/btn"
                                >
                                    View Campaign
                                    <ArrowRight className="w-4 h-4 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Right Side - Image */}
                        <div className="relative overflow-hidden h-full group">
                            <img
                                src="/onboarding-bg.png"
                                alt="Campaign Published"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/10" />
                            <div className="absolute bottom-12 right-8 bg-white/20 backdrop-blur-md p-1 rounded-full border border-white/20">
                                <img src="/banana-icon.png" alt="Banana" className="w-14 h-14 object-contain" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
}
