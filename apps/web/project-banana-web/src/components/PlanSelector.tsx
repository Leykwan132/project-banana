import { Check, Loader2, X, BadgeCheck } from 'lucide-react';
import { useAction } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import Button from './ui/Button';
import { getStripePriceId } from '../lib/stripe-prices';

const PLANS = [
    {
        type: 'free' as const,
        name: 'Pay As You Go',
        monthlyPrice: 0,
        annualPrice: 0,
        features: [
            { text: '1 active campaign at a time', crossed: false },
            { text: 'Limit to 50 creator submissions', crossed: false },
            { text: 'Pay RM 100 per campaign', crossed: false },
            { text: 'Instagram support', crossed: false },
            { text: 'Hashtag and mention capability', crossed: true },
            { text: 'TikTok support (Beta)', crossed: true }
        ],
    },
    {
        type: 'starter' as const,
        name: 'Starter',
        monthlyPrice: 199,
        annualPrice: 1910,
        features: [
            { text: '1 active campaign at a time', crossed: false },
            { text: 'Unlimited creator submissions', crossed: false },
            { text: '100 monthly platform-assisted reviews', crossed: false },
            { text: 'Hashtag and mention capability', crossed: false },
            { text: 'Instagram support', crossed: false },
            { text: 'TikTok support (Beta)', crossed: false }
        ],
    },
    {
        type: 'growth' as const,
        name: 'Growth',
        monthlyPrice: 299,
        annualPrice: 2870,
        features: [
            { text: '5 active campaigns at a time', crossed: false },
            { text: 'Unlimited creator submissions', crossed: false },
            { text: '200 monthly platform-assisted reviews', crossed: false },
            { text: 'Hashtag and mention capability', crossed: false },
            { text: 'Instagram support', crossed: false },
            { text: 'TikTok support (Beta)', crossed: false }
        ],
    },
    {
        type: 'unlimited' as const,
        name: 'Unlimited',
        monthlyPrice: 499,
        annualPrice: 4790,
        features: [
            { text: 'Unlimited active campaigns', crossed: false },
            { text: 'Unlimited creator submissions', crossed: false },
            { text: '500 monthly platform-assisted reviews', crossed: false },
            { text: 'Hashtag and mention capability', crossed: false },
            { text: 'Instagram support', crossed: false },
            { text: 'TikTok support (Beta)', crossed: false },
            { text: 'Priority & Founder support', crossed: false },
        ],
    },
];

export type PlanType = typeof PLANS[number]['type'];

interface PlanSelectorProps {
    billingCycle: 'monthly' | 'annual';
    onBillingCycleChange: (cycle: 'monthly' | 'annual') => void;
    onSelectPlan?: (planType: PlanType) => void;
    hasActiveSubscription?: boolean;
    currentPlanType?: PlanType | null;
    currentBillingCycle?: 'monthly' | 'annual' | null;
    isLoading?: boolean;
    selectedPlan?: PlanType | null;
    isLandingPage?: boolean;
}

export default function PlanSelector({
    billingCycle,
    onBillingCycleChange,
    onSelectPlan,
    hasActiveSubscription = false,
    currentPlanType = null,
    currentBillingCycle = null,
    isLoading = false,
    selectedPlan = null,
    isLandingPage = false,
}: PlanSelectorProps) {
    const createSubscriptionCheckout = useAction(api.stripe.createSubscriptionCheckout);

    const handleStartSubscription = async (planType: PlanType) => {
        if (onSelectPlan) {
            onSelectPlan(planType);
            return;
        }

        // Default behavior: create checkout
        try {
            const priceId = getStripePriceId(planType, billingCycle);
            if (!priceId) {
                if (planType === 'free') {
                    window.location.assign('/');
                }
                return;
            }
            const result = await createSubscriptionCheckout({
                priceId,
                planType,
                billingCycle,
            });

            if (result.url) {
                window.location.assign(result.url);
            }
        } catch (error) {
            console.error('Failed to create checkout session:', error);
        }
    };

    const getPrice = (plan: typeof PLANS[0]) => {
        if (billingCycle === 'annual') {
            return Math.round(plan.annualPrice / 12);
        }
        return plan.monthlyPrice;
    };



    const isCurrentPlan = (planType: PlanType) => {
        return (
            currentPlanType === planType &&
            hasActiveSubscription &&
            (!currentBillingCycle || billingCycle === currentBillingCycle)
        );
    };

    return (
        <div className="space-y-12">
            {/* Billing Toggle */}
            <div className="flex flex-col items-center justify-center">
                <div className="bg-gray-50/80 p-1.5 rounded-2xl inline-flex relative shadow-sm border border-gray-100">
                    <button
                        onClick={() => onBillingCycleChange('monthly')}
                        className={`px-8 py-2.5 rounded-xl text-[15px] font-semibold transition-all duration-200 cursor-pointer ${billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => onBillingCycleChange('annual')}
                        className={`px-8 py-2.5 rounded-xl text-[15px] font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${billingCycle === 'annual' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Yearly
                    </button>
                </div>
                <div className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-gray-600">
                    <BadgeCheck className="w-[18px] h-[18px] text-white fill-pink-400" />
                    20% off yearly plans
                </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 w-full mx-auto items-stretch mt-12">
                {PLANS.map((plan) => {
                    const isCurrent = isCurrentPlan(plan.type);
                    const isPopularPlan = isLandingPage && plan.type === 'starter';
                    const price = getPrice(plan);

                    return (
                        <div
                            key={plan.type}
                            className={`p-6 lg:p-8 border relative flex flex-col transition-all duration-200 flex-1 ${isCurrent && !isPopularPlan
                                ? 'rounded-3xl border-2 border-blue-600 bg-blue-50/30 shadow-lg ring-2 ring-blue-200'
                                : isPopularPlan
                                    ? 'rounded-3xl border-2 border-[#48BB78] bg-white shadow-xl ring-4 ring-[#48BB78]/10'
                                    : 'rounded-3xl border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg'
                                }`}
                        >
                            <div className="mb-5 flex items-center gap-2.5 flex-wrap">
                                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                                {isPopularPlan && (
                                    <span className="bg-[#48BB78]/10 text-[#2F855A] border border-[#48BB78]/20 text-[10px] tracking-wide font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap uppercase">
                                        Popular
                                    </span>
                                )}
                                {isCurrent && (
                                    <span className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] tracking-wide font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap uppercase">
                                        Active
                                    </span>
                                )}
                            </div>

                            <div className="mb-6">
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-[40px] leading-none font-bold tracking-tight text-[#1A1F36]">RM {price.toLocaleString()}</span>
                                </div>
                                <p className="text-[13px] font-medium text-gray-500/80 leading-snug min-h-[34px]">
                                    {plan.type === 'free'
                                        ? 'per campaign'
                                        : billingCycle === 'annual'
                                            ? `per month, RM ${plan.annualPrice.toLocaleString()} billed annually`
                                            : 'per month'
                                    }
                                </p>
                            </div>

                            <ul className="space-y-3.5 mb-8 flex-1">
                                {plan.features.map((feature, index) => (
                                    <li key={index} className="flex items-start gap-3.5 text-[14px] text-gray-600">
                                        {feature.crossed ? (
                                            <X className="w-[18px] h-[18px] shrink-0 mt-px text-gray-300" strokeWidth={2.5} />
                                        ) : (
                                            <Check className="w-[18px] h-[18px] shrink-0 mt-px text-blue-500" strokeWidth={2.5} />
                                        )}
                                        <span className={`leading-snug ${feature.crossed ? 'text-gray-400' : 'text-gray-700'}`}>
                                            {feature.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {!hasActiveSubscription && !isCurrent && (
                                <Button
                                    variant="primary"
                                    className="w-full justify-center bg-[#1A1F36] hover:bg-black text-white shadow-sm mt-auto h-[46px] rounded-full text-[15px] font-bold"
                                    disabled={isLoading}
                                    onClick={() => handleStartSubscription(plan.type)}
                                >
                                    {isLoading && selectedPlan === plan.type ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        isLandingPage ? 'Try Lumina' : 'Get Started'
                                    )}
                                </Button>
                            )}
                        </div>
                    );
                })}


            </div>

            {/* Shared Features Footer */}
            <div className="flex justify-center mt-6">
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-6 py-4 flex flex-col sm:flex-row items-center justify-center gap-4 lg:gap-8 max-w-3xl w-full text-sm text-gray-600 font-medium">
                    <span className="text-gray-900 font-bold whitespace-nowrap">Every plan includes:</span>
                    <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Automated Payouts</span>
                    </div>
                    <div className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full"></div>
                    <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Advanced Analytics</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
