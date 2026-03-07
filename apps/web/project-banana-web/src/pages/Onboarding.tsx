import { useState, useEffect } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { Upload, Loader2, ArrowRight, Sparkles, Check } from 'lucide-react';
import PlanSelector from '../components/PlanSelector';
import type { PlanType } from '../components/PlanSelector';
import { getStripePriceId } from '../lib/stripe-prices';

export default function Onboarding() {
    // Check if user has business and subscription to determine initial step
    const business = useQuery(api.businesses.getMyBusiness);
    const subscription = useQuery(api.stripe.getMySubscription);

    // Steps: 0 = Intro, 1 = Business Profile, 2 = Plan Selection
    const [currentStep, setCurrentStep] = useState<0 | 1 | 2>(0);

    // Sync step with business/subscription state
    useEffect(() => {
        if (business && !subscription?.subscriptionId) {
            // Business exists but no subscription -> Go to Plan Selection
            setCurrentStep(2);
        }
    }, [business, subscription]);

    // Business Profile State
    const [name, setName] = useState('');
    const [industry, setIndustry] = useState('E-commerce');
    const [customIndustry, setCustomIndustry] = useState('');
    const [size, setSize] = useState('1-10');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    // Plan Selection State
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);

    const createBusiness = useAction(api.businesses.createBusiness);
    const generateUploadUrl = useAction(api.businesses.generateLogoUploadUrl);
    const createSubscriptionCheckout = useAction(api.stripe.createSubscriptionCheckout);
    const industryOptions = ['E-commerce', 'SaaS', 'Agency', 'Health', 'Education', 'Fintech', 'Food & Beverage', 'Other'];
    const sizeOptions = ['1-10', '11-50', '51-200', '201-500', '500+'];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleIntroNext = () => {
        localStorage.setItem('has_seen_intro', 'true');
        setCurrentStep(1);
    };

    const handleBusinessSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsCreating(true);

        try {
            let r2Key = undefined;

            if (file) {
                // 1. Get Upload URL
                const { uploadUrl, r2Key: key } = await generateUploadUrl({ contentType: file.type });

                // 2. Upload File
                const result = await fetch(uploadUrl, {
                    method: "PUT",
                    body: file,
                    headers: { "Content-Type": file.type },
                });

                if (!result.ok) {
                    throw new Error("Failed to upload image");
                }
                r2Key = key;
            }

            // 3. Create Business
            await createBusiness({
                name,
                industry: industry === 'Other' ? customIndustry || 'Other' : industry,
                size,
                logo_r2_key: r2Key,
            });

            // Show checking animation/loading state
            // Wait a bit to show the loading state (UX)
            setTimeout(() => {
                setCurrentStep(2);
                setIsCreating(false);
            }, 2000);

        } catch (err) {
            console.error(err);
            setError('Something went wrong. Please try again.');
            setIsCreating(false);
        }
    };

    // Keep handlePlanSelection from OnboardingModal logic
    // But no need to clear localStorage key since we're using database state mostly
    // Will update logic later if needed

    // ... Copying handlePlanSelection logic ...
    const handlePlanSelection = async (planType: PlanType) => {
        setSelectedPlan(planType);
        setIsCreatingCheckout(true);

        try {
            const priceId = getStripePriceId(planType, billingCycle);

            if (!priceId) {
                // If there's no price ID (like the Free plan), we just bypass Stripe checkout for now
                // and skip to the main dashboard. The backend will treat users without
                // a Stripe subscription as Free by default.
                window.location.href = '/';
                return;
            }
            const result = await createSubscriptionCheckout({
                priceId,
                planType,
                billingCycle,
            });

            if (result.url) {
                window.location.href = result.url;
            } else {
                throw new Error("No checkout URL returned");
            }
        } catch (err) {
            console.error('Failed to create checkout:', err);
            setError('Failed to start subscription checkout. Please try again.');
            setIsCreatingCheckout(false);
            setSelectedPlan(null);
        }
    };



    return (
        <div className="min-h-screen bg-white font-sans flex text-gray-900 w-full">
            {/* Intro Step */}
            {currentStep === 0 && (
                <div className="w-full min-h-screen flex flex-col items-center justify-center animate-in fade-in duration-500 px-6 py-12 bg-white">
                    <div className="max-w-2xl mx-auto w-full flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center border border-gray-100 mb-8 shadow-sm">
                            <Sparkles className="w-10 h-10 text-gray-900" />
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-medium tracking-tight text-gray-900 leading-tight mb-6 mt-4">
                            Thank you for choosing Lumina
                        </h1>
                        <p className="text-xl text-gray-500 mb-12">
                            We're excited to have you here. Let's get your business profile set up in just a few steps.
                        </p>

                        <button
                            onClick={handleIntroNext}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-black active:scale-95 shadow-sm"
                        >
                            Get Started
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </button>
                    </div>
                </div>
            )}

            {/* Business Profile Step */}
            {currentStep === 1 && (
                <div className="w-full min-h-screen flex items-center justify-center animate-in fade-in duration-500 bg-white px-6 py-12">
                    <div className="w-full max-w-2xl mx-auto">
                        <div className="mb-12 text-center">
                            <h2 className="text-3xl lg:text-4xl font-medium tracking-tight text-gray-900 mb-4">Tell us about your business</h2>
                            <p className="text-xl text-gray-500">We'll customize your experience based on your needs.</p>
                        </div>

                        <form onSubmit={handleBusinessSubmit} className="space-y-8 max-w-xl mx-auto">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">Business Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Acme Corp"
                                        className="w-full bg-white border border-gray-200 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 rounded-xl px-4 py-3.5 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 shadow-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-3">Industry</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {industryOptions.map((option) => {
                                                const selected = industry === option;
                                                return (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        aria-pressed={selected}
                                                        onClick={() => setIndustry(option)}
                                                        className={`group rounded-xl border px-3 py-3 text-sm font-semibold transition-all text-left flex items-center justify-between gap-2 border-gray-200 hover:border-gray-300 bg-white ${selected
                                                            ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                                                            : 'text-gray-700'
                                                            }`}
                                                    >
                                                        <span className="leading-tight">{option}</span>
                                                        {selected && <Check className="w-4 h-4 shrink-0 text-gray-900" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {industry === 'Other' && (
                                            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <input
                                                    type="text"
                                                    required
                                                    value={customIndustry}
                                                    onChange={(e) => setCustomIndustry(e.target.value)}
                                                    placeholder="Please specify your industry"
                                                    className="w-full bg-white border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 rounded-xl px-4 py-3.5 outline-none transition-all text-gray-900 placeholder:text-gray-400 text-sm font-medium shadow-sm"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-3">Size</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {sizeOptions.map((option) => {
                                                const selected = size === option;
                                                return (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        aria-pressed={selected}
                                                        onClick={() => setSize(option)}
                                                        className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all text-left flex items-center justify-between gap-2 border-gray-200 hover:border-gray-300 bg-white ${selected
                                                            ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                                                            : 'text-gray-700'
                                                            }`}
                                                    >
                                                        <span>{option}</span>
                                                        {selected && <Check className="w-4 h-4 shrink-0 text-gray-900" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-3">Logo (Optional)</label>
                                    <div className="flex items-center gap-5">
                                        <div className="w-20 h-20 rounded-[1.25rem] bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-gray-300 transition-colors shrink-0">
                                            {previewUrl ? (
                                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <Upload className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                        </div>
                                        <div className="text-sm text-gray-500 space-y-1">
                                            <p className="font-semibold text-gray-900">Upload your logo</p>
                                            <p>Recommended size: 400x400px</p>
                                            <p>Max size: 2MB</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-600 text-sm font-medium bg-red-50 p-4 rounded-xl border border-red-100">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isCreating || !name}
                                className="w-full inline-flex items-center justify-center rounded-full bg-[#1A1A1A] px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Creating Profile...
                                    </>
                                ) : (
                                    "Create Business"
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Plan Selection Step */}
            {currentStep === 2 && (
                <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 lg:p-12 animate-in fade-in duration-500">
                    <div className="max-w-[1200px] mx-auto w-full">
                        <div className="mb-12 text-center max-w-2xl mx-auto">
                            <h2 className="text-3xl lg:text-[2.5rem] font-medium tracking-tight text-gray-900 mb-4 leading-tight">Choose Your Plan</h2>
                            <p className="text-xl text-gray-500">Select the perfect plan to get started with your UGC campaigns.</p>
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm font-medium bg-red-50 p-4 rounded-xl border border-red-100 mb-8 max-w-2xl mx-auto text-center">
                                {error}
                            </div>
                        )}

                        <PlanSelector
                            billingCycle={billingCycle}
                            onBillingCycleChange={setBillingCycle}
                            onSelectPlan={handlePlanSelection}
                            isLoading={isCreatingCheckout}
                            selectedPlan={selectedPlan}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
