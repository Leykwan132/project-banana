import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../../packages/backend/convex/_generated/api';
import type { Id } from '../../../../../../packages/backend/convex/_generated/dataModel';
import { Skeleton } from "@heroui/skeleton";
import { ChevronDown, DollarSign, Eye, CheckCircle, ChevronLeft, Wallet, Plus, AlertCircle } from 'lucide-react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useFormik } from 'formik';
import * as Yup from 'yup';

import { PayoutThresholdModal, RequirementsModal, ScriptsModal, parseViews } from '../CreateCampaign';
import type { Threshold, RequirementsData, ScriptsData } from '../CreateCampaign';
import Button from '../../components/ui/Button';
import { addToast } from "@heroui/toast";

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

const UnsavedChangesModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: () => void }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl p-8 max-w-sm w-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-fadeIn border border-[#F4F6F8]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-12 h-12 bg-[#FFF0F0] rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-6 h-6 text-[#FF4D4D]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">Unsaved Changes</h3>
                <p className="text-gray-500 mb-8 text-sm leading-relaxed font-medium">
                    You have unsaved changes in your campaign.
                </p>
                <div className="flex flex-col gap-3">
                    <Button
                        variant="primary"
                        className="w-full bg-[#FF4D4D] hover:bg-[#FF3333] border-none text-white h-12 rounded-xl text-sm font-bold shadow-none"
                        onClick={onConfirm}
                    >
                        Discard Changes
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full bg-[#F4F6F8] hover:bg-[#EAECEF] text-gray-900 h-12 rounded-xl text-sm font-bold"
                        onClick={onClose}
                    >
                        Keep Editing
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const CampaignDetailsSkeleton = () => (
    <div className="animate-fadeIn relative pb-24 p-8">
        {/* Header / Navigation */}
        <div className="flex justify-between items-center mb-6">
            <Skeleton className="rounded-lg w-20 h-8" />
        </div>

        <div className="max-w-6xl">
            {/* Title */}
            <Skeleton className="rounded-lg w-64 h-10 mb-8" />

            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-gray-200 mb-8">
                <Skeleton className="rounded-lg w-16 h-8" />
                <Skeleton className="rounded-lg w-20 h-8" />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                {/* Left Column */}
                <div className="space-y-12">
                    <div className="space-y-4">
                        <Skeleton className="rounded-lg w-16 h-6" />
                        <Skeleton className="rounded-xl w-full h-14" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="rounded-lg w-32 h-6" />
                        <Skeleton className="rounded-xl w-full h-14" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="rounded-lg w-20 h-6" />
                        <Skeleton className="rounded-3xl w-full h-64" />
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-12">
                    <div className="space-y-4">
                        <Skeleton className="rounded-lg w-40 h-6" />
                        <Skeleton className="rounded-3xl w-full h-48" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="rounded-lg w-32 h-6" />
                        <Skeleton className="rounded-3xl w-full h-48" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="rounded-lg w-20 h-6" />
                        <Skeleton className="rounded-xl w-full h-14" />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const validationSchema = Yup.object({
    name: Yup.string().required('Please enter a campaign name'),
    totalPayouts: Yup.number()
        .required('Please enter a valid total budget')
        .positive('Please enter a valid total budget'),
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

export default function CampaignDetails() {
    const { campaignId } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'about' | 'analytics'>('about');

    const campaign = useQuery(api.campaigns.getCampaign, { campaignId: campaignId as Id<"campaigns"> });
    const business = useQuery(api.businesses.getMyBusiness);
    const updateCampaign = useMutation(api.campaigns.updateCampaign);
    const updateCampaignStatus = useMutation(api.campaigns.updateCampaignStatus);

    // Modals State
    const [showThresholdModal, setShowThresholdModal] = useState(false);
    const [showRequirementsModal, setShowRequirementsModal] = useState(false);
    const [showScriptsModal, setShowScriptsModal] = useState(false);
    const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
    const [isStatusUpdating, setIsStatusUpdating] = useState(false); // For pause/resume button loading

    // Initial Values State for Formik Reinitialization
    const [initialValues, setInitialValues] = useState({
        name: '',
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
    });

    // Populate state when campaign data is loaded
    useEffect(() => {
        if (campaign) {
            // Parse Thresholds
            const thresholds = campaign.payout_thresholds ? campaign.payout_thresholds.map((t: any) => ({
                views: t.views >= 1000000 ? `${t.views / 1000000}m` : t.views >= 1000 ? `${t.views / 1000}k` : `${t.views}`,
                amount: t.payout.toString()
            })) : [];

            // Parse Requirements
            const newReqData: RequirementsData = {
                noAi: false,
                followScript: false,
                language: '',
                location: '',
                custom: []
            };

            if (campaign.requirements) {
                campaign.requirements.forEach((req: string) => {
                    if (req === "No AI Content") newReqData.noAi = true;
                    else if (req === "Follow Script 1:1") newReqData.followScript = true;
                    else if (req.startsWith("Speak ")) newReqData.language = req.replace("Speak ", "");
                    else if (req.startsWith("Creator from ")) newReqData.location = req.replace("Creator from ", "");
                    else newReqData.custom.push(req);
                });
            }

            // Parse Scripts
            const newScriptsData: ScriptsData = {
                hook: '',
                product: '',
                cta: '',
                custom: []
            };

            if (campaign.scripts) {
                campaign.scripts.forEach((script: any) => {
                    if (script.type === "Hook") newScriptsData.hook = script.description;
                    else if (script.type === "Product") newScriptsData.product = script.description;
                    else if (script.type === "CTA") newScriptsData.cta = script.description;
                    else newScriptsData.custom.push(script);
                });
            }

            setInitialValues({
                name: campaign.name,
                totalPayouts: campaign.total_budget.toString(),
                assets: campaign.asset_links || "",
                maxPayout: campaign.maximum_payout?.toString() || "",
                thresholdData: thresholds,
                reqData: newReqData,
                scriptsData: newScriptsData
            });
        }
    }, [campaign]);

    const formik = useFormik({
        initialValues,
        enableReinitialize: true,
        validationSchema,
        onSubmit: async (values, { setSubmitting }) => {
            if (!campaignId) return;

            try {
                await updateCampaign({
                    campaignId: campaignId as Id<"campaigns">,
                    name: values.name,
                    total_budget: parseFloat(values.totalPayouts) || 0,
                    asset_links: values.assets,
                    maximum_payout: parseFloat(values.maxPayout) || 0,
                    payout_thresholds: values.thresholdData
                        .filter(t => t.views && t.amount)
                        .map(t => ({
                            views: parseViews(t.views),
                            payout: parseFloat(t.amount) || 0
                        })),
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
                addToast({
                    title: "Campaign updated successfully!",
                    color: "success",
                });

            } catch (error: any) {
                console.error("Failed to update campaign:", error);
                addToast({
                    title: "Failed to update campaign. Please try again.",
                    description: error.data?.message || error.message,
                    color: "danger",
                });
            } finally {
                setSubmitting(false);
            }
        }
    });

    // Analytics State
    const [analyticsMetric, setAnalyticsMetric] = useState<'Views' | 'Likes' | 'Comments' | 'Shares'>('Views');

    const handleBack = () => {
        if (formik.dirty) {
            setShowUnsavedChangesModal(true);
        } else {
            navigate('/campaigns');
        }
    };

    if (!campaign) {
        return <CampaignDetailsSkeleton />;
    }

    return (
        <div className="animate-fadeIn relative pb-24 p-8">
            {/* Header / Navigation */}
            <div className="flex justify-between items-center mb-6">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    icon={<ChevronLeft className="w-5 h-5" />}
                    className="pl-0 hover:bg-transparent hover:text-gray-600"
                >
                    Back
                </Button>

                <div className="flex items-center gap-4">
                    <div className="bg-[#F4F6F8] rounded-full px-4 py-2 flex items-center gap-3 h-10">
                        <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-600">
                                <span className="text-gray-900 font-bold">Rm {business?.credit_balance?.toFixed(2) ?? '0.00'}</span>
                            </span>
                        </div>
                        <button className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors">
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl">
                {/* Title & Status */}
                <div className="flex items-center gap-4 mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">{formik.values.name || 'Campaign Details'}</h1>

                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full border text-sm font-semibold capitalize ${campaign.status === 'active'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : campaign.status === 'paused'
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                            {campaign.status}
                        </span>
                    </div>
                </div>

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
                    <form onSubmit={formik.handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 animate-fadeIn">
                            {/* Left Column */}
                            <div className="space-y-12">
                                {/* Name Input */}
                                <div className="space-y-4">
                                    <label className="text-lg font-bold text-gray-900 block w-fit relative">
                                        Name
                                        <span className="text-red-500 absolute -top-1 -right-3 text-lg leading-none">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formik.values.name}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        className={`w-full bg-[#F9FAFB] border-none rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-gray-200 transition-all text-gray-600 font-medium ${formik.touched.name && formik.errors.name ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
                                    />
                                    {formik.touched.name && formik.errors.name && (
                                        <p className="text-red-500 text-sm mt-1">{formik.errors.name}</p>
                                    )}
                                </div>

                                {/* Total Payouts */}
                                <div className="space-y-4">
                                    <label className="text-lg font-bold text-gray-900 block w-fit relative">
                                        Total payouts
                                        <span className="text-red-500 absolute -top-1 -right-3 text-lg leading-none">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="totalPayouts"
                                        value={formik.values.totalPayouts}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        className={`w-full bg-[#F9FAFB] border-none rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-gray-200 transition-all text-gray-600 font-medium ${formik.touched.totalPayouts && formik.errors.totalPayouts ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
                                    />
                                    {formik.touched.totalPayouts && formik.errors.totalPayouts && (
                                        <p className="text-red-500 text-sm mt-1">{formik.errors.totalPayouts}</p>
                                    )}
                                </div>

                                {/* Scripts Card */}
                                <div className="space-y-4">
                                    <label className="text-lg font-bold text-gray-900 block">Scripts (optional)</label>
                                    <div className="bg-[#F9FAFB] rounded-3xl p-8">
                                        <h3 className="font-bold mb-6">Current Scripts</h3>
                                        <div className="space-y-5 mb-8">
                                            {formik.values.scriptsData.hook && (
                                                <div>
                                                    <div className="flex items-center gap-2 font-bold text-sm mb-1">
                                                        <div className="w-2 h-2 rounded bg-black"></div> Hook
                                                    </div>
                                                    <p className="text-xs text-gray-500 pl-4">{formik.values.scriptsData.hook}</p>
                                                </div>
                                            )}
                                            {formik.values.scriptsData.product && (
                                                <div>
                                                    <div className="flex items-center gap-2 font-bold text-sm mb-1">
                                                        <div className="w-2 h-2 rounded bg-black"></div> Product
                                                    </div>
                                                    <p className="text-xs text-gray-500 pl-4">{formik.values.scriptsData.product}</p>
                                                </div>
                                            )}
                                            {formik.values.scriptsData.cta && (
                                                <div>
                                                    <div className="flex items-center gap-2 font-bold text-sm mb-1">
                                                        <div className="w-2 h-2 rounded bg-black"></div> CTA
                                                    </div>
                                                    <p className="text-xs text-gray-500 pl-4">{formik.values.scriptsData.cta}</p>
                                                </div>
                                            )}
                                            {formik.values.scriptsData.custom.map((script: any, index: number) => (
                                                <div key={index}>
                                                    <div className="flex items-center gap-2 font-bold text-sm mb-1">
                                                        <div className="w-2 h-2 rounded bg-black"></div> {script.type}
                                                    </div>
                                                    <p className="text-xs text-gray-500 pl-4">{script.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            type="button"
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
                                {/* Payout Threshold Card */}
                                <div className="space-y-4">
                                    <label className="text-lg font-bold text-gray-900 block w-fit relative">
                                        Payout Threshold
                                        <span className="text-red-500 absolute -top-1 -right-3 text-lg leading-none">*</span>
                                    </label>
                                    <div className="bg-[#F9FAFB] rounded-3xl p-8">
                                        <h3 className="font-bold mb-6">Current Threshold</h3>
                                        <div className="space-y-3 mb-8">
                                            {formik.values.thresholdData.length > 0 ? formik.values.thresholdData.map((t, i) => (
                                                t.views && t.amount ? (
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
                                                ) : null
                                            )) : <p className="text-sm text-gray-400">No thresholds set</p>}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full bg-white hover:bg-gray-50"
                                            onClick={() => setShowThresholdModal(true)}
                                        >
                                            Update Threshold
                                        </Button>
                                    </div>
                                </div>

                                {/* Requirements Card */}
                                <div className="space-y-4">
                                    <label className="text-lg font-bold text-gray-900 block w-fit relative">
                                        Requirements
                                        <span className="text-red-500 absolute -top-1 -right-3 text-lg leading-none">*</span>
                                    </label>
                                    <div className="bg-[#F9FAFB] rounded-3xl p-8">
                                        <h3 className="font-bold mb-6">Current Requirements</h3>
                                        <div className="space-y-4 mb-8">
                                            {formik.values.reqData.noAi && (
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle className="w-4 h-4 text-black" />
                                                    <span className="text-sm font-medium text-gray-900">No AI generated</span>
                                                </div>
                                            )}
                                            {formik.values.reqData.followScript && (
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle className="w-4 h-4 text-black" />
                                                    <span className="text-sm font-medium text-gray-900">Follow Script</span>
                                                </div>
                                            )}
                                            {formik.values.reqData.language && (
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle className="w-4 h-4 text-black" />
                                                    <span className="text-sm font-medium text-gray-900">Speak {formik.values.reqData.language}</span>
                                                </div>
                                            )}
                                            {formik.values.reqData.location && (
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle className="w-4 h-4 text-black" />
                                                    <span className="text-sm font-medium text-gray-900">Creator from {formik.values.reqData.location}</span>
                                                </div>
                                            )}
                                            {formik.values.reqData.custom.map((req: string, index: number) => (
                                                <div key={index} className="flex items-center gap-3">
                                                    <CheckCircle className="w-4 h-4 text-black" />
                                                    <span className="text-sm font-medium text-gray-900">{req}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full bg-white hover:bg-gray-50"
                                            onClick={() => setShowRequirementsModal(true)}
                                        >
                                            Update Requirements
                                        </Button>
                                    </div>
                                </div>

                                {/* Assets */}
                                <div className="space-y-4">
                                    <label className="text-lg font-bold text-gray-900 block">Assets link (optional)</label>
                                    <input
                                        type="text"
                                        name="assets"
                                        value={formik.values.assets}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        className="w-full bg-[#F9FAFB] border-none rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-gray-200 transition-all text-gray-600 font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
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
                    initialData={formik.values.thresholdData}
                    initialMaxPayout={formik.values.maxPayout}
                    onClose={() => setShowThresholdModal(false)}
                    onSave={(data, max) => {
                        formik.setFieldValue('thresholdData', data);
                        formik.setFieldValue('maxPayout', max);
                        setShowThresholdModal(false);
                    }}
                />
            )}

            {showRequirementsModal && (
                <RequirementsModal
                    initialData={formik.values.reqData}
                    onClose={() => setShowRequirementsModal(false)}
                    onSave={(data) => {
                        formik.setFieldValue('reqData', data);
                        setShowRequirementsModal(false);
                    }}
                />
            )}

            {showScriptsModal && (
                <ScriptsModal
                    initialData={formik.values.scriptsData}
                    onClose={() => setShowScriptsModal(false)}
                    onSave={(data) => {
                        formik.setFieldValue('scriptsData', data);
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
                    <Button
                        variant="secondary"
                        isLoading={isStatusUpdating}
                        onClick={async () => {
                            if (!campaignId) return;
                            try {
                                setIsStatusUpdating(true);
                                const newStatus = campaign.status === 'active' ? 'paused' : 'active';
                                await updateCampaignStatus({
                                    campaignId: campaignId as Id<"campaigns">,
                                    status: newStatus
                                });
                                addToast({
                                    title: `Campaign ${newStatus === 'active' ? 'resumed' : 'paused'} successfully!`,
                                    color: "success",
                                });
                            } catch (error: any) {
                                console.error("Failed to update status:", error);
                                addToast({
                                    title: "Failed to update status",
                                    description: error.data?.message || error.message,
                                    color: "danger",
                                });
                            } finally {
                                setIsStatusUpdating(false);
                            }
                        }}
                    >
                        {campaign.status === 'paused' ? 'Resume Campaign' : 'Pause Campaign'}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => formik.handleSubmit()}
                        isLoading={formik.isSubmitting}
                        disabled={formik.isSubmitting || !formik.dirty}
                        className={!formik.dirty && !formik.isSubmitting ? "opacity-50 cursor-not-allowed" : ""}
                    >
                        {formik.isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>,
                document.body
            )}

            <UnsavedChangesModal
                isOpen={showUnsavedChangesModal}
                onClose={() => setShowUnsavedChangesModal(false)}
                onConfirm={() => navigate('/campaigns')}
            />
        </div>
    );
}