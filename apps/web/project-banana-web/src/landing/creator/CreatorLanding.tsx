import { ChevronDown, ImageIcon, Sparkles, Download } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const SHARED_VIDEO_URL = '/1.webm';

type CreatorVideoCard = {
    title: string;
    description: string;
};

const creatorDashboardCards: CreatorVideoCard[] = [
    {
        title: '1. Campaign feed',
        description: 'Discover open opportunities.',
    },
    {
        title: '2. Submission inbox',
        description: 'Ship final content.',
    },
    {
        title: '3. Payment tracker',
        description: 'Real-time payout tracking.',
    },
    {
        title: '4. Performance snapshots',
        description: 'Review performance insights.',
    },
];

type AlternatingFeature = {
    title: string;
    description: string;
};

const newCreatorFeatures: AlternatingFeature[] = [
    {
        title: 'Premium campaign feed',
        description: 'Access exclusive opportunities from top brands and claim the jobs that fit your style.',
    },
    {
        title: 'Streamlined submission inbox',
        description: 'Upload your drafts, receive clear feedback, and get your content approved faster.',
    },
    {
        title: 'Guaranteed 48-hour payouts',
        description: 'Never chase an invoice again. Get paid securely as soon as your content is approved.',
    },
    {
        title: 'Grow your portfolio',
        description: 'Build your reputation on the platform and unlock higher-paying campaigns over time.',
    }
];

const creatorTestimonials = [
    {
        quote: 'I used to chase brands in DMs. Now I open one dashboard, claim a brief, and start shooting.',
        author: 'Alicia M.',
        role: 'UGC Creator',
    },
    {
        quote: 'The escrow flow is the biggest win. I know exactly when I will get paid after approval.',
        author: 'Darren P.',
        role: 'Tech Creator',
    },
    {
        quote: 'Feedback is clear and organized, so I spend more time creating and less time managing messages.',
        author: 'Nina R.',
        role: 'Lifestyle Creator',
    },
];

const creatorFaqs = [
    {
        question: 'How do creators get paid?',
        answer: 'Each campaign budget is secured in escrow. After brand approval, payout is released to your connected account.',
    },
    {
        question: 'Do I need a large following to join?',
        answer: 'No. Brands can filter by niche, content quality, and fit. Strong creators of all sizes can land work.',
    },
    {
        question: 'Can I track all my active submissions?',
        answer: 'Yes. Your dashboard shows each campaign stage from draft, revisions, approval, and payout.',
    },
    {
        question: 'Is there a platform fee for creators?',
        answer: 'Creators keep their agreed campaign payout. No hidden percentage is taken from your earnings.',
    },
];



function CreatorAlternatingFeaturesSection() {
    return (
        <section className="py-24 bg-white flex flex-col gap-24 lg:gap-32">
            {newCreatorFeatures.map((feature, index) => {
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

function CreatorHowItWorksSection({ title, cards }: { title: string; cards: CreatorVideoCard[] }) {
    return (
        <section className="py-20">
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

function CreatorTrustedBrands() {
    const brands = ['Stripe', 'OpenAI', 'Linear', 'Datadog', 'NVIDIA', 'Figma', 'Ramp', 'Adobe'];

    return (
        <section className="py-24 md:py-32">
            <p className="mb-8 text-center text-[15px] font-medium text-gray-600">
                Trusted by local companies
            </p>
            <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-3 px-6 md:flex-nowrap md:gap-4">
                {brands.map((brand) => (
                    <div
                        key={brand}
                        className="flex h-18 w-full max-w-36 shrink-0 items-center justify-center rounded-xl bg-[#f9f9f9] text-lg font-bold tracking-tight text-gray-900 md:max-w-none md:flex-1"
                    >
                        {brand}
                    </div>
                ))}
            </div>
        </section>
    );
}

function CreatorTestimonialSection() {
    return (
        <section className="border-y border-gray-100 bg-gray-50 py-20">
            <div className="mx-auto max-w-7xl px-6">
                <div className="mx-auto mb-10 max-w-3xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">Creators stay because the workflow works</h2>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {creatorTestimonials.map((testimonial) => (
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

function CreatorFaqSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="py-20">
            <div className="mx-auto max-w-3xl px-6">
                <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">FAQs</h2>
                <div className="mt-10 space-y-4">
                    {creatorFaqs.map((faq, index) => {
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

export default function CreatorLanding() {
    return (
        <div className="animate-in fade-in duration-500">
            <section className="mx-auto w-full max-w-7xl px-6 pb-20 pt-20 md:pt-24">
                <div className="grid items-center gap-12 md:grid-cols-2 lg:gap-16">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">
                            <Sparkles className="h-3.5 w-3.5" /> Built for serious UGC creators
                        </div>
                        <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-gray-900 md:text-6xl">
                            Get paid faster for content brands can actually use.
                        </h1>
                        <p className="mt-6 max-w-xl text-xl text-gray-600">
                            Youniq connects creators with verified briefs, keeps approvals organized, and releases secure payouts after delivery.
                        </p>
                        <Link
                            to="/login"
                            className="mt-10 inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-black"
                        >
                            Download the app <Download className="h-5 w-5" />
                        </Link>
                    </div>

                    <div className="flex items-center justify-center relative w-full h-full max-w-sm mx-auto">
                        <div className="relative flex aspect-9/16 w-full max-w-sm items-center justify-center rounded-[2.2rem] border-12 border-gray-100 bg-gray-50 shadow-2xl z-10">
                            <ImageIcon className="h-14 w-14 text-gray-400" />
                        </div>
                    </div>
                </div>
            </section>

            <div className="mt-8 md:mt-10">
                <CreatorTrustedBrands />
            </div>

            <CreatorHowItWorksSection title="How the app works" cards={creatorDashboardCards} />

            <CreatorAlternatingFeaturesSection />

            <CreatorTestimonialSection />

            <CreatorFaqSection />

            <section className="border-t border-gray-100 bg-gray-50 py-24 text-center">
                <div className="mx-auto max-w-3xl px-6">
                    <h2 className="text-4xl font-bold tracking-tight text-gray-900 md:text-6xl">Start landing better UGC work today</h2>
                    <p className="mt-4 text-lg text-gray-600">Create once, deliver with confidence, and get paid on time.</p>
                    <Link
                        to="/login"
                        className="mt-8 inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-black"
                    >
                        Download the app <Download className="h-5 w-5" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
