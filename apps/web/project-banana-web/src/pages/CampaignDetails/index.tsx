import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../../packages/backend/convex/_generated/api';
import type { Id } from '../../../../../../packages/backend/convex/_generated/dataModel';
import { Skeleton } from "@heroui/skeleton";
import { ChevronDown, DollarSign, Eye, Check, ChevronLeft, Wallet, Plus, AlertCircle, Swords, Star, Video, MessageSquare, Mic, Scissors, MonitorPlay, Info, Upload, Building, RotateCcw, Type, Tag, Link as LinkIcon, CheckSquare, FileText, Image as ImageIcon, X, Play } from 'lucide-react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Popover, PopoverTrigger, PopoverContent, Button as HeroButton, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import { PayoutThresholdModal, RequirementsModal, ScriptsModal, parseViews } from '../CreateCampaign';
import type { Threshold, RequirementsData, ScriptsData } from '../CreateCampaign';
import Button from '../../components/ui/Button';
import { CAMPAIGN_CATEGORIES } from '../../lib/campaignCategories';
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

const UnsavedChangesModal = ({ isOpen, onClose, onConfirm, changes = [] }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; changes?: { label: string; icon: any }[] }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl pt-12 px-8 pb-6 max-w-[400px] w-full shadow-2xl animate-fadeIn flex flex-col items-center text-center max-h-[90vh] overflow-y-auto hidden-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">Discard changes?</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-medium mb-6">
                    You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
                </p>

                {changes.length > 0 && (
                    <div className="w-full bg-[#F4F6F8] rounded-xl p-5 mb-6 space-y-5 text-left max-h-[30vh] overflow-y-auto hidden-scrollbar">
                        {changes.map((change, i) => {
                            const Icon = change.icon;
                            return (
                                <div key={i} className="flex items-center gap-4 text-[15px] font-semibold text-gray-700">
                                    <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                                    <span>{change.label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="flex flex-col gap-2 w-full">
                    <Button
                        variant="primary"
                        className="w-full bg-[#FF4D4D] hover:bg-[#FF3333] border-none text-white h-12 rounded-xl text-sm font-bold shadow-none"
                        onClick={onConfirm}
                    >
                        Discard
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full bg-transparent hover:bg-gray-50 text-gray-900 h-10 rounded-xl text-sm font-bold shadow-none"
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

export default function CampaignDetails() {
    const { campaignId } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'about' | 'analytics'>('about');

    const campaign = useQuery(api.campaigns.getCampaign, { campaignId: campaignId as Id<"campaigns"> });
    const business = useQuery(api.businesses.getMyBusiness);
    const updateCampaign = useMutation(api.campaigns.updateCampaign);
    const updateCampaignStatus = useMutation(api.campaigns.updateCampaignStatus);
    const generateCampaignImageUploadUrl = useAction(api.campaigns.generateCampaignImageUploadUrl);
    const generateCampaignImageAccessUrl = useAction(api.campaigns.generateCampaignImageAccessUrl);
    const generateBusinessLogoAccessUrl = useAction(api.businesses.generateLogoAccessUrl);

    // Modals State
    const [showThresholdModal, setShowThresholdModal] = useState(false);
    const [showRequirementsModal, setShowRequirementsModal] = useState(false);
    const [showScriptsModal, setShowScriptsModal] = useState(false);
    const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
    const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
    const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
    const [isEndModalOpen, setIsEndModalOpen] = useState(false);
    const [isStatusUpdating, setIsStatusUpdating] = useState(false); // For pause/resume button loading
    const [isEndingCampaign, setIsEndingCampaign] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(null);
    const [useCompanyLogo, setUseCompanyLogo] = useState(false);

    // Initial Values State for Formik Reinitialization
    const [initialValues, setInitialValues] = useState({
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
    });

    // ---------------------------------------------------------------------------
    // FETCH APPLICATIONS
    // ---------------------------------------------------------------------------
    const applications = useQuery(api.applications.getMyApplicationsByCampaignWithStats,
        campaignId ? { campaignId: campaignId as Id<"campaigns"> } : "skip"

    );
    const hasChangesRequested = applications?.some(app => app.status === 'changes_requested') ?? false;

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
                category: campaign.category || [],
                totalPayouts: campaign.total_budget.toString(),
                assets: campaign.asset_links || "",
                maxPayout: campaign.maximum_payout?.toString() || "",
                thresholdData: thresholds,
                reqData: newReqData,
                scriptsData: newScriptsData
            });

            setUseCompanyLogo(Boolean(campaign.use_company_logo));
        }
    }, [campaign]);

    useEffect(() => {
        const loadCompanyLogo = async () => {
            if (!business) {
                setCompanyLogoPreview(null);
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
        };

        void loadCompanyLogo();
    }, [business, generateBusinessLogoAccessUrl]);

    useEffect(() => {
        const loadCampaignMedia = async () => {
            if (!campaign) {
                setLogoPreview(null);
                setCoverPreview(null);
                return;
            }

            if (campaign.logo_url) {
                setLogoPreview(campaign.logo_url);
            } else if (campaign.logo_s3_key) {
                try {
                    const signedUrl = await generateCampaignImageAccessUrl({ s3Key: campaign.logo_s3_key });
                    setLogoPreview(signedUrl ?? null);
                } catch (error) {
                    console.error("Failed to fetch campaign logo preview:", error);
                    setLogoPreview(null);
                }
            } else {
                setLogoPreview(null);
            }

            if (campaign.cover_photo_url) {
                setCoverPreview(campaign.cover_photo_url);
            } else if (campaign.cover_photo_s3_key) {
                try {
                    const signedUrl = await generateCampaignImageAccessUrl({ s3Key: campaign.cover_photo_s3_key });
                    setCoverPreview(signedUrl ?? null);
                } catch (error) {
                    console.error("Failed to fetch campaign cover preview:", error);
                    setCoverPreview(null);
                }
            } else {
                setCoverPreview(null);
            }
        };

        void loadCampaignMedia();
    }, [campaign, generateCampaignImageAccessUrl]);

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

    const [isIncreaseBudgetModalOpen, setIsIncreaseBudgetModalOpen] = useState(false);

    const submitForm = async (values: typeof initialValues, shouldSetSubmitting = true) => {
        if (!campaignId || !campaign) {
            if (shouldSetSubmitting) {
                formik.setSubmitting(false);
            }
            return;
        }

        const requestedTotalBudget = parseFloat(values.totalPayouts) || 0;
        const currentTotalBudget = campaign.total_budget;

        try {
            const hasCompanyLogo = !!(business?.logo_url || business?.logo_s3_key || companyLogoPreview);
            const shouldUseCompanyLogo = useCompanyLogo && hasCompanyLogo;

            if (shouldUseCompanyLogo && !business) {
                throw new Error("Business profile is not loaded yet");
            }

            let nextLogoS3Key = campaign.logo_s3_key;
            let nextLogoUrl = campaign.logo_url;
            let nextUseCompanyLogo = campaign.use_company_logo;
            let nextCoverS3Key = campaign.cover_photo_s3_key;
            let nextCoverUrl = campaign.cover_photo_url;

            if (logoFile && !shouldUseCompanyLogo) {
                nextLogoS3Key = await uploadCampaignImage(logoFile, "logo");
                nextLogoUrl = undefined;
                nextUseCompanyLogo = false;
            } else if (shouldUseCompanyLogo) {
                nextLogoS3Key = business?.logo_s3_key;
                nextLogoUrl = business?.logo_url;
                nextUseCompanyLogo = true;
            } else if (!shouldUseCompanyLogo && campaign.use_company_logo) {
                nextUseCompanyLogo = false;
            }

            if (coverFile) {
                nextCoverS3Key = await uploadCampaignImage(coverFile, "cover");
                nextCoverUrl = undefined;
            }

            await updateCampaign({
                campaignId: campaignId as Id<"campaigns">,
                name: values.name,
                logo_url: nextLogoUrl,
                logo_s3_key: nextLogoS3Key,
                use_company_logo: nextUseCompanyLogo,
                cover_photo_url: nextCoverUrl,
                cover_photo_s3_key: nextCoverS3Key,
                category: values.category,
                total_budget: requestedTotalBudget,
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

            setLogoFile(null);
            setCoverFile(null);

            const additionalCharge = requestedTotalBudget - currentTotalBudget;
            addToast(
                additionalCharge > 0
                    ? {
                        title: "Campaign updated successfully!",
                        description: `Charged Rm ${additionalCharge.toFixed(2)} from your credits.`,
                        color: "success",
                    }
                    : {
                        title: "Campaign updated successfully!",
                        color: "success",
                    }
            );
            setIsIncreaseBudgetModalOpen(false); // Close modal on success

        } catch (error: any) {
            console.error("Failed to update campaign:", error);
            addToast({
                title: "Failed to update campaign. Please try again.",
                description: error.data?.message || error.message,
                color: "danger",
            });
        } finally {
            if (shouldSetSubmitting) {
                formik.setSubmitting(false);
            }
        }
    };

    const formik = useFormik({
        initialValues,
        enableReinitialize: true,
        validationSchema,
        onSubmit: async (values, { setSubmitting, setFieldError, setFieldTouched }) => {
            if (!campaignId || !campaign) {
                setSubmitting(false);
                return;
            }

            const requestedTotalBudget = parseFloat(values.totalPayouts) || 0;
            const currentTotalBudget = campaign.total_budget;
            const budgetIncrease = requestedTotalBudget > currentTotalBudget ? requestedTotalBudget - currentTotalBudget : 0;
            const estimatedRemainingCredits = (business?.credit_balance ?? 0) - budgetIncrease;

            if (requestedTotalBudget < currentTotalBudget) {
                setFieldTouched("totalPayouts", true, false);
                setFieldError(
                    "totalPayouts",
                    `You cannot go below Rm ${currentTotalBudget.toFixed(2)}`
                );
                setSubmitting(false);
                return;
            }

            if (budgetIncrease > 0 && estimatedRemainingCredits < 0) {
                setFieldTouched("totalPayouts", true, false);
                setFieldError(
                    "totalPayouts",
                    "Insufficient credits to increase budget."
                );
                setSubmitting(false);
                return;
            }

            if (requestedTotalBudget > currentTotalBudget) {
                setSubmitting(false);
                setIsIncreaseBudgetModalOpen(true);
                return;
            }

            await submitForm(values);
        }
    });

    // Analytics State
    const [analyticsMetric, setAnalyticsMetric] = useState<'Views' | 'Likes' | 'Comments' | 'Shares'>('Views');
    const hasCompanyLogo = !!(business?.logo_url || business?.logo_s3_key || companyLogoPreview);
    const displayedLogoPreview = useCompanyLogo ? (companyLogoPreview ?? logoPreview) : logoPreview;
    const hasMediaChanges = !!logoFile || !!coverFile || (campaign ? useCompanyLogo !== Boolean(campaign.use_company_logo) : false);

    const unsavedChangesList = useMemo(() => {
        const changes: { label: string; icon: any }[] = [];
        if (formik.values.name !== initialValues.name) changes.push({ label: 'Campaign Name', icon: Type });
        if (JSON.stringify(formik.values.category) !== JSON.stringify(initialValues.category)) changes.push({ label: 'Category', icon: Tag });

        // Use loose equality or string casting to avoid number/string mismatch issues
        if (formik.values.totalPayouts.toString() !== initialValues.totalPayouts.toString()) changes.push({ label: 'Total Payouts', icon: DollarSign });
        if (formik.values.assets !== initialValues.assets) changes.push({ label: 'Assets Link', icon: LinkIcon });
        if (formik.values.maxPayout.toString() !== initialValues.maxPayout.toString()) changes.push({ label: 'Max Payout', icon: DollarSign });

        if (JSON.stringify(formik.values.thresholdData) !== JSON.stringify(initialValues.thresholdData)) changes.push({ label: 'Payout Thresholds', icon: DollarSign });
        if (JSON.stringify(formik.values.reqData) !== JSON.stringify(initialValues.reqData)) changes.push({ label: 'Requirements', icon: CheckSquare });
        if (JSON.stringify(formik.values.scriptsData) !== JSON.stringify(initialValues.scriptsData)) changes.push({ label: 'Scripts', icon: FileText });

        if (logoFile) changes.push({ label: 'Campaign Logo', icon: ImageIcon });
        if (coverFile) changes.push({ label: 'Cover Photo', icon: ImageIcon });
        if (campaign && useCompanyLogo !== Boolean(campaign.use_company_logo)) changes.push({ label: 'Company Logo Preference', icon: Building });

        return changes;
    }, [formik.values, initialValues, logoFile, coverFile, useCompanyLogo, campaign]);

    const handleBack = () => {
        if (unsavedChangesList.length > 0) {
            setShowUnsavedChangesModal(true);
        } else {
            navigate('/campaigns');
        }
    };

    const requestedTotalBudget = parseFloat(formik.values.totalPayouts) || 0;
    const currentTotalBudget = campaign?.total_budget ?? 0;
    const budgetIncrease = requestedTotalBudget > currentTotalBudget ? requestedTotalBudget - currentTotalBudget : 0;
    const estimatedRemainingCredits = (business?.credit_balance ?? 0) - budgetIncrease;
    const isIncreaseBudgetDisabled = budgetIncrease > 0 && estimatedRemainingCredits < 0;

    const handleResetChanges = () => {
        formik.resetForm();
        setLogoFile(null);
        setCoverFile(null);
        if (campaign) {
            setUseCompanyLogo(Boolean(campaign.use_company_logo));
        }
    };

    if (!campaign) {
        return <CampaignDetailsSkeleton />;
    }

    const parsedTotalPayouts = parseFloat(formik.values.totalPayouts);
    const proposedTotalPayouts = Number.isFinite(parsedTotalPayouts) ? parsedTotalPayouts : 0;
    const isLowerThanCurrentAmount = formik.values.totalPayouts !== "" && proposedTotalPayouts < campaign.total_budget;

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
                <div className="flex items-start md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
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
                    {campaign.status !== 'completed' && (
                        <div className="flex items-center gap-3">
                            <Button
                                variant="secondary"
                                isLoading={isStatusUpdating}
                                disabled={isEndingCampaign}
                                onClick={async () => {
                                    if (!campaignId) return;
                                    if (campaign.status === 'active') {
                                        setIsPauseModalOpen(true);
                                    } else {
                                        setIsResumeModalOpen(true);
                                    }
                                }}
                            >
                                {campaign.status === 'paused' ? 'Resume Campaign' : 'Pause Campaign'}
                            </Button>
                            <Button
                                variant="danger"
                                isLoading={isEndingCampaign}
                                disabled={isStatusUpdating}
                                onClick={() => {
                                    if (!campaignId) return;
                                    setIsEndModalOpen(true);
                                }}
                            >
                                End Campaign
                            </Button>
                        </div>
                    )}
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
                        <div className="flex flex-col gap-8 flex-1 w-full animate-fadeIn">
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
                                            min={campaign.total_budget}
                                            className={`w-full bg-[#F4F6F8] rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all ${(formik.touched.totalPayouts && formik.errors.totalPayouts) || isLowerThanCurrentAmount || isIncreaseBudgetDisabled ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
                                        />
                                    </div>
                                    {isLowerThanCurrentAmount ? (
                                        <p className="text-red-500 text-sm mt-1 font-medium">You cannot go below Rm {campaign.total_budget}</p>
                                    ) : isIncreaseBudgetDisabled ? (
                                        <p className="text-red-500 text-sm mt-1 font-medium">Insufficient credits to increase budget.</p>
                                    ) : formik.touched.totalPayouts && formik.errors.totalPayouts ? (
                                        <p className="text-red-500 text-sm mt-1 font-medium">{formik.errors.totalPayouts as string}</p>
                                    ) : null}
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
                                                        ? formik.values.category.filter((c: string) => c !== cat.label)
                                                        : [...formik.values.category, cat.label];
                                                    formik.setFieldValue('category', newCategories);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        const newCategories = isSelected
                                                            ? formik.values.category.filter((c: string) => c !== cat.label)
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
                                                onClick={() => setShowThresholdModal(true)}
                                                className="w-full bg-white rounded-xl py-3 font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors text-gray-900"
                                            >
                                                Update Threshold
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setShowThresholdModal(true)}
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
                                                onClick={() => setShowRequirementsModal(true)}
                                                className="w-full bg-white rounded-xl py-3 font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors text-gray-900"
                                            >
                                                Update Requirements
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setShowRequirementsModal(true)}
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
                                                onClick={() => setShowScriptsModal(true)}
                                                className="w-full bg-white rounded-xl py-3 font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors text-gray-900"
                                            >
                                                Update Scripts
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setShowScriptsModal(true)}
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
                                    <label className="font-semibold text-gray-900 block">Campaign logo</label>
                                    <div className="flex justify-between mb-4 ">
                                        <p className="text-sm text-gray-500">Campaign icon at front page.</p>
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
                                                    {logoPreview ? "Change logo" : "Click to upload logo"}
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
                                        <p className="text-sm text-gray-500">Cover image for your campaign background.</p>
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
            {
                showThresholdModal && (
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
                )
            }

            {
                showRequirementsModal && (
                    <RequirementsModal
                        initialData={formik.values.reqData}
                        onClose={() => setShowRequirementsModal(false)}
                        onSave={(data) => {
                            formik.setFieldValue('reqData', data);
                            setShowRequirementsModal(false);
                        }}
                    />
                )
            }

            {
                showScriptsModal && (
                    <ScriptsModal
                        initialData={formik.values.scriptsData}
                        onClose={() => setShowScriptsModal(false)}
                        onSave={(data) => {
                            formik.setFieldValue('scriptsData', data);
                            setShowScriptsModal(false);
                        }}
                    />
                )
            }

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
            {
                activeTab === 'about' && createPortal(
                    <div className="fixed bottom-8 right-8 flex gap-4 z-50">
                        {(formik.dirty || hasMediaChanges) && (
                            <Button
                                variant="ghost"
                                onClick={handleResetChanges}
                                disabled={formik.isSubmitting || isStatusUpdating || isEndingCampaign}
                                className={`bg-white px-4 text-gray-900 border border-gray-200 hover:bg-gray-50 flex items-center gap-2 ${(formik.isSubmitting || isStatusUpdating || isEndingCampaign) ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reset Changes
                            </Button>
                        )}
                        <Button
                            variant="primary"
                            onClick={() => formik.handleSubmit()}
                            isLoading={formik.isSubmitting}
                            disabled={formik.isSubmitting || (!formik.dirty && !hasMediaChanges) || isStatusUpdating || isEndingCampaign}
                            className={((!formik.dirty && !hasMediaChanges) || isStatusUpdating || isEndingCampaign) && !formik.isSubmitting ? "opacity-50 cursor-not-allowed" : ""}
                        >
                            {formik.isSubmitting ? 'Saving...' : `Save Changes${unsavedChangesList.length > 0 ? ` (${unsavedChangesList.length})` : ''}`}
                        </Button>
                    </div>,
                    document.body
                )
            }

            <UnsavedChangesModal
                isOpen={showUnsavedChangesModal}
                onClose={() => setShowUnsavedChangesModal(false)}
                onConfirm={() => navigate('/campaigns')}
                changes={unsavedChangesList}
            />

            <Modal
                isOpen={isIncreaseBudgetModalOpen}
                onOpenChange={setIsIncreaseBudgetModalOpen}
                size="5xl"
                scrollBehavior="inside"
                isDismissable={!isStatusUpdating && !formik.isSubmitting}
                hideCloseButton={isStatusUpdating || formik.isSubmitting}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1 px-8 pt-8">
                                <span className="text-xl font-bold text-gray-900">Increase Budget Summary</span>
                                <span className="text-sm font-normal text-gray-500">
                                    You are increasing the total payout budget for your campaign.
                                </span>
                            </ModalHeader>
                            <ModalBody className="p-8 mb-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                                    <div className="flex flex-col items-start w-full lg:pr-8 pt-2">
                                        <h3 className="text-xl mb-4 font-semibold text-gray-900 tracking-tight">{formik.values.name || 'Untitled Campaign'}</h3>

                                        <div className="space-y-3 text-[15px] w-full">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-500">Current Budget</span>
                                                <span className="font-semibold text-gray-900">RM {currentTotalBudget.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-500">New Total Budget</span>
                                                <span className="font-[800] text-gray-900">RM {requestedTotalBudget.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-2 border-t border-gray-100 pt-3">
                                                <span className="text-gray-500">Maximum Payout for 1 User</span>
                                                <span className="font-semibold text-gray-900">RM {parseFloat(formik.values.maxPayout).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="text-xl font-semibold text-gray-900">Cost Summary</div>
                                        <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
                                            <div className="space-y-6">
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between text-base">
                                                        <span className="text-gray-500">Budget Increase</span>
                                                        <span className="font-semibold text-gray-900">RM {budgetIncrease.toFixed(2)}</span>
                                                    </div>
                                                </div>

                                                <div className="pt-6 border-t border-gray-100">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-lg font-bold text-gray-900">Total credits costs</span>
                                                        <span className="text-2xl font-bold text-gray-900">RM {budgetIncrease.toFixed(2)}</span>
                                                    </div>
                                                </div>

                                                <div className="pt-6 border-t border-gray-100">
                                                    <div className="flex items-center justify-between text-base">
                                                        <span className="text-gray-500">Credits remaining after update</span>
                                                        <span className={`font-semibold ${estimatedRemainingCredits < 0 ? "text-red-500" : "text-gray-900"}`}>
                                                            RM {estimatedRemainingCredits.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    {estimatedRemainingCredits < 0 && (
                                                        <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 mt-2">
                                                            You have insufficient credits. Please top up your balance.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="px-8 pb-8 pt-0">
                                <div className="flex justify-between w-full items-center">
                                    <div className="text-sm font-medium">
                                        <span className="text-gray-500 mr-2">Current balance:</span>
                                        <span className="text-gray-900 font-bold">Rm {business?.credit_balance?.toFixed(2) ?? '0.00'}</span>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            variant="ghost"
                                            onClick={onClose}
                                            disabled={isStatusUpdating || formik.isSubmitting}
                                            className="px-6 py-3 font-semibold text-gray-600 hover:bg-gray-100 bg-white border border-gray-200"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            isLoading={isStatusUpdating || formik.isSubmitting}
                                            onClick={async () => {
                                                formik.setSubmitting(true);
                                                await submitForm(formik.values, false);
                                                formik.setSubmitting(false);
                                            }}
                                            disabled={isIncreaseBudgetDisabled || isStatusUpdating || formik.isSubmitting}
                                            className={`px-8 py-3 font-bold ${(isIncreaseBudgetDisabled || isStatusUpdating || formik.isSubmitting) && !(isStatusUpdating || formik.isSubmitting) ? "opacity-50 cursor-not-allowed" : ""}`}
                                        >
                                            {isStatusUpdating || formik.isSubmitting ? 'Updating...' : 'Confirm & Update'}
                                        </Button>
                                    </div>
                                </div>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Pause Campaign Modal */}
            <Modal
                isOpen={isPauseModalOpen}
                onOpenChange={setIsPauseModalOpen}
                placement="center"
                hideCloseButton
                classNames={{
                    base: "m-0 rounded-3xl max-w-xl w-[90vw] md:w-full",
                    body: "p-0",
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <div className="flex flex-col items-center pt-10 pb-8 px-12 text-center bg-white rounded-xl">
                            <h3 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Pause Campaign</h3>
                            <p className="text-gray-500 text-lg leading-relaxed font-medium mb-8 px-2 max-w-[480px]">
                                Temporarily stop new applications while allowing existing creators to complete their work.
                            </p>

                            <div className="w-full bg-[#F4F6F8] rounded-2xl p-6 mb-8 space-y-7 text-left max-h-[45vh] overflow-y-auto hidden-scrollbar">
                                <div className="flex gap-4">
                                    <X className="w-5 h-5 text-gray-400 shrink-0 mt-1" />
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-base font-bold text-gray-700 leading-tight">Submissions Paused</span>
                                        <p className="text-sm font-semibold text-gray-400 leading-relaxed">
                                            New creators won't be able to discover or apply to this campaign.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Check className="w-5 h-5 text-gray-400 shrink-0 mt-1" />
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-base font-bold text-gray-700 leading-tight">Finalize Ongoing Work</span>
                                        <p className="text-sm font-semibold text-gray-400 leading-relaxed">
                                            Creators already in progress can still submit their work and earn payouts.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 w-full">
                                <Button
                                    className="w-full bg-[#1C1C1C] hover:bg-[#2C2C2C] border-none text-white h-12 rounded-xl text-sm font-bold shadow-none"
                                    onClick={async () => {
                                        try {
                                            setIsStatusUpdating(true);
                                            await updateCampaignStatus({
                                                campaignId: campaignId as Id<"campaigns">,
                                                status: 'paused'
                                            });
                                            addToast({
                                                title: `Campaign paused successfully!`,
                                                color: "success",
                                            });
                                            onClose();
                                        } catch (error: any) {
                                            console.error("Failed to pause campaign:", error);
                                            addToast({
                                                title: "Failed to pause campaign",
                                                description: error.data?.message || error.message,
                                                color: "danger",
                                            });
                                        } finally {
                                            setIsStatusUpdating(false);
                                        }
                                    }}
                                    isLoading={isStatusUpdating}
                                >
                                    Pause Campaign
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full bg-transparent hover:bg-gray-50 text-gray-900 h-10 rounded-xl text-sm font-bold shadow-none"
                                    onClick={onClose}
                                    disabled={isStatusUpdating}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </ModalContent>
            </Modal>

            {/* End Campaign Modal */}
            <Modal
                isOpen={isEndModalOpen}
                onOpenChange={setIsEndModalOpen}
                placement="center"
                hideCloseButton
                classNames={{
                    base: "m-0 rounded-3xl max-w-xl w-[90vw] md:w-full",
                    body: "p-0",
                }}
            >
                <ModalContent>
                    {(onClose) => {
                        const isNotPaused = campaign?.status !== 'paused';
                        const hasPendingApprovals = (campaign?.pending_approvals ?? 0) > 0;
                        const isBlocked = isNotPaused || hasPendingApprovals || hasChangesRequested;

                        return (
                            <div className="flex flex-col items-center pt-10 pb-8 px-12 text-center bg-white rounded-xl">
                                <h3 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">End Campaign</h3>

                                {isBlocked ? (
                                    <div className="mb-6 w-full pt-2">
                                        {isNotPaused ? (
                                            <div className="rounded-xl border border-[#FFF3C2] bg-[#FFFBEA] p-6">
                                                <p className="text-lg text-[#B45309] font-semibold leading-relaxed">
                                                    You need to pause the campaign first before ending it early, since your campaign hasn't been fully claimed.
                                                </p>
                                            </div>
                                        ) : hasPendingApprovals ? (
                                            <div className="rounded-xl border border-red-100 bg-red-50 p-6">
                                                <p className="text-lg text-red-600 font-semibold leading-relaxed">
                                                    There are pending reviews. You must finish reviewing all submissions before you can end the campaign.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="rounded-xl border border-red-100 bg-red-50 p-6">
                                                <p className="text-lg text-red-600 font-semibold leading-relaxed">
                                                    There are applications with requested changes. You must resolve them before you can end the campaign.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-gray-500 text-lg leading-relaxed font-medium mb-8 px-2 max-w-[480px]">
                                            Permanently close the campaign and settle all final accounts.
                                        </p>

                                        <div className="w-full bg-[#F4F6F8] rounded-2xl p-8 mb-8 space-y-8 text-left max-h-[50vh] overflow-y-auto hidden-scrollbar">
                                            <div className="flex gap-5">
                                                <RotateCcw className="w-6 h-6 text-gray-400 shrink-0 mt-1" />
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-lg font-bold text-gray-700 leading-tight">7-Day Verification</span>
                                                    <p className="text-[15px] font-semibold text-gray-400 leading-relaxed">
                                                        Performance tracking continues for 7 days to ensure creators receive accurate view-based payouts.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-5">
                                                <Wallet className="w-6 h-6 text-gray-400 shrink-0 mt-1" />
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-lg font-bold text-gray-700 leading-tight">Budget Settlement</span>
                                                    <p className="text-[15px] font-semibold text-gray-400 leading-relaxed">
                                                        Any remaining funds will be safely returned to your wallet once the verification period concludes.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="flex flex-col gap-2 w-full">
                                    {!isBlocked && (
                                        <Button
                                            className="w-full bg-[#E53935] hover:bg-[#D32F2F] border-none text-white h-12 rounded-xl text-sm font-bold shadow-none"
                                            onClick={async () => {
                                                try {
                                                    setIsEndingCampaign(true);
                                                    await updateCampaignStatus({
                                                        campaignId: campaignId as Id<"campaigns">,
                                                        status: 'completed'
                                                    });
                                                    addToast({
                                                        title: "Campaign ended successfully!",
                                                        color: "success",
                                                    });
                                                    onClose();
                                                } catch (error: any) {
                                                    console.error("Failed to end campaign:", error);
                                                    addToast({
                                                        title: "Failed to end campaign",
                                                        description: error.data?.message || error.message,
                                                        color: "danger",
                                                    });
                                                } finally {
                                                    setIsEndingCampaign(false);
                                                }
                                            }}
                                            isLoading={isEndingCampaign}
                                        >
                                            End Campaign
                                        </Button>
                                    )}
                                    {isNotPaused ? (
                                        <>
                                            <Button
                                                className="w-full bg-[#1C1C1C] hover:bg-[#2C2C2C] border-none text-white h-12 rounded-xl text-sm font-bold shadow-none"
                                                onClick={() => {
                                                    onClose();
                                                    setIsPauseModalOpen(true);
                                                }}
                                            >
                                                Pause Campaign
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="w-full bg-transparent hover:bg-gray-50 text-gray-900 h-10 rounded-xl text-sm font-bold shadow-none"
                                                onClick={onClose}
                                            >
                                                Cancel
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            className="w-full bg-transparent hover:bg-gray-50 text-gray-900 h-10 rounded-xl text-sm font-bold shadow-none"
                                            onClick={onClose}
                                            disabled={isEndingCampaign}
                                        >
                                            {isBlocked ? 'Okay' : 'Cancel'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    }}
                </ModalContent>
            </Modal>

            {/* Resume Campaign Modal */}
            <Modal
                isOpen={isResumeModalOpen}
                onOpenChange={setIsResumeModalOpen}
                placement="center"
                hideCloseButton
                classNames={{
                    base: "m-0 rounded-3xl max-w-xl w-[90vw] md:w-full",
                    body: "p-0",
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <div className="flex flex-col items-center pt-10 pb-8 px-12 text-center bg-white rounded-xl">
                            <h3 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Resume Campaign</h3>
                            <p className="text-gray-500 text-lg leading-relaxed font-medium mb-8 px-2 max-w-[480px]">
                                Make your campaign visible again and start accepting new applications.
                            </p>

                            <div className="w-full bg-[#F4F6F8] rounded-2xl p-8 mb-8 space-y-8 text-left max-h-[50vh] overflow-y-auto hidden-scrollbar">
                                <div className="flex gap-5">
                                    <Plus className="w-6 h-6 text-gray-400 shrink-0 mt-1" />
                                    <div className="flex flex-col gap-2">
                                        <span className="text-lg font-bold text-gray-700 leading-tight">Open Applications</span>
                                        <p className="text-[15px] font-semibold text-gray-400 leading-relaxed">
                                            Creators will be able to discover your campaign and submit new entries immediately.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-5">
                                    <DollarSign className="w-6 h-6 text-gray-400 shrink-0 mt-1" />
                                    <div className="flex flex-col gap-2">
                                        <span className="text-lg font-bold text-gray-700 leading-tight">Project Continuity</span>
                                        <p className="text-[15px] font-semibold text-gray-400 leading-relaxed">
                                            Management continues seamlessly using your existing budget and payout settings.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 w-full">
                                <Button
                                    className="w-full bg-[#1C1C1C] hover:bg-[#2C2C2C] border-none text-white h-12 rounded-xl text-sm font-bold shadow-none"
                                    onClick={async () => {
                                        try {
                                            setIsStatusUpdating(true);
                                            await updateCampaignStatus({
                                                campaignId: campaignId as Id<"campaigns">,
                                                status: 'active'
                                            });
                                            addToast({
                                                title: `Campaign resumed successfully!`,
                                                color: "success",
                                            });
                                            onClose();
                                        } catch (error: any) {
                                            console.error("Failed to resume campaign:", error);
                                            addToast({
                                                title: "Failed to resume campaign",
                                                description: error.data?.message || error.message,
                                                color: "danger",
                                            });
                                        } finally {
                                            setIsStatusUpdating(false);
                                        }
                                    }}
                                    isLoading={isStatusUpdating}
                                >
                                    Resume Campaign
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full bg-transparent hover:bg-gray-50 text-gray-900 h-10 rounded-xl text-sm font-bold shadow-none"
                                    onClick={onClose}
                                    disabled={isStatusUpdating}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </ModalContent>
            </Modal>
        </div >
    );
}
