import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import Button from '../components/ui/Button';
import { addToast, Skeleton } from "@heroui/react";
import PlanSelector from '../components/PlanSelector';

export default function Subscription() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [isManaging, setIsManaging] = useState(false);

    // Fetch subscription status from local cache
    const subscriptionCache = useQuery(api.stripe.getMySubscription);
    const liveSubscriptionStatus = useQuery(api.stripe.getSubscriptionDetails);

    // Actions
    const createPortalSession = useAction(api.stripe.createPortalSession);

    // Handle opening Stripe Customer Portal
    const handleManageSubscription = async () => {
        setIsManaging(true);
        try {
            const result = await createPortalSession({ returnUrl: window.location.href });
            if (result.portalUrl) {
                window.location.href = result.portalUrl;
            }
        } catch (error) {
            console.error('Failed to create portal session:', error);
            addToast({
                title: 'Error',
                description: 'Failed to open subscription management portal',
                color: 'danger',
            });
            setIsManaging(false);
        }
    };

    // State for subscription details from Stripe (Live Status)
    const isLoadingDetails = liveSubscriptionStatus === undefined || subscriptionCache === undefined;

    const hasActiveSubscription = liveSubscriptionStatus?.status === 'active' || liveSubscriptionStatus?.status === 'trialing';

    // Helper to get plan details from LOCAL CACHE (Stable)
    const currentPlanType = subscriptionCache?.planType as 'free' | 'starter' | 'growth' | 'unlimited' | undefined;
    const currentBillingCycle = subscriptionCache?.billingCycle as 'monthly' | 'annual' | undefined;
    useEffect(() => {
        if (hasActiveSubscription && currentBillingCycle) {
            setBillingCycle(currentBillingCycle);
        }
    }, [hasActiveSubscription, currentBillingCycle]);

    // Format renewal date from LIVE STRIPE DATA
    const renewsOn = liveSubscriptionStatus?.currentPeriodEnd
        ? new Date(liveSubscriptionStatus.currentPeriodEnd * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : null;

    // Calculate monthly equivalent amount
    const subscriptionAmount = subscriptionCache?.subscriptionAmount || 0;
    const normalizedMonthlyAmount = currentBillingCycle === 'annual'
        ? subscriptionAmount / 12
        : subscriptionAmount;

    // Loading state with Skeleton
    if (subscriptionCache === undefined || (subscriptionCache?.subscriptionId && isLoadingDetails)) {
        return (
            <div className="py-4 px-6 h-[calc(100vh-4rem)] overflow-y-auto">
                <div className="w-full">
                    <Skeleton className="w-48 h-8 rounded-lg mb-6" /> {/* Header Title Skeleton */}

                    {/* Current Plan Card Skeleton */}
                    <div className="mb-8">
                        <Skeleton className="w-full max-w-lg h-64 rounded-2xl" />
                    </div>

                    {/* Toggle Skeleton */}
                    <div className="flex justify-center mt-4 mb-6">
                        <Skeleton className="w-64 h-10 rounded-xl" />
                    </div>

                    {/* Plans Grid Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Skeleton className="w-full h-96 rounded-xl" />
                        <Skeleton className="w-full h-96 rounded-xl" />
                        <Skeleton className="w-full h-96 rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 font-sans text-gray-900 animate-fadeIn overflow-y-auto">
            <div className="w-full">
                <div className="flex items-center gap-3 mb-6">
                    <h1 className="text-2xl font-bold">Subscription</h1>
                </div>

                {/* Current Subscription Card - Credits Style */}
                {hasActiveSubscription && liveSubscriptionStatus && !isLoadingDetails && (
                    <div className="mb-16 w-full max-w-lg">
                        <div className="bg-[#1C1C1C] text-white p-8 rounded-xl flex flex-col justify-between min-h-[300px] shadow-xl shadow-black/10 relative">
                            {/* Cancellation Alert - At Top */}
                            {liveSubscriptionStatus.cancelAtPeriodEnd && (
                                <div className="flex items-start gap-2 p-3 bg-yellow-500/20 text-yellow-200 rounded-lg text-xs mb-4">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <p>
                                        Your subscription has been cancelled and will not renew. You will lose access to premium features after {renewsOn}.
                                    </p>
                                </div>
                            )}

                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <h2 className="text-2xl font-bold">
                                        {currentPlanType ? currentPlanType.charAt(0).toUpperCase() + currentPlanType.slice(1) : ''} Plan
                                    </h2>
                                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${liveSubscriptionStatus.status === 'active'
                                        ? 'bg-green-500/20 text-green-300'
                                        : 'bg-gray-500/20 text-gray-300'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${liveSubscriptionStatus.status === 'active' ? 'bg-green-300' : 'bg-gray-300'
                                            }`}></span>
                                        {liveSubscriptionStatus.status.charAt(0).toUpperCase() + liveSubscriptionStatus.status.slice(1)}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Billing Interval</div>
                                            <div className="text-base font-medium capitalize">{currentBillingCycle || 'Monthly'}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Monthly Cost</div>
                                            <div className="text-base font-medium">
                                                RM {normalizedMonthlyAmount.toFixed(2)}
                                                <span className="text-gray-400 font-normal text-sm"> / month</span>
                                            </div>
                                        </div>
                                    </div>
                                    {renewsOn && (
                                        <div>
                                            <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                                                {liveSubscriptionStatus.cancelAtPeriodEnd ? "Ends On" : "Renews On"}
                                            </div>
                                            <div className="text-base font-medium">{renewsOn}</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full justify-center bg-white text-black hover:bg-gray-100 border-0 mt-6"
                                onClick={handleManageSubscription}
                                disabled={isManaging}
                            >
                                {isManaging ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Loading Portal...
                                    </>
                                ) : (
                                    <>
                                        Update Subscription
                                        <ExternalLink className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Heading for Plan Comparison */}
                <div className="mb-6">
                    <h2 className="text-xl font-bold">{hasActiveSubscription ? 'Available Plan' : 'Available Plans'}</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Choose the perfect plan for your business
                    </p>
                </div>

                {/* Plan Comparison - Using PlanSelector */}
                <PlanSelector
                    billingCycle={billingCycle}
                    onBillingCycleChange={setBillingCycle}
                    hasActiveSubscription={hasActiveSubscription}
                    currentPlanType={currentPlanType}
                    currentBillingCycle={currentBillingCycle}
                />
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
