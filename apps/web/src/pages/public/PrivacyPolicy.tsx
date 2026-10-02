const informationCollectionItems = [
    "Your device's Internet Protocol address (for example, IP address)",
    'The pages of the Application that you visit, the time and date of your visit, and the time spent on those pages',
    'The time spent on the Application',
    'The operating system you use on your mobile device',
];

const thirdPartyDisclosureItems = [
    'as required by law, such as to comply with a subpoena, or similar legal process;',
    'when they believe in good faith that disclosure is necessary to protect their rights, protect your safety or the safety of others, investigate fraud, or respond to a government request;',
    'with their trusted services providers who work on their behalf, do not have an independent use of the information we disclose to them, and have agreed to adhere to the rules set forth in this privacy statement.',
];

const sections = [
    {
        title: 'Information collection and use',
        content: (
            <>
                <p>
                    This privacy policy applies to the Lumina app (hereby referred to as the &quot;Application&quot;) for mobile devices that was created by
                    MorphSwift Studio (hereby referred to as the &quot;Service Provider&quot;) as a free service. This service is intended for use &quot;AS IS&quot;.
                </p>
                <p>
                    The Application collects information when you download and use it. This information may include:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                    {informationCollectionItems.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
                <p>The Application does not gather precise information about the location of your mobile device.</p>
                <p>The Application does not use Artificial Intelligence (AI) technologies to process your data or provide features.</p>
                <p>
                    The Service Provider may use the information you provided to contact you from time to time to provide you with important information,
                    required notices, and marketing promotions.
                </p>
                <p>
                    For a better experience, while using the Application, the Service Provider may require you to provide certain personally identifiable
                    information. The information requested will be retained by the Service Provider and used as described in this privacy policy.
                </p>
            </>
        ),
    },
    {
        title: 'Third party access',
        content: (
            <>
                <p>
                    Only aggregated, anonymized data is periodically transmitted to external services to aid the Service Provider in improving the
                    Application and its service. The Service Provider may share your information with third parties in the ways described in this privacy
                    statement.
                </p>
                <p>The Service Provider may disclose user-provided and automatically collected information:</p>
                <ul className="list-disc space-y-2 pl-5">
                    {thirdPartyDisclosureItems.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </>
        ),
    },
    {
        title: 'Opt-out rights',
        content: (
            <p>
                You can stop all collection of information by the Application easily by uninstalling it. You may use the standard uninstall processes
                available as part of your mobile device or through the mobile application marketplace or network.
            </p>
        ),
    },
    {
        title: 'Data retention policy',
        content: (
            <p>
                The Service Provider will retain user-provided data for as long as you use the Application and for a reasonable time thereafter. If you
                would like the Service Provider to delete user-provided data that you have provided via the Application, please contact{' '}
                <a href="mailto:admin@lumina-app.my" className="text-gray-900 underline underline-offset-4">
                    admin@lumina-app.my
                </a>{' '}
                and they will respond within a reasonable time.
            </p>
        ),
    },
    {
        title: 'Children',
        content: (
            <>
                <p>
                    The Service Provider does not use the Application to knowingly solicit data from or market to children under the age of 13.
                </p>
                <p>
                    The Service Provider does not knowingly collect personally identifiable information from children. The Service Provider encourages all
                    children to never submit any personally identifiable information through the Application and/or Services. The Service Provider encourages
                    parents and legal guardians to monitor their children&apos;s internet usage and to help enforce this policy by instructing their children
                    never to provide personally identifiable information through the Application and/or Services without permission.
                </p>
                <p>
                    If you have reason to believe that a child has provided personally identifiable information to the Service Provider through the
                    Application and/or Services, please contact{' '}
                    <a href="mailto:admin@lumina-app.my" className="text-gray-900 underline underline-offset-4">
                        admin@lumina-app.my
                    </a>{' '}
                    so that the Service Provider can take the necessary actions.
                </p>
                <p>
                    You must also be at least 16 years of age to consent to the processing of your personally identifiable information in your country. In
                    some countries, a parent or guardian may be allowed to do so on your behalf.
                </p>
            </>
        ),
    },
    {
        title: 'Security',
        content: (
            <p>
                The Service Provider is concerned about safeguarding the confidentiality of your information. The Service Provider provides physical,
                electronic, and procedural safeguards to protect the information it processes and maintains.
            </p>
        ),
    },
    {
        title: 'Changes',
        content: (
            <>
                <p>
                    This Privacy Policy may be updated from time to time for any reason. The Service Provider will notify you of any changes by updating
                    this page with the new Privacy Policy.
                </p>
                <p>
                    You are advised to consult this Privacy Policy regularly for any changes, as continued use is deemed approval of all changes.
                </p>
                <p className="font-medium text-gray-900">This privacy policy is effective as of 2026-04-01.</p>
            </>
        ),
    },
    {
        title: 'Your consent',
        content: (
            <p>
                By using the Application, you are consenting to the processing of your information as set forth in this Privacy Policy now and as amended
                by the Service Provider.
            </p>
        ),
    },
    {
        title: 'Contact us',
        content: (
            <p>
                If you have any questions regarding privacy while using the Application, or have questions about the practices, please contact the Service
                Provider via email at{' '}
                <a href="mailto:admin@lumina-app.my" className="text-gray-900 underline underline-offset-4">
                    admin@lumina-app.my
                </a>
                .
            </p>
        ),
    },
];

export default function PrivacyPolicyPage() {
    return (
        <div className="animate-in fade-in duration-500">
            <section className="mx-auto w-full max-w-3xl px-5 pb-20 pt-16 sm:px-6 md:pt-24">
                <header className="border-b border-gray-100 pb-8">
                    <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                        Privacy policy
                    </h1>
                    <p className="mt-4 text-sm leading-7 text-gray-500 sm:text-base">
                        Effective date: April 1, 2026
                    </p>
                </header>

                <article className="space-y-10 pt-8 text-[15px] leading-7 text-gray-600 sm:text-base sm:leading-8">
                    {sections.map((section) => (
                        <section key={section.title} className="space-y-4">
                            <h2 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
                                {section.title}
                            </h2>
                            <div className="space-y-4">{section.content}</div>
                        </section>
                    ))}
                </article>
            </section>
        </div>
    );
}
