import { Check, Loader2 } from 'lucide-react';
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
        description: 'One-off UGC campaigns on demand',
        features: [
            'Pay RM 300 per campaign'
        ],
    },
    {
        type: 'starter' as const,
        name: 'Starter',
        monthlyPrice: 199,
        annualPrice: 1910,
        description: 'Steady stream of UGC content',
        features: [
            '1 active campaign at a time'
        ],
    },
    {
        type: 'growth' as const,
        name: 'Growth',
        monthlyPrice: 299,
        annualPrice: 2870,
        description: 'Scale with concurrent UGC campaigns',
        features: [
            '5 active campaigns at a time',
            'Certified business badge'
        ],
    },
    {
        type: 'unlimited' as const,
        name: 'Unlimited',
        monthlyPrice: 499,
        annualPrice: 4790,
        description: 'Uncapped campaigns for enterprise',
        features: [
            'Unlimited active campaigns',
            'Certified business badge',
            'Founder support',
            'Feature requests'
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

    const getSavingsPercent = (plan: typeof PLANS[0]) => {
        const monthlyTotal = plan.monthlyPrice * 12;
        const savings = monthlyTotal - plan.annualPrice;
        return Math.round((savings / monthlyTotal) * 100);
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
            <div className="flex justify-center">
                <div className="bg-gray-100 p-1 rounded-xl inline-flex relative">
                    <button
                        onClick={() => onBillingCycleChange('monthly')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => onBillingCycleChange('annual')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${billingCycle === 'annual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Annually
                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            SAVE 20%
                        </span>
                    </button>
                </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 w-full mx-auto">
                {PLANS.map((plan) => {
                    const isCurrent = isCurrentPlan(plan.type);
                    const price = getPrice(plan);

                    return (
                        <div
                            key={plan.type}
                            className={`rounded-2xl p-6 lg:p-7 border relative flex flex-col transition-all duration-200 ${isCurrent
                                ? 'border-2 border-blue-600 bg-blue-50/30 shadow-lg ring-2 ring-blue-200'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg'
                                }`}
                        >
                            {isCurrent && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] tracking-wider font-bold px-3 py-1 rounded-full whitespace-nowrap">
                                    ACTIVE PLAN
                                </div>
                            )}

                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                                <p className="text-sm mt-1 text-gray-500">{plan.description}</p>
                            </div>

                            <div className="mb-6">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold tracking-tight text-gray-900">RM {price}</span>
                                    <span className="text-sm font-medium text-gray-500">/month</span>
                                    {billingCycle === 'annual' && plan.monthlyPrice > 0 && (
                                        <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                            SAVE {getSavingsPercent(plan)}%
                                        </span>
                                    )}
                                </div>
                                {billingCycle === 'annual' && plan.monthlyPrice > 0 && (
                                    <div className="text-xs text-gray-400 mt-1 line-through">
                                        RM {plan.monthlyPrice} /month
                                    </div>
                                )}
                            </div>

                            <ul className="space-y-3.5 mb-8 flex-1">
                                {plan.features.map((feature, index) => (
                                    <li key={index} className="flex items-start gap-3 text-sm text-gray-600">
                                        <Check className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {!hasActiveSubscription && !isCurrent && (
                                <Button
                                    variant="primary"
                                    className="w-full justify-center bg-gray-900 hover:bg-black text-white shadow-sm"
                                    disabled={isLoading}
                                    onClick={() => handleStartSubscription(plan.type)}
                                >
                                    {isLoading && selectedPlan === plan.type ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : plan.type === 'free' ? (
                                        'Get Started'
                                    ) : (
                                        'Start 14-day free trial'
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
