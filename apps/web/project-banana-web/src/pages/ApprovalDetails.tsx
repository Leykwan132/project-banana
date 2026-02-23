import { useState, useMemo } from 'react';

import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { useQuery } from 'convex/react';
import { Skeleton } from "@heroui/skeleton";
import { api } from '../../../../../packages/backend/convex/_generated/api';
import type { Id } from '../../../../../packages/backend/convex/_generated/dataModel';
import Button from '../components/ui/Button';

export default function ApprovalDetails() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const campaignId = id as Id<"campaigns">;
    const campaign = useQuery(api.campaigns.getCampaign, campaignId ? { campaignId } : "skip");
    const submissions = useQuery(api.submissions.getSubmissionsByCampaignId, campaignId ? { campaignId } : "skip");

    const mappedSubmissions = useMemo(() => {
        if (!submissions) return [];
        return submissions.map(sub => ({
            id: sub._id,
            submittedOn: new Date(sub.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            type: sub.type,
            status: sub.status,
            attemptNumber: sub.attempt_number,
            videoLength: 'Unknown'
        }));
    }, [submissions]);

    const sortedApprovals = useMemo(() => {
        if (!mappedSubmissions) return [];
        if (!sortConfig) return mappedSubmissions;

        return [...mappedSubmissions].sort((a: any, b: any) => {

            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            if (sortConfig.key === 'submissionCount') {
                // Ensure numeric sort
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [sortConfig, mappedSubmissions]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (!sortConfig || sortConfig.key !== columnKey) return null;
        return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 inline" /> : <ArrowDown className="w-3 h-3 ml-1 inline" />;
    };

    if (!campaign || !submissions) {
        return (
            <div className="p-8 font-sans text-gray-900 min-h-screen pb-24">
                <div className="flex justify-between items-center mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/approvals')}
                        icon={<ChevronLeft className="w-5 h-5" />}
                        className="pl-0 hover:bg-transparent hover:text-gray-600"
                    >
                        Back
                    </Button>
                </div>

                <div className="w-full">
                    <Skeleton className="w-1/3 h-10 rounded-lg mb-8" />

                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <Skeleton className="w-40 h-8 rounded-lg" />
                            <Skeleton className="w-5 h-5 rounded-full" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Skeleton className="w-full h-12 rounded-lg" />
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="w-full h-24 rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 font-sans text-gray-900 animate-fadeIn min-h-screen pb-24">
            {/* Header / Navigation */}
            <div className="flex justify-between items-center mb-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/approvals')}
                    icon={<ChevronLeft className="w-5 h-5" />}
                    className="pl-0 hover:bg-transparent hover:text-gray-600"
                >
                    Back
                </Button>
            </div>

            <div className="w-full">
                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 mb-8">{campaign.name}</h1>

                {/* Approvals Section */}
                <div className="w-full">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold">Pending Approvals</h2>
                            <div className="bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                                {sortedApprovals.length}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden">
                        <div className="bg-[#F4F6F8] rounded-lg mt-2  grid grid-cols-12 gap-4 p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">
                            <div className="col-span-2 pl-2 text-gray-500 cursor-default">
                                Submission ID
                            </div>
                            <div className="col-span-2 flex items-center justify-center cursor-pointer hover:text-gray-600 outline-none" onClick={() => requestSort('type')}>
                                Type <SortIcon columnKey="type" />
                            </div>
                            <div className="col-span-4 cursor-pointer hover:text-gray-600 outline-none" onClick={() => requestSort('submittedOn')}>
                                Submission Date <SortIcon columnKey="submittedOn" />
                            </div>
                            <div className="col-span-2 flex items-center justify-center cursor-pointer hover:text-gray-600 outline-none" onClick={() => requestSort('submissionCount')}>
                                Submissions No. <SortIcon columnKey="submissionCount" />
                            </div>
                            <div className="col-span-2 flex items-center justify-center text-gray-400 cursor-default">
                                Approval
                            </div>
                        </div>

                        <div className="divide-y divide-[#F4F6F8]">
                            {sortedApprovals.length === 0 ? (
                                <div className="p-16 text-center text-gray-500 font-medium">
                                    No pending approvals yet
                                </div>
                            ) : (
                                sortedApprovals.map((item) => (
                                    <div
                                        key={item.id}
                                        className="grid grid-cols-12 gap-4 p-6 items-center hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="col-span-2 font-mono text-xs text-gray-500">
                                            {item.id}
                                        </div>
                                        <div className="col-span-2 text-gray-900 font-medium flex items-center justify-center">{item.type}</div>
                                        <div className="col-span-4 flex items-center gap-3 ">
                                            <span className="font-semibold text-gray-900">{item.submittedOn}</span>
                                        </div>
                                        <div className="col-span-2 text-gray-900 font-medium flex items-center justify-center">{item.attemptNumber}</div>
                                        <div className="col-span-2 flex justify-center">
                                            <button
                                                onClick={() => navigate(`/approvals/${campaignId}/submission/${item.id}`)}
                                                className="bg-[#1C1C1C] text-white px-4 py-2 font-medium  rounded-xl text-xs hover:bg-gray-800 transition-colors"
                                            >
                                                Review
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>


            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
