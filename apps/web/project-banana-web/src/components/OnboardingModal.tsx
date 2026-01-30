import { useState } from 'react';
import { useMutation, useAction } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import Button from './ui/Button';
import { Upload, Loader2 } from 'lucide-react';

interface OnboardingModalProps {
    isOpen: boolean;
}

export default function OnboardingModal({ isOpen }: OnboardingModalProps) {
    const [name, setName] = useState('');
    const [industry, setIndustry] = useState('E-commerce');
    const [size, setSize] = useState('1-10');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const createBusiness = useMutation(api.businesses.createBusiness);
    const generateUploadUrl = useAction(api.businesses.generateLogoUploadUrl);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            let s3Key = undefined;

            if (file) {
                // 1. Get Upload URL
                const { uploadUrl, s3Key: key } = await generateUploadUrl({ contentType: file.type });

                // 2. Upload File
                const result = await fetch(uploadUrl, {
                    method: "PUT",
                    body: file,
                    headers: { "Content-Type": file.type },
                });

                if (!result.ok) {
                    throw new Error("Failed to upload image");
                }
                s3Key = key;
            }

            // 3. Create Business
            await createBusiness({
                name,
                industry,
                size,
                logo_s3_key: s3Key,
            });

            // Success! The parent component will re-render and hide this modal likely
            // But we can just stop loading.

        } catch (err) {
            console.error(err);
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl relative overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[750px]">

                {/* Left Side - Form */}
                <div className="p-20 flex flex-col justify-center">
                    <div className="mb-12">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">Welcome! 👋</h2>
                        <p className="text-gray-500 text-lg">Let's set up your business profile.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10">
                        <div className="space-y-8">
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-3">Business Name</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Acme Corp"
                                    className="w-full bg-[#F9FAFB] border-2 border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-5 py-4 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 text-lg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-3">Industry</label>
                                    <select
                                        value={industry}
                                        onChange={(e) => setIndustry(e.target.value)}
                                        className="w-full bg-[#F9FAFB] border-2 border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-5 py-4 outline-none transition-all font-medium text-gray-900 appearance-none text-lg"
                                    >
                                        <option value="E-commerce">E-commerce</option>
                                        <option value="SaaS">SaaS</option>
                                        <option value="Agency">Agency</option>
                                        <option value="Health">Health</option>
                                        <option value="Education">Education</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-3">Size</label>
                                    <select
                                        value={size}
                                        onChange={(e) => setSize(e.target.value)}
                                        className="w-full bg-[#F9FAFB] border-2 border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-5 py-4 outline-none transition-all font-medium text-gray-900 appearance-none text-lg"
                                    >
                                        <option value="1-10">1-10</option>
                                        <option value="11-50">11-50</option>
                                        <option value="51-200">51-200</option>
                                        <option value="200+">200+</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-3">Logo (Optional)</label>
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 rounded-2xl bg-[#F9FAFB] border-2 border-transparent flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-gray-300 transition-colors">
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <Upload className="w-8 h-8 text-gray-400" />
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>
                                    <div className="text-sm text-gray-500 space-y-1">
                                        <p className="font-bold text-gray-900">Upload your logo</p>
                                        <p>Recommended size: 400x400px</p>
                                        <p>Max size: 2MB</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm font-medium bg-red-50 p-5 rounded-xl">
                                {error}
                            </div>
                        )}

                        <Button
                            disabled={isLoading || !name}
                            className="w-full justify-center py-5 text-xl bg-[#1C1C1C] hover:bg-black text-white border-transparent shadow-2xl shadow-black/10 rounded-xl"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                                    Creating Profile...
                                </>
                            ) : (
                                "Get Started"
                            )}
                        </Button>
                    </form>
                </div>

                {/* Right Side - Image/Icon */}
                <div className="relative overflow-hidden flex flex-col group">
                    {/* Background Image */}
                    <img
                        src="/onboarding-bg.png"
                        alt="Onboarding Background"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />

                    {/* Overlay for better text readability */}
                    <div className="absolute inset-0 bg-black/10" />

                    {/* Mission/Tagline - Top Left */}
                    <div className="relative z-10 p-16">
                        <p className="text-white text-4xl font-bold tracking-tight drop-shadow-lg max-w-sm leading-tight">
                            Elevate your brand<br />with UGC.
                        </p>
                    </div>

                    <div className="flex-1" />

                    {/* Logo - Bottom Right (Circular) */}
                    <div className="relative z-10 p-12 flex justify-end items-end">
                        <div className="bg-white/90 backdrop-blur-md w-16 h-16 rounded-full flex items-center justify-center shadow-2xl overflow-hidden border-2 border-white/50">
                            <img src="/banana-icon.png" alt="Banana" className="w-14 h-14 object-contain" />
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
