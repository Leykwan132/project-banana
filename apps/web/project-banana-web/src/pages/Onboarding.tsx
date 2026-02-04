import { useState, useEffect } from 'react';
import { useMutation, useAction, useQuery } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import Button from '../components/ui/Button';
import { Upload, Loader2, ArrowRight, Sparkles, TrendingUp, Users } from 'lucide-react';
import PlanSelector from '../components/PlanSelector';

export default function Onboarding() {
    // Check if user has business and subscription to determine initial step
    const business = useQuery(api.businesses.getMyBusiness);
    const subscription = useQuery(api.stripe.getMySubscription);

    // Steps: 0 = Intro, 1 = Business Profile, 2 = Plan Selection
    const [currentStep, setCurrentStep] = useState<0 | 1 | 2>(0);
    const [slideIndex, setSlideIndex] = useState(0);

    // Sync step with business/subscription state
    useEffect(() => {
        if (business && !subscription?.subscriptionId) {
            // Business exists but no subscription -> Go to Plan Selection
            setCurrentStep(2);
        }
    }, [business, subscription]);

    // Intro Slides Data
    const slides = [
        {
            icon: <Sparkles className="w-8 h-8 text-yellow-400" />,
            title: "Discover the power of UGC",
            description: "Unlock authentic content that drives real engagement and sales for your brand."
        },
        {
            icon: <Users className="w-8 h-8 text-blue-400" />,
            title: "Connect with creators",
            description: "Access a diverse network of talented creators ready to tell your brand's story."
        },
        {
            icon: <TrendingUp className="w-8 h-8 text-green-400" />,
            title: "Launch campaigns in minutes",
            description: "Streamline your workflow from brief to content delivery with our powerful tools."
        }
    ];

    // Business Profile State
    const [name, setName] = useState('');
    const [industry, setIndustry] = useState('E-commerce');
    const [size, setSize] = useState('1-10');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    // Plan Selection State
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'starter' | 'growth' | null>(null);

    const createBusiness = useMutation(api.businesses.createBusiness);
    const generateUploadUrl = useAction(api.businesses.generateLogoUploadUrl);
    const createSubscriptionCheckout = useAction(api.stripe.createSubscriptionCheckout);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleIntroNext = () => {
        if (slideIndex < slides.length - 1) {
            setSlideIndex(prev => prev + 1);
        } else {
            localStorage.setItem('has_seen_intro', 'true');
            setCurrentStep(1);
        }
    };

    const handleBusinessSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsCreating(true);

        try {
            let s3Key = undefined;

            if (file) {
                // 1. Get Upload URL
                const { uploadUrl, s3Key: key } = await generateUploadUrl({ contentType: file.type });

                // 2. Upload File
                const result = await fetch(uploadUrl, {
                    method: "PUT",
                    body: file,
                    headers: { "Content-Type": file.type },
                });

                if (!result.ok) {
                    throw new Error("Failed to upload image");
                }
                s3Key = key;
            }

            // 3. Create Business
            await createBusiness({
                name,
                industry,
                size,
                logo_s3_key: s3Key,
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
    const handlePlanSelection = async (planType: 'starter' | 'growth') => {
        setSelectedPlan(planType);
        setIsCreatingCheckout(true);

        try {
            const STRIPE_PRICES = {
                starter: {
                    monthly: 'price_1SwdFtGxFs9ga3zc5cI5Weib',
                    annual: 'price_1SwdR9GxFs9ga3zcN4TG9KnG',
                },
                growth: {
                    monthly: 'price_1SwdJYGxFs9ga3zcZpNKmp4S',
                    annual: 'price_1SwdUGGxFs9ga3zc6C80xiAz',
                },
            };

            const priceId = STRIPE_PRICES[planType][billingCycle];
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
        <div className="min-h-screen bg-[url('/bg-onboard.webp')] bg-cover bg-center bg-no-repeat p-4 flex items-center justify-center font-sans">
            <div className="bg-white rounded-xl py-20  min-w-[1400px]  shadow-2xl overflow-hidden relative flex">
                {/* Intro Step */}
                {currentStep === 0 && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-in fade-in slide-in-from-right duration-500">
                        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            {/* Left: Content */}
                            <div className="h-full flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="w-14 h-14 bg-black/5 rounded-2xl flex items-center justify-center mb-6">
                                        {slides[slideIndex].icon}
                                    </div>
                                    <h1 className="text-2xl font-semibold text-gray-900 leading-tight">
                                        {slides[slideIndex].title}
                                    </h1>
                                    <p className="text-lg text-gray-500 leading-relaxed">
                                        {slides[slideIndex].description}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-8">
                                    <div className="flex gap-2">
                                        {slides.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`h-2 rounded-full transition-all duration-300 ${idx === slideIndex ? 'w-8 bg-black' : 'w-2 bg-gray-200'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleIntroNext}
                                        className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-900 transition-all  active:scale-95"
                                    >
                                        {slideIndex === slides.length - 1 ? "Get Started" : "Next"}
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Right: Visual */}
                            <div className="relative aspect-square bg-[#F9FAFB] rounded-[32px] overflow-hidden p-8 flex items-center justify-center border border-gray-100 shadow-sm">
                                {/* Abstract Visuals based on slide */}
                                {slideIndex === 0 && (
                                    <div className="grid grid-cols-2 gap-4 w-full h-full rotate-3 scale-90 opacity-80">
                                        <div className="bg-gray-200 rounded-3xl animate-pulse delay-75 shadow-lg"></div>
                                        <div className="bg-gray-300 rounded-3xl animate-pulse delay-150 shadow-lg translate-y-8"></div>
                                        <div className="bg-gray-300 rounded-3xl animate-pulse delay-300 shadow-lg -translate-y-8"></div>
                                        <div className="bg-gray-200 rounded-3xl animate-pulse shadow-lg"></div>
                                    </div>
                                )}
                                {slideIndex === 1 && (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <div className="absolute w-48 h-48 bg-blue-100 rounded-full top-1/4 left-1/4 animate-bounce delay-100 opacity-60 blur-xl"></div>
                                        <div className="absolute w-56 h-56 bg-yellow-100 rounded-full bottom-1/4 right-1/4 animate-bounce delay-300 opacity-60 blur-xl"></div>
                                        <div className="relative z-10 bg-white p-8 rounded-3xl shadow-xl transform rotate-3 max-w-[200px] border border-gray-100">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0"></div>
                                                <div className="space-y-2 w-full">
                                                    <div className="w-full h-3 bg-gray-100 rounded"></div>
                                                    <div className="w-2/3 h-3 bg-gray-100 rounded"></div>
                                                </div>
                                            </div>
                                            <div className="w-full h-24 bg-gray-50 rounded-xl mb-3"></div>
                                            <div className="w-1/2 h-3 bg-gray-100 rounded"></div>
                                        </div>
                                    </div>
                                )}
                                {slideIndex === 2 && (
                                    <div className="w-full h-full bg-white rounded-3xl shadow-lg border border-gray-100 flex flex-col p-8 space-y-6 -rotate-2">
                                        <div className="w-full h-40 bg-gray-50 rounded-2xl shadow-inner mb-2"></div>
                                        <div className="space-y-4">
                                            <div className="flex gap-4 items-center">
                                                <div className="flex-1 h-3 bg-gray-100 rounded-full"></div>
                                                <div className="w-20 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                                    <div className="w-12 h-2 bg-green-400 rounded-full"></div>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 items-center">
                                                <div className="flex-1 h-3 bg-gray-100 rounded-full"></div>
                                                <div className="w-20 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <div className="w-12 h-2 bg-blue-400 rounded-full"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Business Profile Step */}
                {currentStep === 1 && (
                    <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 animate-in fade-in slide-in-from-right duration-500">
                        {/* Left Side - Form */}
                        <div className="p-20 flex flex-col justify-center overflow-y-auto">
                            <div className="mb-12">
                                <h2 className="text-4xl font-bold text-gray-900 mb-4">Tell us about your business</h2>
                                <p className="text-gray-500 text-lg">We'll customize your experience based on your needs.</p>
                            </div>

                            <form onSubmit={handleBusinessSubmit} className="space-y-10">
                                <div className="space-y-8">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-3">Business Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Acme Corp"
                                            className="w-full bg-[#F9FAFB] border-2 border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-5 py-4 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 text-lg"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900 mb-3">Industry</label>
                                            <select
                                                value={industry}
                                                onChange={(e) => setIndustry(e.target.value)}
                                                className="w-full bg-[#F9FAFB] border-2 border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-5 py-4 outline-none transition-all font-medium text-gray-900 appearance-none text-lg"
                                            >
                                                <option value="E-commerce">E-commerce</option>
                                                <option value="SaaS">SaaS</option>
                                                <option value="Agency">Agency</option>
                                                <option value="Health">Health</option>
                                                <option value="Education">Education</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900 mb-3">Size</label>
                                            <select
                                                value={size}
                                                onChange={(e) => setSize(e.target.value)}
                                                className="w-full bg-[#F9FAFB] border-2 border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-5 py-4 outline-none transition-all font-medium text-gray-900 appearance-none text-lg"
                                            >
                                                <option value="1-10">1-10</option>
                                                <option value="11-50">11-50</option>
                                                <option value="51-200">51-200</option>
                                                <option value="200+">200+</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-3">Logo (Optional)</label>
                                        <div className="flex items-center gap-6">
                                            <div className="w-24 h-24 rounded-2xl bg-[#F9FAFB] border-2 border-transparent flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-gray-300 transition-colors">
                                                {previewUrl ? (
                                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Upload className="w-8 h-8 text-gray-400" />
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                            </div>
                                            <div className="text-sm text-gray-500 space-y-1">
                                                <p className="font-bold text-gray-900">Upload your logo</p>
                                                <p>Recommended size: 400x400px</p>
                                                <p>Max size: 2MB</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="text-red-500 text-sm font-medium bg-red-50 p-5 rounded-xl">
                                        {error}
                                    </div>
                                )}

                                <Button
                                    disabled={isCreating || !name}
                                    className="w-full justify-center py-5 text-xl bg-[#1C1C1C] hover:bg-black text-white border-transparent shadow-2xl shadow-black/10 rounded-xl"
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                                            Creating Profile...
                                        </>
                                    ) : (
                                        <>
                                            Create Business
                                            <ArrowRight className="w-6 h-6 ml-3" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>

                        {/* Right Side - Image */}
                        <div className="hidden lg:block p-20">
                            <div className="relative w-full h-full overflow-hidden rounded-3xl">
                                <img
                                    src="/bg-onboard.webp"
                                    alt="Office"
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/10"></div>
                                <div className="absolute bottom-12 left-12 right-12 text-white p-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                                    <p className="text-xl font-medium mb-4">"This platform transformed how we handle UGC. It's incredibly intuitive and powerful."</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold">JD</div>
                                        <div>
                                            <p className="font-bold">John Doe</p>
                                            <p className="text-sm opacity-80">CEO, TechStart</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Plan Selection Step */}
                {currentStep === 2 && (
                    <div className="w-full h-full flex flex-col animate-in fade-in slide-in-from-right duration-500">
                        <div className="p-12 overflow-y-auto h-full flex flex-col justify-center">
                            <div className="max-w-7xl mx-auto w-full">
                                <div className="mb-12 text-center">
                                    <h2 className="text-4xl font-bold text-gray-900 mb-3">Choose Your Plan</h2>
                                    <p className="text-gray-500 text-lg">Select the perfect plan to get started with your UGC campaigns.</p>
                                </div>

                                {error && (
                                    <div className="text-red-500 text-sm font-medium bg-red-50 p-4 rounded-xl mb-6 max-w-2xl mx-auto">
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
                    </div>
                )}
            </div>
        </div>
    );
}
