import { useState, useEffect } from 'react';
import { Plus, User, Mail, Building } from 'lucide-react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import Button from '../components/ui/Button';

export default function Settings() {
    const business = useQuery(api.businesses.getMyBusiness);
    const generateLogoUrl = useAction(api.businesses.generateLogoAccessUrl);

    const [businessName, setBusinessName] = useState('');
    const [businessSize, setBusinessSize] = useState('');
    const [logo, setLogo] = useState<string | null>(null);

    // Sync state with fetched business data & handle Logo logic
    useEffect(() => {
        if (business) {
            setBusinessName(business.name);
            setBusinessSize(business.size || '');

            // 1. If we have a stored logo URL (external), use it.
            if (business.logo_url) {
                setLogo(business.logo_url);
                return;
            }

            // 2. If we have an S3 key, fetch a new presigned URL.
            if (business.logo_s3_key) {
                generateLogoUrl({ businessId: business._id })
                    .then((url) => {
                        if (url) {
                            setLogo(url);
                        }
                    })
                    .catch((err) => console.error("Failed to fetch logo URL:", err));
            }
        }
    }, [business, generateLogoUrl]);

    // Show loading only if we have NO business data AND it's undefined
    if (business === undefined && !businessName) {
        return <div className="p-8">Loading...</div>;
    }

    if (business === null) {
        return <div className="p-8">Please complete onboarding first.</div>;
    }

    return (
        <div className="p-8 font-sans text-gray-900 pb-24 animate-fadeIn">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>

            <div className="grid grid-cols-1 gap-8 max-w-4xl">
                {/* Business Profile Section */}
                <section>
                    <h2 className="text-lg font-bold mb-4">Business Profile</h2>
                    <div className="bg-[#F9FAFB] p-8 rounded-3xl">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Logo Upload */}
                            <div className="flex flex-col gap-3 items-center">
                                <div className="w-24 h-24 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-gray-400 transition-colors">
                                    {logo ? (
                                        <img src={logo} alt="Business Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-gray-300">
                                            <Building className="w-8 h-8" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Plus className="w-6 h-6 text-white" />
                                    </div>
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (e) => setLogo(e.target?.result as string);
                                                reader.readAsDataURL(file);
                                                // TODO: Implement actual upload logic here using generateLogoUploadUrl
                                            }
                                        }}
                                    />
                                </div>
                                <span className="text-sm font-medium text-gray-500">Business Logo</span>
                            </div>

                            {/* Business Name */}
                            <div className="flex-1 w-full space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-gray-900 block mb-2">Business Name</label>
                                    <input
                                        type="text"
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all text-gray-900 font-medium placeholder:text-gray-400"
                                        placeholder="Enter your business name"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-900 block mb-2">Company Size</label>
                                    <select
                                        value={businessSize}
                                        onChange={(e) => setBusinessSize(e.target.value)}
                                        className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all text-gray-900 font-medium placeholder:text-gray-400 appearance-none"
                                    >
                                        <option value="" disabled>Select company size</option>
                                        <option value="1-10">1-10 employees</option>
                                        <option value="11-50">11-50 employees</option>
                                        <option value="51-200">51-200 employees</option>
                                        <option value="201-500">201-500 employees</option>
                                        <option value="500+">500+ employees</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Basic Information Section */}
                <section>
                    <h2 className="text-lg font-bold mb-4">Basic Information</h2>
                    <div className="bg-[#F9FAFB] p-8 rounded-3xl space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-900 block">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        defaultValue="Ley Kwan"
                                        className="w-full bg-white border border-gray-100 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all text-gray-900 font-medium placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-900 block">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="email"
                                        defaultValue="leykwan@example.com"
                                        className="w-full bg-white border border-gray-100 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all text-gray-900 font-medium placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end pt-4">
                    <Button>
                        Save Changes
                    </Button>
                </div>
            </div >
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out forwards;
                }
            `}</style>
        </div >
    );
}
