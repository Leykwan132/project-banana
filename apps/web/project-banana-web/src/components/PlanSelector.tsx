import { Check, Loader2 } from 'lucide-react';
import { useAction } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import Button from './ui/Button';

// Static plan configuration
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

const PLANS = [
    {
        type: 'starter' as const,
        name: 'Starter',
        monthlyPrice: 199,
        annualPrice: 1188,
        description: 'Perfect for getting started',
        features: [
            '1 active campaign',
            '100 submissions/month',
            'Email support',
        ],
    },
    {
        type: 'growth' as const,
        name: 'Growth',
        monthlyPrice: 299,
        annualPrice: 2388,
        description: 'For growing businesses',
        features: [
            '15 active campaigns',
            'Unlimited submissions',
            'Priority support',
        ],
    },
];

interface PlanSelectorProps {
    billingCycle: 'monthly' | 'annual';
    onBillingCycleChange: (cycle: 'monthly' | 'annual') => void;
    onSelectPlan?: (planType: 'starter' | 'growth') => void;
    hasActiveSubscription?: boolean;
    currentPlanType?: 'starter' | 'growth' | null;
    isLoading?: boolean;
    selectedPlan?: 'starter' | 'growth' | null;
}

export default function PlanSelector({
    billingCycle,
    onBillingCycleChange,
    onSelectPlan,
    hasActiveSubscription = false,
    currentPlanType = null,
    isLoading = false,
    selectedPlan = null,
}: PlanSelectorProps) {
    const createSubscriptionCheckout = useAction(api.stripe.createSubscriptionCheckout);

    const handleStartSubscription = async (planType: 'starter' | 'growth') => {
        if (onSelectPlan) {
            onSelectPlan(planType);
            return;
        }

        // Default behavior: create checkout
        try {
            const priceId = STRIPE_PRICES[planType][billingCycle];
            const result = await createSubscriptionCheckout({
                priceId,
                planType,
                billingCycle,
            });

            if (result.url) {
                window.location.href = result.url;
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

    const isCurrentPlan = (planType: 'starter' | 'growth') => {
        return currentPlanType === planType && hasActiveSubscription;
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
                            SAVE 30%
                        </span>
                    </button>
                </div>
            </div>

            {/* Plans Grid */}
            <div className="flex flex-wrap justify-center gap-6">
                {PLANS.map((plan) => {
                    const isCurrent = isCurrentPlan(plan.type);
                    const price = getPrice(plan);

                    return (
                        <div
                            key={plan.type}
                            className={`rounded-xl p-6 border flex-1 min-w-[280px] max-w-[400px] ${isCurrent ? 'border-2 border-blue-600 bg-blue-50/20' : 'border-gray-200 bg-white'} relative flex flex-col`}
                        >
                            {isCurrent && (
                                <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                                    CURRENT PLAN
                                </div>
                            )}

                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                                <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
                            </div>

                            <div className="mb-6">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-gray-900">RM {price}</span>
                                    <span className="text-gray-500 text-sm font-medium">/month</span>
                                    {billingCycle === 'annual' && (
                                        <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                            SAVE {getSavingsPercent(plan)}%
                                        </span>
                                    )}
                                </div>
                                {billingCycle === 'annual' && (
                                    <div className="text-xs text-gray-400 mt-1 line-through">
                                        RM {plan.monthlyPrice} /month
                                    </div>
                                )}
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((feature, index) => (
                                    <li key={index} className="flex items-start gap-3 text-sm text-gray-600">
                                        <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                variant={isCurrent ? 'outline' : 'primary'}
                                className={`w-full justify-center ${isCurrent ? 'border-blue-200 text-blue-700 hover:bg-blue-50' : 'bg-black hover:bg-gray-800'}`}
                                disabled={isCurrent || isLoading || hasActiveSubscription}
                                onClick={() => !isCurrent && !hasActiveSubscription && handleStartSubscription(plan.type)}
                            >
                                {isLoading && selectedPlan === plan.type ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : isCurrent ? (
                                    'Current Plan'
                                ) : hasActiveSubscription ? (
                                    'Change via Portal'
                                ) : (
                                    'Start 14-day free trial'
                                )}
                            </Button>
                        </div>
                    );
                })}

                {/* Enterprise Plan */}
                <div className="rounded-xl p-6 border flex-1 min-w-[280px] max-w-[400px] border-gray-200 bg-white relative flex flex-col">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Enterprise</h3>
                        <p className="text-gray-500 text-sm mt-1">For large organizations</p>
                    </div>

                    <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-gray-900">Custom</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Contact us for pricing</p>
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-start gap-3 text-sm text-gray-600">
                            <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span>Unlimited campaigns</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm text-gray-600">
                            <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span>Unlimited submissions</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm text-gray-600">
                            <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span>Dedicated support</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm text-gray-600">
                            <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span>Custom integrations</span>
                        </li>
                    </ul>

                    <Button
                        variant="outline"
                        className="w-full justify-center border-gray-200 text-gray-700 hover:bg-gray-50"
                        disabled={hasActiveSubscription}
                    >
                        Contact Sales
                    </Button>
                </div>
            </div>

            {hasActiveSubscription && (
                <p className="text-center text-sm text-gray-500 mt-4">
                    To change your plan, use the "Manage Subscription" button above to access the Stripe portal.
                </p>
            )}
        </div>
    );
}
