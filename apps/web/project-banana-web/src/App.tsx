import { ChevronDown, Github, Instagram, Linkedin, Twitter, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authClient } from './lib/auth-client';
import PlanSelector from './components/PlanSelector';
import BusinessLanding from './landing/business/BusinessLanding';
import CreatorLanding from './landing/creator/CreatorLanding';

type PricingFaq = {
    question: string;
    answer: string;
};

const pricingFaqs: PricingFaq[] = [
    {
        question: 'Are there creator fees?',
        answer: 'No. Creator payouts are not reduced by hidden platform percentages.',
    },
    {
        question: 'How does pay-as-you-go work?',
        answer: 'You fund campaign budgets as needed and pay the applicable platform fee at checkout.',
    },
    {
        question: 'Can we change plans later?',
        answer: 'Yes. You can upgrade or downgrade from billing settings based on your campaign volume.',
    },
    {
        question: 'Do you support enterprise pricing?',
        answer: 'Yes. High-volume teams can request custom terms and support.',
    },
];

function Footer() {
    const { data: session } = authClient.useSession();
    const isAuthenticated = !!session?.user;

    return (
        <footer className="border-t border-gray-100 bg-white py-12 text-sm text-gray-500">
            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
                <div className="col-span-2 space-y-4">
                    <div className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                        <img src="/banana-icon.png" alt="Youniq" className="h-6 w-6 object-contain" />
                        <span className="text-lg tracking-tight">Youniq</span>
                    </div>
                    <p className="max-w-xs leading-relaxed">The operating layer for modern UGC execution, from brief to payout.</p>
                    <div className="flex gap-4 pt-2">
                        <a href="#" className="text-gray-400 transition-colors hover:text-gray-900" aria-label="X">
                            <Twitter size={18} />
                        </a>
                        <a href="#" className="text-gray-400 transition-colors hover:text-gray-900" aria-label="Instagram">
                            <Instagram size={18} />
                        </a>
                        <a href="#" className="text-gray-400 transition-colors hover:text-gray-900" aria-label="LinkedIn">
                            <Linkedin size={18} />
                        </a>
                        <a href="#" className="text-gray-400 transition-colors hover:text-gray-900" aria-label="GitHub">
                            <Github size={18} />
                        </a>
                    </div>
                </div>

                <div>
                    <h4 className="mb-4 font-semibold text-gray-900">Navigation</h4>
                    <ul className="space-y-3">
                        <li>
                            <Link to="/business" className="transition-colors hover:text-gray-900">
                                For Business
                            </Link>
                        </li>
                        <li>
                            <Link to="/" className="transition-colors hover:text-gray-900">
                                For Creators
                            </Link>
                        </li>
                        {isAuthenticated ? (
                            <li>
                                <Link to="/overview" className="transition-colors hover:text-gray-900">
                                    Go to dashboard
                                </Link>
                            </li>
                        ) : (
                            <li>
                                <Link to="/login" className="transition-colors hover:text-gray-900">
                                    Log In
                                </Link>
                            </li>
                        )}
                    </ul>
                </div>

                <div>
                    <h4 className="mb-4 font-semibold text-gray-900">Legal</h4>
                    <ul className="space-y-3">
                        <li>
                            <a href="#" className="transition-colors hover:text-gray-900">
                                Privacy Policy
                            </a>
                        </li>
                        <li>
                            <a href="#" className="transition-colors hover:text-gray-900">
                                Terms of Service
                            </a>
                        </li>
                        <li>
                            <a href="#" className="transition-colors hover:text-gray-900">
                                Cookie Policy
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-gray-100 px-6 pt-12 md:flex-row">
                <p>© {new Date().getFullYear()} Youniq. All rights reserved.</p>
                <span className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    All systems operational
                </span>
            </div>
        </footer>
    );
}

function PricingFaqSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="mx-auto max-w-3xl px-6 py-12">
            <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">Pricing FAQs</h2>
            <div className="mt-10 space-y-4">
                {pricingFaqs.map((faq, index) => {
                    const isOpen = openIndex === index;
                    return (
                        <article key={faq.question} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                            <button onClick={() => setOpenIndex(isOpen ? null : index)} className="flex w-full items-center justify-between px-6 py-5 text-left">
                                <span className="font-semibold text-gray-900">{faq.question}</span>
                                <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`px-6 text-gray-600 transition-all duration-300 ${isOpen ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 pb-0 opacity-0'}`}>
                                {faq.answer}
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

function PricingPage() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const navigate = useNavigate();

    return (
        <div className="min-h-screen animate-in fade-in pb-12 pt-24">
            <div className="mx-auto max-w-6xl px-6 text-center">
                <h1 className="text-5xl font-bold tracking-tight text-gray-900 md:text-6xl">Simple pricing for growing teams</h1>
                <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-600">Pick a plan that fits your campaign volume and scale when your output grows.</p>
            </div>

            <div className="mx-auto mt-14 w-full max-w-6xl px-6">
                <PlanSelector
                    billingCycle={billingCycle}
                    onBillingCycleChange={setBillingCycle}
                    onSelectPlan={() => navigate('/login')}
                />
            </div>

            <div className="mt-16 border-t border-gray-100 pt-10">
                <PricingFaqSection />
            </div>
        </div>
    );
}

export default function App() {
    const location = useLocation();
    const isBusiness = location.pathname.startsWith('/business');
    const isPricing = location.pathname.startsWith('/pricing');
    const { data: session } = authClient.useSession();
    console.log(session);
    const isAuthenticated = !!session?.user;

    return (
        <div className="flex min-h-screen flex-col bg-white font-sans text-gray-900">
            <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/85 backdrop-blur-md">
                <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
                    <Link to="/" className="flex items-center gap-2 font-semibold">
                        <img src="/banana-icon.png" alt="Youniq" className="h-8 w-8 object-contain" />
                        <span className="text-xl tracking-tight">Youniq</span>
                    </Link>

                    <div className="flex items-center gap-6">
                        {(isBusiness || isPricing) && (
                            <Link to="/" className="hidden text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900 md:block">
                                For Creators
                            </Link>
                        )}
                        {!isBusiness && !isPricing && (
                            <Link to="/business" className="hidden text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900 md:block">
                                For Business
                            </Link>
                        )}
                        {(isBusiness || isPricing) && (
                            <Link
                                to="/pricing"
                                className={`hidden text-sm font-semibold transition-colors md:block ${isPricing ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Pricing
                            </Link>
                        )}

                        <div className="hidden h-4 w-px bg-gray-200 md:block" />

                        {isAuthenticated ? (
                            <Link to="/overview" className="flex items-center gap-1.5 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800">
                                Go to dashboard
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        ) : (
                            <Link to="/login" className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800">
                                Log in
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1">{isPricing ? <PricingPage /> : isBusiness ? <BusinessLanding /> : <CreatorLanding />}</main>

            <Footer />
        </div>
    );
}
