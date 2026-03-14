import { ArrowRight } from 'lucide-react';
import { CHAT_SUPPORT_URL, CONTACT_EMAIL, REPORT_ISSUE_FORM_URL } from '../../lib/support-links';

type SupportItem = {
    title: string;
    description: string;
    label: string;
    href: string;
};

const supportItems: SupportItem[] = [
    {
        title: 'Email support',
        description: `Email us at ${CONTACT_EMAIL}`,
        label: 'Email us',
        href: `mailto:${CONTACT_EMAIL}`,
    },
    {
        title: 'Chat support',
        description: 'Reach us directly on WhatsApp.',
        label: 'Chat now',
        href: CHAT_SUPPORT_URL,
    },
    {
        title: 'Report an issue',
        description: 'We really appreciate you helping us improve the platform.',
        label: 'Submit report',
        href: REPORT_ISSUE_FORM_URL,
    },
];

export default function SupportPage() {
    return (
        <div className="animate-in fade-in duration-500">
            <section className="mx-auto w-full max-w-7xl px-6 pb-12 pt-16 md:pt-24">
                <div className="max-w-4xl">
                    <h1 className="text-4xl font-medium tracking-tight text-gray-900 sm:text-5xl md:text-[3.25rem] md:leading-[1.1]">
                        Need help? <br className="hidden md:block" />
                        Here is how to reach Lumina.
                    </h1>
                    <p className="mt-6 max-w-2xl text-xl text-gray-500">
                        We are ready to help. Contact us immediately.
                    </p>
                </div>
            </section>

            <section className="pb-20">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {supportItems.map((item) => (
                            <article key={item.title} className="flex min-h-[260px] flex-col rounded-[2rem] bg-[#F9FAFB] p-8 md:p-10">
                                <h2 className="text-[1.6rem] font-semibold leading-tight tracking-tight text-gray-900">
                                    {item.title}
                                </h2>
                                <p className="mt-4 flex-1 text-[1.05rem] leading-relaxed text-gray-600">
                                    {item.description}
                                </p>
                                <a
                                    href={item.href}
                                    target={item.href.startsWith('http') ? '_blank' : undefined}
                                    rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                                    className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-gray-900 transition-colors hover:text-gray-600"
                                >
                                    {item.label}
                                    <ArrowRight className="h-4 w-4" />
                                </a>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-t border-gray-100 bg-gray-50 py-24 text-center">
                <div className="mx-auto max-w-3xl px-6">
                    <h2 className="text-4xl font-bold tracking-tight text-gray-900 md:text-6xl">
                        We are here to help you move faster
                    </h2>
                    <a
                        href={`mailto:${CONTACT_EMAIL}`}
                        className="mt-8 inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-black"
                    >
                        Email the team
                        <ArrowRight className="h-5 w-5" />
                    </a>
                </div>
            </section>
        </div>
    );
}
