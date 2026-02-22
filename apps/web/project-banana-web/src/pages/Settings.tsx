import { useState, useEffect } from 'react';
import { Plus, Building } from 'lucide-react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';

const industryOptions = ['E-commerce', 'SaaS', 'Agency', 'Health', 'Education', 'Fintech', 'Food & Beverage', 'Other'];
const sizeOptions = ['1-10', '11-50', '51-200', '201-500', '500+'];

export default function Settings() {
    const business = useQuery(api.businesses.getMyBusiness);
    const generateLogoUrl = useAction(api.businesses.generateLogoAccessUrl);
    const updateBusiness = useMutation(api.businesses.updateBusiness);

    const [businessName, setBusinessName] = useState('');
    const [businessSize, setBusinessSize] = useState('');
    const [businessIndustry, setBusinessIndustry] = useState('E-commerce');
    const [customIndustry, setCustomIndustry] = useState('');
    const [logo, setLogo] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Sync state with fetched business data & handle logo logic
    useEffect(() => {
        if (business) {
            setBusinessName(business.name);
            setBusinessSize(business.size || '');
            if (business.industry && industryOptions.includes(business.industry)) {
                setBusinessIndustry(business.industry);
                setCustomIndustry('');
            } else if (business.industry) {
                setBusinessIndustry('Other');
                setCustomIndustry(business.industry);
            } else {
                setBusinessIndustry('E-commerce');
                setCustomIndustry('');
            }

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
                return;
            }

            setLogo(null);
            return;
        }

        setBusinessName('');
        setBusinessSize('');
        setBusinessIndustry('E-commerce');
        setCustomIndustry('');
        setLogo(null);
    }, [business, generateLogoUrl]);

    if (business === undefined) {
        return <div className="p-8">Loading...</div>;
    }

    if (business === null) {
        return <div className="p-8">Please complete onboarding first.</div>;
    }

    const initialName = business.name;
    const initialSize = business.size || '';
    const initialIndustry = business.industry || '';
    const currentIndustry = businessIndustry === 'Other' ? customIndustry.trim() : businessIndustry;
    const hasChanges =
        businessName !== initialName ||
        businessSize !== initialSize ||
        currentIndustry !== initialIndustry;

    const handleStartEdit = () => {
        setError('');
        setIsEditing(true);
    };

    const handleCancel = () => {
        setBusinessName(initialName);
        setBusinessSize(initialSize);
        if (initialIndustry && industryOptions.includes(initialIndustry)) {
            setBusinessIndustry(initialIndustry);
            setCustomIndustry('');
        } else if (initialIndustry) {
            setBusinessIndustry('Other');
            setCustomIndustry(initialIndustry);
        } else {
            setBusinessIndustry('E-commerce');
            setCustomIndustry('');
        }
        setError('');
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!hasChanges || isSaving) return;
        setIsSaving(true);
        setError('');
        try {
            await updateBusiness({
                businessId: business._id,
                name: businessName.trim(),
                size: businessSize,
                industry: currentIndustry || undefined,
            });
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to update business:', err);
            setError('Unable to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

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
                                <div className={`w-24 h-24 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden relative transition-colors ${isEditing ? 'group cursor-pointer hover:border-gray-400' : 'cursor-default'}`}>
                                    {logo ? (
                                        <img src={logo} alt="Business Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-gray-300">
                                            <Building className="w-8 h-8" />
                                        </div>
                                    )}
                                    {isEditing && (
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Plus className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        disabled={!isEditing}
                                        className={`absolute inset-0 opacity-0 ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}
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
                                        readOnly={!isEditing}
                                        className={`w-full border rounded-xl px-4 py-3 outline-none transition-all text-gray-900 font-medium placeholder:text-gray-400 ${isEditing
                                            ? 'bg-white border-gray-100 focus:ring-2 focus:ring-gray-200'
                                            : 'bg-gray-50 border-gray-200 cursor-default'
                                            }`}
                                        placeholder="Enter your business name"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-900 block mb-2">Industry</label>
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                {industryOptions.map((option) => {
                                                    const selected = businessIndustry === option;
                                                    return (
                                                        <button
                                                            key={option}
                                                            type="button"
                                                            aria-pressed={selected}
                                                            onClick={() => setBusinessIndustry(option)}
                                                            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all text-left ${selected
                                                                ? 'bg-gray-100 text-gray-900 border-gray-900 ring-1 ring-gray-900 shadow-sm'
                                                                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            <span>{option}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {businessIndustry === 'Other' && (
                                                <input
                                                    type="text"
                                                    value={customIndustry}
                                                    onChange={(e) => setCustomIndustry(e.target.value)}
                                                    placeholder="Please specify your industry"
                                                    className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-200 transition-all text-gray-900 font-medium placeholder:text-gray-400"
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-medium">
                                            {initialIndustry || '-'}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-900 block mb-2">Company Size</label>
                                    {isEditing ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                            {sizeOptions.map((option) => {
                                                const selected = businessSize === option;
                                                return (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        aria-pressed={selected}
                                                        onClick={() => setBusinessSize(option)}
                                                        className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all text-left ${selected
                                                            ? 'bg-gray-100 text-gray-900 border-gray-900 ring-1 ring-gray-900 shadow-sm'
                                                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <span>{option}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-medium">
                                            {businessSize || '-'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end pt-4">
                    {!isEditing && (
                        <button
                            type="button"
                            onClick={handleStartEdit}
                            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-900 border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            Edit
                        </button>
                    )}
                    {isEditing && (
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                Cancel
                            </button>
                            {hasChanges && (
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSaving || !businessName.trim() || (businessIndustry === 'Other' && !customIndustry.trim())}
                                    className="rounded-xl bg-[#1C1C1C] text-white px-5 py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? 'Saving...' : 'Save changes'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
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
