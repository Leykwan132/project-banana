const sections = [
    {
        title: 'Terms and conditions',
        content: (
            <>
                <p>
                    These terms and conditions apply to the Lumina app (hereby referred to as the &quot;Application&quot;) for mobile devices that was
                    created by MorphSwift Studio (hereby referred to as the &quot;Service Provider&quot;) as a free service.
                </p>
                <p>
                    Upon downloading or utilising the Application, you are automatically agreeing to the following terms. It is strongly advised that you
                    thoroughly read and understand these terms prior to using the Application.
                </p>
                <p>
                    Unauthorized copying, modification of the Application, any part of the Application, or our trademarks is strictly prohibited. Any
                    attempts to extract the source code of the Application, translate the Application into other languages, or create derivative versions
                    are not permitted. All trademarks, copyrights, database rights, and other intellectual property rights related to the Application
                    remain the property of the Service Provider.
                </p>
                <p>
                    The Service Provider is dedicated to ensuring that the Application is as beneficial and efficient as possible. As such, they reserve
                    the right to modify the Application or charge for their services at any time and for any reason. The Service Provider assures you that
                    any charges for the Application or its services will be clearly communicated to you.
                </p>
            </>
        ),
    },
    {
        title: 'Use of the application',
        content: (
            <>
                <p>
                    The Application stores and processes personal data that you have provided to the Service Provider in order to provide the service. It is
                    your responsibility to maintain the security of your phone and access to the Application.
                </p>
                <p>
                    The Service Provider strongly advises against jailbreaking or rooting your phone, which involves removing software restrictions and
                    limitations imposed by the official operating system of your device. Such actions could expose your phone to malware, viruses, malicious
                    programs, compromise your phone&apos;s security features, and may result in the Application not functioning correctly or at all.
                </p>
            </>
        ),
    },
    {
        title: 'Connectivity and charges',
        content: (
            <>
                <p>
                    Please be aware that the Service Provider does not assume responsibility for certain aspects. Some functions of the Application require
                    an active internet connection, which can be Wi-Fi or provided by your mobile network provider. The Service Provider cannot be held
                    responsible if the Application does not function at full capacity due to lack of access to Wi-Fi or if you have exhausted your data
                    allowance.
                </p>
                <p>
                    If you are using the Application outside of a Wi-Fi area, please be aware that your mobile network provider&apos;s agreement terms still
                    apply. Consequently, you may incur charges from your mobile provider for data usage during the connection to the Application, or other
                    third-party charges.
                </p>
                <p>
                    By using the Application, you accept responsibility for any such charges, including roaming data charges if you use the Application
                    outside of your home territory without disabling data roaming. If you are not the bill payer for the device on which you are using the
                    Application, they assume that you have obtained permission from the bill payer.
                </p>
            </>
        ),
    },
    {
        title: 'Your responsibilities',
        content: (
            <>
                <p>
                    Similarly, the Service Provider cannot always assume responsibility for your usage of the Application. For instance, it is your
                    responsibility to ensure that your device remains charged. If your device runs out of battery and you are unable to access the service,
                    the Service Provider cannot be held responsible.
                </p>
                <p>
                    In terms of the Service Provider&apos;s responsibility for your use of the Application, it is important to note that while they strive to
                    ensure that it is updated and accurate at all times, they do rely on third parties to provide information to them so that they can make
                    it available to you. The Service Provider accepts no liability for any loss, direct or indirect, that you experience as a result of
                    relying entirely on this functionality of the Application.
                </p>
            </>
        ),
    },
    {
        title: 'Updates and termination',
        content: (
            <>
                <p>
                    The Service Provider may wish to update the Application at some point. The Application is currently available in accordance with the
                    operating system requirements, and the requirements for any additional systems they decide to extend the availability of the Application
                    to may change. You will need to download updates if you want to continue using the Application.
                </p>
                <p>
                    The Service Provider does not guarantee that it will always update the Application so that it is relevant to you and/or compatible with
                    the particular operating system version installed on your device. However, you agree to always accept updates to the Application when
                    offered to you.
                </p>
                <p>
                    The Service Provider may also wish to cease providing the Application and may terminate its use at any time without providing
                    termination notice to you. Unless they inform you otherwise, upon any termination, (a) the rights and licenses granted to you in these
                    terms will end; (b) you must cease using the Application, and (if necessary) delete it from your device.
                </p>
            </>
        ),
    },
    {
        title: 'Changes to these terms and conditions',
        content: (
            <>
                <p>
                    The Service Provider may periodically update their Terms and Conditions. Therefore, you are advised to review this page regularly for
                    any changes. The Service Provider will notify you of any changes by posting the new Terms and Conditions on this page.
                </p>
                <p className="font-medium text-gray-900">These terms and conditions are effective as of 2026-04-01.</p>
            </>
        ),
    },
    {
        title: 'Contact us',
        content: (
            <p>
                If you have any questions or suggestions about the Terms and Conditions, please do not hesitate to contact the Service Provider at{' '}
                <a href="mailto:admin@lumina-app.my" className="text-gray-900 underline underline-offset-4">
                    admin@lumina-app.my
                </a>
                .
            </p>
        ),
    },
];

export default function TermsAndConditionsPage() {
    return (
        <div className="animate-in fade-in duration-500">
            <section className="mx-auto w-full max-w-3xl px-5 pb-20 pt-16 sm:px-6 md:pt-24">
                <header className="border-b border-gray-100 pb-8">
                    <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                        Terms &amp; Conditions
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
