import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const storySections = [
    {
        eyebrow: 'Where we began',
        title: 'Open Platform for Content Creation.',
        body: 'Lumina started with a question, what if everyone is able to earn from making videos? What if brands are able to engage with public directly? Does content creation only belongs to those mega influencer? Why can\'t you and me do it? That\'s how Lumina was born.',
    },
    {
        eyebrow: 'Where we are heading',
        title: 'The Modern Content Creation Hub.',
        body: "We take pride in building the future content ecosystem that is open and transparent for our creators and brand partners. A platform that is built for everyone that loves content creation.",
    },
];

export default function AboutPage() {
    return (
        <div className="animate-in fade-in duration-500">
            {/* Hero */}
            <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-16 md:pt-24">
                <div className="max-w-3xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-400">About Lumina</p>
                    <h1 className="mt-5 text-4xl font-medium tracking-tight text-gray-900 sm:text-5xl md:text-[3.25rem] md:leading-[1.1]">
                        We believe everyone should be able to make content and earn.
                    </h1>
                </div>
            </section>

            {/* Divider */}
            <div className="mx-auto max-w-7xl px-6">
                <div className="h-px bg-gray-100" />
            </div>

            {/* Story Sections */}
            <section className="py-0">
                {storySections.map((section) => (
                    <div key={section.eyebrow} className="mx-auto w-full max-w-7xl px-6">
                        {/* Mobile: single column, eyebrow inline above title. Desktop: two-column label/content grid */}
                        <div className="border-b border-gray-100 py-12 md:py-16 lg:grid lg:grid-cols-[1fr_1.6fr] lg:gap-24 lg:items-start lg:py-20">
                            {/* Eyebrow — hidden on mobile, shown in left column on lg */}
                            <div className="hidden lg:block">
                                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-400">
                                    {section.eyebrow}
                                </p>
                            </div>
                            <div>
                                {/* Eyebrow — shown on mobile, hidden on lg */}
                                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-gray-400 lg:hidden">
                                    {section.eyebrow}
                                </p>
                                <h2 className="text-2xl font-medium tracking-tight text-gray-900 md:text-[2rem] md:leading-snug">
                                    {section.title}
                                </h2>
                                <p className="mt-4 text-lg text-gray-500 leading-relaxed max-w-xl">
                                    {section.body}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Who's getting us there — with founder image */}
                <div className="mx-auto w-full max-w-7xl px-6">
                    <div className="py-12 md:py-16 lg:grid lg:grid-cols-[1fr_1.6fr] lg:gap-24 lg:items-start lg:py-20">
                        {/* Eyebrow — left column on lg */}
                        <div className="hidden lg:block">
                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-400">
                                Who's getting us there
                            </p>
                        </div>
                        <div>
                            {/* Eyebrow — mobile only */}
                            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-gray-400 lg:hidden">
                                Who's getting us there
                            </p>
                            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                                {/* Founder Image */}
                                <div className="shrink-0">
                                    <img
                                        src="/founder-leykwanchoo.png"
                                        alt="Ley Kwan Choo, Founder of Lumina"
                                        className="h-24 w-24 rounded-2xl object-cover sm:h-28 sm:w-28"
                                    />
                                </div>
                                {/* Founder Info */}
                                <div>
                                    <h2 className="text-2xl font-medium tracking-tight text-gray-900 md:text-[2rem]">
                                        Ley Kwan Choo
                                    </h2>
                                    <p className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-gray-400">Founder</p>
                                    <p className="mt-4 text-lg text-gray-500 leading-relaxed max-w-xl">
                                        Building & growing Lumina
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="border-t border-gray-100 bg-gray-50 py-24 text-center">
                <div className="mx-auto max-w-3xl px-6">
                    <h2 className="text-4xl font-medium tracking-tight text-gray-900 md:text-5xl">
                        See how Lumina works
                    </h2>
                    <p className="mt-5 text-lg leading-8 text-gray-500">
                        Explore the platform from both sides — for creators and brands.
                    </p>
                    <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Link
                            to="/business"
                            className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-black"
                        >
                            For business
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-900 transition-colors hover:bg-gray-50"
                        >
                            For creators
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
