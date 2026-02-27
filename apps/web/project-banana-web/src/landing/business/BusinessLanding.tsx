import { ArrowRight, ChevronDown, ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const SHARED_VIDEO_URL = '/1.webm';

type BusinessVideoCard = {
    title: string;
    description: string;
};



const teamDashboardCards: BusinessVideoCard[] = [
    {
        title: '1. Creator sourcing',
        description: 'Shortlist creators in minutes.',
    },
    {
        title: '2. Brief and asset control',
        description: 'One shared workspace.',
    },
    {
        title: '3. Approval command center',
        description: 'One single view queue.',
    },
    {
        title: '4. Spend and ROI visibility',
        description: 'Track campaign progress.',
    },
];

type AlternatingFeature = {
    title: string;
    description: string;
};

const newBusinessFeatures: AlternatingFeature[] = [
    {
        title: 'Seamless campaign management',
        description: 'Manage all your UGC campaigns in one place. Streamline your workflow from sourcing to payment.',
    },
    {
        title: 'Automated creator sourcing',
        description: 'Find the perfect creators for your brand using our advanced discovery engine and vetted network.',
    },
    {
        title: 'Secure escrow payouts',
        description: 'Protect your budget with escrow-backed payments that only release when you approve the content.',
    },
    {
        title: 'Comprehensive performance analytics',
        description: 'Track the ROI of every piece of content with real-time performance data and actionable insights.',
    }
];

const businessTestimonials = [
    {
        quote: 'We replaced three tools and a spreadsheet stack. Campaign setup and approvals are dramatically faster.',
        author: 'Mia Tan',
        role: 'Growth Lead, DTC Brand',
    },
    {
        quote: 'The quality bar improved because every brief and revision stays in one clean workflow.',
        author: 'Jordan Lee',
        role: 'Social Manager, Consumer App',
    },
    {
        quote: 'Finance and marketing are finally aligned. Escrow plus approval-based payouts removed constant follow-up.',
        author: 'Andre Koh',
        role: 'Performance Director, Agency',
    },
];



const businessFaqs = [
    {
        question: 'How quickly can we launch a campaign?',
        answer: 'Most teams can publish a campaign the same day after creating a brief and budget.',
    },
    {
        question: 'Can we approve content before creators publish?',
        answer: 'Yes. Drafts are submitted to your approval queue first so your team controls what goes live.',
    },
    {
        question: 'How are creator payments managed?',
        answer: 'Budget is secured in escrow, and payout is released only after your team approves delivery.',
    },
    {
        question: 'Will this work for both in-house teams and agencies?',
        answer: 'Yes. The dashboard supports multi-campaign operations for brands, agencies, and lean growth teams.',
    },
];



function BusinessAlternatingFeaturesSection() {
    return (
        <section className="py-24 bg-white flex flex-col gap-24 lg:gap-32">
            {newBusinessFeatures.map((feature, index) => {
                const isEven = index % 2 === 0;
                return (
                    <div key={index} className="mx-auto w-full max-w-7xl px-6">
                        <div className={`flex flex-col gap-12 lg:items-center ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}>
                            <div className="flex-1 lg:max-w-md">
                                <h3 className="text-3xl font-medium tracking-tight text-gray-900 md:text-[2.5rem] md:leading-tight">{feature.title}</h3>
                                <p className="mt-6 text-xl text-gray-500">{feature.description}</p>
                            </div>
                            <div className="flex-1 w-full bg-[#EBEAE5] rounded-2xl p-6 md:p-12 flex items-center justify-center">
                                <div className="w-full aspect-4/3 rounded-xl shadow-2xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden relative">
                                    <ImageIcon className="w-12 h-12 text-gray-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </section>
    );
}

function BusinessHowItWorksSection({ title, cards }: { title: string; cards: BusinessVideoCard[] }) {
    return (
        <section className="py-16 md:py-24">
            <div className="mx-auto max-w-7xl px-6">
                <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">{title}</h2>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {cards.map((card) => (
                        <article key={card.title} className="relative aspect-video overflow-hidden rounded-2xl border border-gray-200">
                            <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover">
                                <source src={SHARED_VIDEO_URL} type="video/webm" />
                            </video>
                            <div className="absolute left-0 top-0 p-6 md:p-8">
                                <p className="mb-2 text-sm font-medium text-black/80">{card.title}</p>
                                <h3 className="max-w-md text-xl font-bold leading-tight tracking-tight text-black md:text-2xl">{card.description}</h3>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

function BusinessTrustedBrands() {
    const brands = ['Stripe', 'OpenAI', 'Linear', 'Datadog', 'NVIDIA', 'Figma', 'Ramp', 'Adobe'];

    return (
        <section className="py-4">
            <p className="mb-8 text-center text-[15px] font-medium text-gray-600">
                Trusted by local companies
            </p>
            <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-3 px-6 md:flex-nowrap md:gap-4">
                {brands.map((brand) => (
                    <div
                        key={brand}
                        className="flex h-24 w-full max-w-36 shrink-0 items-center justify-center rounded-xl bg-[#f9f9f9] text-lg font-bold tracking-tight text-gray-900 md:max-w-none md:flex-1"
                    >
                        {brand}
                    </div>
                ))}
            </div>
        </section>
    );
}

function BusinessTestimonialsSection() {
    return (
        <section className="border-y border-gray-100 bg-gray-50 py-20">
            <div className="mx-auto max-w-7xl px-6">
                <div className="mx-auto mb-10 max-w-3xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">Testimonials</h2>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {businessTestimonials.map((testimonial) => (
                        <article key={testimonial.author} className="flex min-h-[320px] flex-col justify-between rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
                            <p className="text-[15px] leading-relaxed text-gray-800">"{testimonial.quote}"</p>
                            <div className="mt-8 flex items-center gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-200 text-sm font-semibold text-gray-600">
                                    {testimonial.author.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{testimonial.author}</p>
                                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}


function BusinessFaqSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="border-t border-gray-100 bg-white py-20">
            <div className="mx-auto max-w-3xl px-6">
                <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">FAQs</h2>
                <div className="mt-10 space-y-4">
                    {businessFaqs.map((faq, index) => {
                        const isOpen = openIndex === index;
                        return (
                            <article key={faq.question} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                                <button
                                    onClick={() => setOpenIndex(isOpen ? null : index)}
                                    className="flex w-full items-center justify-between px-6 py-5 text-left"
                                >
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
            </div>
        </section>
    );
}

export default function BusinessLanding() {
    return (
        <div className="animate-in fade-in duration-500">
            <section className="mx-auto w-full max-w-7xl px-6 pb-12 pt-16 md:pt-24">
                <div className="max-w-4xl">
                    <h1 className="text-4xl font-medium tracking-tight text-gray-900 sm:text-5xl md:text-[3.25rem] md:leading-[1.1]">
                        Built for performance marketing teams,<br className="hidden md:block" />
                        Youniq is the best way to run UGC.
                    </h1>
                    <Link
                        to="/login"
                        className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-black"
                    >
                        Get started <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="mt-12 w-full">
                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center shadow-sm">
                        <ImageIcon className="h-12 w-12 text-gray-400" />
                    </div>
                </div>
            </section>

            <div className="mt-8 md:mt-10">
                <BusinessTrustedBrands />
            </div>

            <BusinessHowItWorksSection title="How the app works" cards={teamDashboardCards} />

            <BusinessAlternatingFeaturesSection />

            <BusinessTestimonialsSection />

            <BusinessFaqSection />

            <section className="border-t border-gray-100 bg-gray-50 py-24 text-center">
                <div className="mx-auto max-w-3xl px-6">
                    <h2 className="text-4xl font-bold tracking-tight text-gray-900 md:text-6xl">Build a reliable UGC growth engine</h2>
                    <Link
                        to="/login"
                        className="mt-8 inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-black"
                    >
                        Get started <ArrowRight className="h-5 w-5" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
