import { ArrowRight, ChevronDown } from 'lucide-react';
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

type BusinessVideoCard = {
    title: string;
    description: string;
    image: string;
};



const teamDashboardCards: BusinessVideoCard[] = [
    {
        title: '1. Create Campaigns',
        description: 'Set up requirements for the campaigns.',
        image: '/landing-creator-step-campaigns.png',
    },
    {
        title: '2. Review submissions',
        description: 'Review all the submission by the creators.',
        image: '/landing-creator-step-review.png',
    },
    {
        title: '3. Track performance',
        description: 'Real-time performance tracking.',
        image: '/landing-biz-step-analytics.png',
    },
    {
        title: '4. Automated payouts',
        description: 'Lumina handles the payment to the creators.',
        image: '/landing-creator-step-earnings.png',
    },
];

type AlternatingFeature = {
    title: string;
    description: string;
    image: string;
};

const newBusinessFeatures: AlternatingFeature[] = [
    {
        title: 'Easy Campaign Setup',
        description: 'Launch your first campaigns under 5 minutes.',
        image: '/landing-setup-campaign.png',
    },
    {
        title: 'Automated tracking & payouts',
        description: 'Lumina tracks posts performance & handles payouts automatically.',
        image: '/landing-automated-payout.png',
    },
    {
        title: 'Real-time performance analytics',
        description: 'Track the ROI of every piece of content with real-time performance data and actionable insights.',
        image: '/landing-analytics.png',
    }
];

const businessTestimonials: { quote: string; author: string; role: string }[] = [
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
        question: 'Do I have to manually pay the creators?',
        answer: 'No Lumina will handle all the payment automatically.',
    },
    {
        question: 'Does it cost to create a campaign?',
        answer: "For pay-as-you-go, it's RM 100 flat. Otherwise other subscription plan has its own limit.",
    },
    {
        question: 'Can Lumina support Instagram and TikTok?',
        answer: 'Pay As You Go is limited to Instagram only. TikTok is only for Starter, Growth and Unlimited.',
    },
    {
        question: 'What is the monthly assisted review?',
        answer: 'Team Lumina will have assistance to help review the submission.',
    },
    {
        question: 'What platform is supported?',
        answer: 'TikTok and Instagram depending on the plan you are on.',
    },
    {
        question: 'How is the content approved?',
        answer: 'When the user submits, it will need to be reviewed; then only it will be calculated.',
    },
    {
        question: 'Can I refund my credits?',
        answer: 'Yes there will be a RM1.10 gateway service fee charge by the payment gateway provider.',
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
                            <div className="flex-1 w-full flex items-center justify-center">
                                <img src={feature.image} alt={feature.title} className="w-full h-auto object-contain" />
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
        <section className="py-20">
            <div className="mx-auto max-w-352 px-6">
                <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">{title}</h2>
                <div className="grid grid-cols-1 gap-6 lg:gap-8 md:grid-cols-4">
                    {cards.map((card) => (
                        <article key={card.title} className="overflow-hidden rounded-4xl bg-[#F9FAFB] flex flex-col">
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

function BusinessTrustedBrands() {
    if (TRUSTED_BRANDS.length === 0) {
        return null;
    }

    return (
        <section className="py-4">
            <p className="mb-8 text-center text-[15px] font-medium text-gray-600">
                Trusted by top brands
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

function BusinessTestimonialsSection() {
    if (businessTestimonials.length === 0) {
        return null;
    }

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
                        Bet on UGC today.<br className="hidden md:block" />
                        Lumina make the process easy.
                    </h1>
                    <Link
                        to="/login"
                        className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-black"
                    >
                        Get started <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="mt-12 w-full">
                    <div className="relative h-full w-full overflow-hidden">
                        <img src="/biz-hero.png" alt="Lumina dashboard" className="h-full w-full object-cover" />
                    </div>
                </div>
            </section>

            <div className="mt-8 md:mt-10">
                <BusinessTrustedBrands />
            </div>

            <BusinessHowItWorksSection title="How Lumina works" cards={teamDashboardCards} />

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
