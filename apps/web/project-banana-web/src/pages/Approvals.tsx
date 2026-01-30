import { useNavigate } from 'react-router-dom';
import { Card } from "@heroui/card";
import { Image } from "@heroui/image";
import { ArrowRight } from 'lucide-react';

const approvalCampaigns = [
    {
        id: '1',
        name: 'Chakra Soft UI Version',
        pendingApprovals: 42,
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=2071&auto=format&fit=crop'
    },
    {
        id: '2',
        name: 'Add Progress Track',
        pendingApprovals: 15,
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop'
    },
    {
        id: '3',
        name: 'Fix Platform Errors',
        pendingApprovals: 8,
        image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2070&auto=format&fit=crop'
    },
    {
        id: '6',
        name: 'Q4 Marketing Push',
        pendingApprovals: 12,
        image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2070&auto=format&fit=crop'
    }
];

export default function Approvals() {
    const navigate = useNavigate();

    return (
        <div className="p-8 font-sans text-gray-900 animate-fadeIn">
            <div className="flex items-center gap-3 mb-6">
                <h1 className="text-2xl font-bold">Approvals</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {approvalCampaigns.map((campaign) => (
                    <Card
                        key={campaign.id}
                        isPressable
                        onPress={() => navigate(`/approvals/${campaign.id}`)}
                        className="flex flex-col w-full bg-[#F4F6F8] border-none rounded-md p-6 hover:bg-gray-200 transition-colors duration-200 group shadow-none"
                    >
                        {/* Text Content Section (Top) */}
                        <div className="flex flex-col items-start w-full">
                            <h4 className="text-gray-900 text-xl font-semibold leading-tight line-clamp-2 text-left">
                                {campaign.name}
                            </h4>
                            <div className="flex items-center gap-3 mt-3">
                                <span className="px-3 bg-white py-1 rounded-full border border-gray-400 text-sm font-semibold text-gray-700">
                                    {campaign.pendingApprovals}
                                </span>
                                <span className="text-gray-500 text-sm font-medium">pending submissions</span>
                            </div>

                            <div className="flex items-center gap-1 pt-8 text-orange-500 font-semibold text-sm mt-4 transition-all">
                                <span>Review now</span>
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Image Section (Bottom) */}
                        <Image
                            alt={campaign.name}
                            className="object-cover rounded-sm mt-6"
                            src={campaign.image}
                        />
                    </Card>
                ))}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
