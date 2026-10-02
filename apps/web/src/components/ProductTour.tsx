import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    PRODUCT_TOUR_START_EVENT,
    setProductTourActive,
    setProductTourCompleted,
} from '../lib/productTour';

type TourStep = {
    id: string;
    path: string;
    target: string;
    title: string;
    description: string;
};

const TOUR_STEPS: TourStep[] = [
    {
        id: 'overview-snapshot',
        path: '/overview',
        target: '[data-tour-id="overview-metrics"]',
        title: 'Overview metrics',
        description: 'Complete key metrics for all your campaigns.',
    },
    {
        id: 'campaigns-create',
        path: '/campaigns',
        target: '[data-tour-id="campaigns-overview-section"]',
        title: 'Campaigns overview',
        description: 'You can oversee or create new campaigns here.',
    },
    {
        id: 'campaign-new-payout',
        path: '/campaign/new',
        target: '[data-tour-id="campaign-payout-section"]',
        title: 'Payout threshold',
        description: 'Set how much the user gets paid based on views.',
    },
    {
        id: 'campaign-new-requirements',
        path: '/campaign/new',
        target: '[data-tour-id="campaign-requirements-section"]',
        title: 'Campaign requirements',
        description: 'Set the requirements for the campaign that creators must follow.',
    },
    {
        id: 'campaign-new-credits',
        path: '/campaign/new',
        target: '[data-tour-id="campaign-credit-balance"]',
        title: 'Credit balance',
        description: 'All campaigns budget are up front. Ensure you have enough credits before creating a campaign.',
    },
    {
        id: 'credits-top-up',
        path: '/credits',
        target: '[data-tour-id="credits-topup-button"]',
        title: 'Top up credits',
        description: 'Min. amount is RM100 with 0 fee.',
    },
    {
        id: 'withdrawals-request',
        path: '/withdrawals',
        target: '[data-tour-id="withdrawals-request-button"]',
        title: 'Withdraw excess credits',
        description: 'You can withdraw excess credits only to approved bank accounts.',
    },
    {
        id: 'bank-accounts-add',
        path: '/bank-accounts',
        target: '[data-tour-id="bank-accounts-page"]',
        title: 'Bank accounts',
        description: 'Submit bank account details to be approved.',
    },
];

const HIGHLIGHT_PADDING = 8;
const PANEL_GAP = 32;
const PANEL_WIDTH = 380;
const PANEL_HEIGHT_GUESS = 320;

const clamp = (value: number, min: number, max: number) => {
    if (max < min) return min;
    return Math.min(Math.max(value, min), max);
};

const getStepHighlightPadding = (stepId: string) => {
    if (stepId === 'overview-snapshot') return 12;
    if (stepId === 'campaign-new-payout' || stepId === 'campaign-new-requirements') return 10;
    if (stepId === 'bank-accounts-add') return 12;
    return HIGHLIGHT_PADDING;
};

export function ProductTour() {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [targetFound, setTargetFound] = useState(false);
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [viewport, setViewport] = useState(() => ({
        width: typeof window === 'undefined' ? 1200 : window.innerWidth,
        height: typeof window === 'undefined' ? 900 : window.innerHeight,
    }));

    const currentStep = activeStepIndex === null ? null : TOUR_STEPS[activeStepIndex];
    const isActive = currentStep !== null;
    const isLastStep = activeStepIndex === TOUR_STEPS.length - 1;

    useEffect(() => {
        const handleResize = () => {
            setViewport({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        const startTour = () => {
            setProductTourActive(true);
            setActiveStepIndex(0);
            setTargetRect(null);
            setTargetFound(false);
            setIsCompletionModalOpen(false);
        };

        window.addEventListener(PRODUCT_TOUR_START_EVENT, startTour);
        return () => {
            window.removeEventListener(PRODUCT_TOUR_START_EVENT, startTour);
        };
    }, []);

    useEffect(() => {
        if (!currentStep) return;
        if (location.pathname !== currentStep.path) {
            navigate(currentStep.path);
        }
    }, [currentStep, location.pathname, navigate]);

    useEffect(() => {
        if (!currentStep) return;
        if (location.pathname !== currentStep.path) return;

        let cleanup = () => { };
        let attempts = 0;
        let frameId = 0;
        let isCancelled = false;

        const findTarget = () => {
            if (isCancelled) return;

            const element = document.querySelector(currentStep.target) as HTMLElement | null;
            if (!element) {
                attempts += 1;
                if (attempts < 90) {
                    frameId = window.requestAnimationFrame(findTarget);
                }
                return;
            }

            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

            const updatePosition = () => {
                if (isCancelled) return;
                const rect = element.getBoundingClientRect();
                setTargetRect(rect);
                setTargetFound(rect.width > 0 && rect.height > 0);
            };

            updatePosition();

            const resizeObserver = new ResizeObserver(updatePosition);
            resizeObserver.observe(element);

            const onViewportChange = () => {
                updatePosition();
            };

            window.addEventListener('resize', onViewportChange);
            window.addEventListener('scroll', onViewportChange, true);

            cleanup = () => {
                resizeObserver.disconnect();
                window.removeEventListener('resize', onViewportChange);
                window.removeEventListener('scroll', onViewportChange, true);
            };
        };

        findTarget();

        return () => {
            isCancelled = true;
            window.cancelAnimationFrame(frameId);
            cleanup();
        };
    }, [currentStep, location.pathname]);

    if (!isActive && !isCompletionModalOpen) {
        return null;
    }

    const closeTour = (markCompleted: boolean) => {
        if (markCompleted) {
            setProductTourCompleted(true);
        }
        setProductTourActive(false);
        setActiveStepIndex(null);
        setTargetRect(null);
        setTargetFound(false);
    };

    const handleBack = () => {
        if (activeStepIndex === null || activeStepIndex === 0) return;
        setActiveStepIndex(activeStepIndex - 1);
    };

    const handleNext = () => {
        if (activeStepIndex === null) return;

        if (isLastStep) {
            closeTour(true);
            setIsCompletionModalOpen(true);
            return;
        }

        setActiveStepIndex(activeStepIndex + 1);
    };

    const handleSkip = () => {
        closeTour(false);
        setIsCompletionModalOpen(false);
    };

    const panelWidth = Math.min(PANEL_WIDTH, viewport.width - 32);
    const hasTarget = currentStep
        ? targetRect !== null && targetFound && location.pathname === currentStep.path
        : false;

    let panelTop = Math.max(24, (viewport.height - PANEL_HEIGHT_GUESS) / 2);
    let panelLeft = Math.max(16, (viewport.width - panelWidth) / 2);

    if (hasTarget && targetRect) {
        const canPlaceBelow = targetRect.bottom + PANEL_GAP + PANEL_HEIGHT_GUESS <= viewport.height - 16;
        const canPlaceAbove = targetRect.top - PANEL_GAP - PANEL_HEIGHT_GUESS >= 16;

        panelTop = canPlaceBelow
            ? targetRect.bottom + PANEL_GAP
            : canPlaceAbove
                ? targetRect.top - PANEL_HEIGHT_GUESS - PANEL_GAP
                : clamp(viewport.height - PANEL_HEIGHT_GUESS - 16, 16, viewport.height - 16);

        panelTop = clamp(panelTop, 16, viewport.height - PANEL_HEIGHT_GUESS - 16);
        panelLeft = clamp(targetRect.left, 16, viewport.width - panelWidth - 16);
    }

    const highlightStyle = hasTarget && targetRect && currentStep
        ? (() => {
            const padding = getStepHighlightPadding(currentStep.id);
            const top = clamp(targetRect.top - padding, 8, viewport.height - 8);
            const left = clamp(targetRect.left - padding, 8, viewport.width - 8);
            const width = clamp(targetRect.width + padding * 2, 0, viewport.width - left - 8);
            const height = clamp(targetRect.height + padding * 2, 0, viewport.height - top - 8);
            return { top, left, width, height };
        })()
        : null;

    return (
        <>
            {isActive && currentStep && (
                <>
                    {highlightStyle && (
                        <div
                            className="pointer-events-none fixed z-[111] rounded-2xl border-2 border-white shadow-[0_0_0_9999px_rgba(17,24,39,0.12)] transition-all duration-300"
                            style={highlightStyle}
                        />
                    )}

                    <div
                        className="fixed z-[112] rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl"
                        style={{ width: panelWidth, top: panelTop, left: panelLeft }}
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Product Tour {activeStepIndex! + 1}/{TOUR_STEPS.length}
                            </span>
                            <button
                                type="button"
                                onClick={handleSkip}
                                className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                aria-label="Close tour"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <h3 className="text-xl font-semibold tracking-tight text-gray-900">{currentStep.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">{currentStep.description}</p>

                        {!hasTarget && (
                            <p className="mt-4 text-xs font-medium text-gray-500">Loading highlighted section...</p>
                        )}

                        <div className="mt-6 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={handleBack}
                                disabled={activeStepIndex === 0}
                                aria-label="Previous step"
                                className="inline-flex items-center text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                >
                                    Skip
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black"
                                >
                                    Next
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {isCompletionModalOpen && (
                <div className="fixed inset-0 z-[113] flex items-center justify-center bg-black/25 p-4">
                    <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 shadow-2xl">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Product Tour Complete</p>
                        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">
                            You completed the product tour
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">
                            You can now launch your first campaign with payout, requirements, and credit top-up flow ready.
                        </p>

                        <div className="mt-6 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsCompletionModalOpen(false)}
                                className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                            >
                                Later
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCompletionModalOpen(false);
                                    navigate('/campaign/new');
                                }}
                                className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black"
                            >
                                Create your first campaign
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
