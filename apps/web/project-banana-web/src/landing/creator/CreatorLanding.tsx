import { ChevronDown, ImageIcon, Sparkles, Download } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const TRUSTED_BRANDS = [
    { name: 'My', url: 'https://static.wikia.nocookie.net/logopedia/images/7/72/.my.png/revision/latest?cb=20220802130206' },
    { name: 'AirAsia', url: 'https://static.wikia.nocookie.net/logopedia/images/7/7e/AirAsia_MOVE_New_Logo.png/revision/latest/scale-to-width-down/1000?cb=20240326091935' },
    { name: 'Digi', url: 'https://static.wikia.nocookie.net/logopedia/images/f/f3/Digi_Telecommunications_logo.svg/revision/latest?cb=20190402142637' },
    { name: 'Tourism Malaysia', url: 'https://static.wikia.nocookie.net/logopedia/images/5/5e/Tourism-malaysia-m.png/revision/latest?cb=20150319083345' },
    { name: 'Proton', url: 'https://static.wikia.nocookie.net/logopedia/images/a/af/Proton_2019.png/revision/latest?cb=20190926041839' },
    { name: 'Julie\'s', url: 'https://static.wikia.nocookie.net/logopedia/images/3/32/Julie%27s_2020.png/revision/latest?cb=20201125211352' },
    { name: 'Munchy\'s', url: 'https://static.wikia.nocookie.net/logopedia/images/0/06/Munchy%27s_2020_Logo.png/revision/latest/scale-to-width-down/1000?cb=20220104083843' }
];

type CreatorStepCard = {
    title: string;
    description: string;
    image: string;
};

const creatorDashboardCards: CreatorStepCard[] = [
    {
        title: '1. Browse campaigns',
        description: 'Discover campaigns you want to join.',
        image: '/landing-creator-step-campaigns.png',
    },
    {
        title: '2. Submit your content',
        description: 'Create and submit your video for approval.',
        image: '/landing-creator-step-review.png',
    },
    {
        title: '3. Post on social media',
        description: 'Post your approved video on IG or TikTok.',
        image: '/landing-creator-step-post.png',
    },
    {
        title: '4. Track your earnings',
        description: 'See your views, earnings, and growth.',
        image: '/landing-creator-step-earnings.png',
    },
];

type AlternatingFeature = {
    title: string;
    description: string;
    image?: string;
};

const newCreatorFeatures: AlternatingFeature[] = [
    {
        title: 'Open campaigns',
        description: 'Jobs are open to anyone that can create regardless of follower count.',
        image: '/landing-creator-campaign.svg',
    },
    {
        title: 'Real-time analytics',
        description: 'Track your content performance and earnings in real-time.',
        image: '/landing-creator-analytics.svg',
    },
    {
        title: 'Secure payouts',
        description: 'Get paid securely based on your content performance.',
        image: '/landing-creator-payout.svg',
    }
];

const creatorTestimonials: { quote: string; author: string; role: string }[] = [];

const creatorFaqs = [
    {
        question: 'Can I start with a new account?',
        answer: 'Yes. Views are all that matter.',
    },
    {
        question: 'Can I have multiple applications for the same campaign?',
        answer: 'Yes as long as the previous one has been approved then you can submit a new one.',
    },
    {
        question: 'Is there a fee for the withdrawals?',
        answer: 'There is no platform fee but there will be a RM1.10 gateway fee charged by the payment provider.',
    },
    {
        question: 'What campaign can I join?',
        answer: 'You can join any campaign that is on the platform.',
    },
    {
        question: 'How to get my post get paid?',
        answer: 'When you join a campaign there are requirements set by the brands. You should read through and only then submit. Every submission needs to be approved to get monetized. After approval, you must include a tracking tag in your post description and copy the post URL back to our platform so we can track its performance.',
    },
    {
        question: 'How do I track the earning of my post?',
        answer: 'Lumina updates earnings on a daily basis. We refresh the data at midnight every day for the previous day\'s performance.',
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
                            <div className="flex-1 w-full bg-[#EBEAE5] rounded-2xl flex items-center justify-center overflow-hidden">
                                {feature.image ? (
                                    <img src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-white flex items-center justify-center">
                                        <ImageIcon className="w-12 h-12 text-gray-400" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
        </section>
    );
}

function CreatorHowItWorksSection({ title, cards }: { title: string; cards: CreatorStepCard[] }) {
    return (
        <section className="py-20">
            <div className="mx-auto max-w-[88rem] px-6">
                <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">{title}</h2>
                <div className="grid grid-cols-1 gap-6 lg:gap-8 md:grid-cols-4">
                    {cards.map((card) => (
                        <article key={card.title} className="overflow-hidden rounded-[2rem] bg-[#F9FAFB] flex flex-col">
                            <div className="flex-1 pb-0 p-6 md:p-10 md:pb-0 w-full flex flex-col justify-start z-10 relative">
                                <h3 className="text-[1.35rem] font-semibold leading-tight tracking-tight text-gray-900 mb-3">{card.title}</h3>
                                <p className="text-[1.05rem] text-gray-600 leading-relaxed">{card.description}</p>
                            </div>
                            <div className="w-full aspect-4/3 overflow-hidden">
                                <img
                                    src={card.image}
                                    alt={card.title}
                                    className="w-full h-full object-cover object-center"
                                />
                            </div>

                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

function CreatorTrustedBrands() {
    if (TRUSTED_BRANDS.length === 0) {
        return null;
    }

    return (
        <section className="py-16 md:py-20">
            <p className="mb-8 text-center text-[15px] font-medium text-gray-600">
                Create for brands you love
            </p>
            <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-8 px-6 md:gap-16">
                {TRUSTED_BRANDS.map((brand) => (
                    brand.url ? (
                        <div
                            key={brand.name}
                            className="flex h-12 md:h-16 w-auto items-center justify-center shrink-0 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300"
                        >
                            <img src={brand.url} alt={brand.name} className="h-full w-auto object-contain" />
                        </div>
                    ) : null
                ))}
            </div>
        </section>
    );
}

function CreatorTestimonialSection() {
    if (creatorTestimonials.length === 0) {
        return null;
    }

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
            <section className="mx-auto w-full max-w-7xl px-6 pt-20 md:pt-24">
                <div className="grid items-center gap-12 md:grid-cols-2 lg:gap-16">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">
                            <Sparkles className="h-3.5 w-3.5" /> Built for Malaysian creators
                        </div>
                        <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-gray-900 md:text-6xl">
                            Get paid with views.
                        </h1>
                        <p className="mt-6 max-w-xl text-xl text-gray-600">
                            Lumina is a open platform for creators like you to earn.
                        </p>
                        <Link
                            to="/login"
                            className="mt-10 inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-black"
                        >
                            Download the app <Download className="h-5 w-5" />
                        </Link>
                    </div>

                    <div className="flex items-center justify-center relative w-full h-full max-w-sm mx-auto">
                        <img src="/creator-home.svg" alt="Creator Home Screen" className="w-full h-full z-10" />
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
                <div className="mx-auto px-6">
                    <h2 className="text-4xl font-bold tracking-tight text-gray-900 md:text-6xl">If you can create, you're in.</h2>
                    <Link
                        to="/login"
                        className="mt-8 inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-black"
                    >
                        Download Lumina<Download className="h-5 w-5" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
