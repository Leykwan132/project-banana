import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ArrowUpRight, ArrowUp, ArrowDown, X } from 'lucide-react';
import Button from '../components/ui/Button';

// Mock Data
const pendingApprovals = [
    {
        id: '1',
        campaignName: 'Campaign A',
        userName: 'User A',
        submittedOn: '17 Sept 2024',
        videoLength: '40s',
        status: 'Pending',
        submissionCount: 12
    },
    {
        id: '2',
        campaignName: 'Campaign A',
        userName: 'User B',
        submittedOn: '18 Sept 2024',
        videoLength: '55s',
        status: 'Pending',
        submissionCount: 5
    },
    {
        id: '3',
        campaignName: 'Campaign A',
        userName: 'User C',
        submittedOn: '19 Sept 2024',
        videoLength: '30s',
        status: 'Pending',
        submissionCount: 8
    },
    {
        id: '4',
        campaignName: 'Campaign A',
        userName: 'User D',
        submittedOn: '20 Sept 2024',
        videoLength: '60s',
        status: 'Pending',
        submissionCount: 2
    },
];

const ReviewSubmissionModal = ({ onClose }: { onClose: () => void }) => {
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
            <div className="bg-white rounded-3xl w-[95vw] h-[90vh] overflow-hidden z-10 animate-scaleIn flex flex-col md:flex-row relative">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors z-20"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Left Side - Video Placeholder */}
                <div className="w-full md:w-1/2 p-12 flex flex-col h-full relative">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-2">Review submissions</h2>
                        <p className="text-gray-500">Please review the submission and leave any feedbacks to the creator</p>
                    </div>

                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-full max-w-[420px] aspect-9/16 bg-gray-100 rounded-3xl flex items-center justify-center">
                            <span className="text-gray-400 font-medium">Video</span>
                        </div>
                    </div>
                </div>

                {/* Right Side - Feedback Form */}
                <div className="w-full md:w-1/2 p-12 flex flex-col h-full bg-gray-50 relative items-center justify-center">
                    <div className="w-full max-w-lg flex flex-col h-full max-h-[600px] justify-center">
                        <div className="space-y-4 mb-8 flex-1 flex flex-col">
                            <div className="flex flex-col flex-1">
                                <label className="text-lg font-bold text-gray-900 mb-4 block">Feedback</label>
                                <textarea
                                    className="w-full flex-1 bg-white rounded-2xl p-4 outline-none resize-none placeholder:text-gray-400 text-gray-700"
                                    placeholder="Type your feedback here..."
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl transition-colors text-sm">
                                Request changes
                            </button>
                            <button className="flex-1 bg-black hover:bg-gray-900 text-white font-bold py-3 px-8 rounded-xl transition-colors text-sm">
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-scaleIn {
                    animation: scaleIn 0.2s ease-out forwards;
                }
            `}</style>
        </div>,
        document.body
    );
};

export default function ApprovalDetails() {
    const navigate = useNavigate();
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [showReviewModal, setShowReviewModal] = useState(false);

    const sortedApprovals = useMemo(() => {
        if (!sortConfig) return pendingApprovals;

        return [...pendingApprovals].sort((a: any, b: any) => {
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
    }, [sortConfig]);

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
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Campaign Name</h1>

                {/* Metrics Card */}
                <div className="bg-[#F9FAFB] rounded-3xl p-6 w-full max-w-sm mb-12">
                    <div className="text-gray-900 font-medium mb-4 text-sm">New submissions</div>
                    <div className="flex items-end gap-3">
                        <span className="text-3xl font-bold">7,265</span>
                        <div className="text-sm font-medium flex items-center gap-1 text-emerald-500 mb-1">
                            +11.01%
                            <ArrowUpRight className="w-3 h-3" />
                        </div>
                    </div>
                </div>

                {/* Approvals Section */}
                <div className="w-full">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold">Pending Approvals</h2>
                            <div className="bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                                {pendingApprovals.length}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden">
                        <div className="bg-[#F4F6F8] rounded-lg mt-2  grid grid-cols-10 gap-4 p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">
                            <div className="col-span-5 pl-2 cursor-pointer hover:text-gray-600 outline-none" onClick={() => requestSort('campaignName')}>
                                Campaign <SortIcon columnKey="campaignName" />
                            </div>
                            <div className="col-span-1 flex items-center justify-center cursor-pointer hover:text-gray-600 outline-none" onClick={() => requestSort('submissionCount')}>
                                Submissions <SortIcon columnKey="submissionCount" />
                            </div>
                            <div className="col-span-1 flex items-center justify-center cursor-pointer hover:text-gray-600 outline-none" onClick={() => requestSort('submittedOn')}>
                                Submitted On <SortIcon columnKey="submittedOn" />
                            </div>
                            <div className="col-span-1 flex items-center justify-center cursor-pointer hover:text-gray-600 outline-none" onClick={() => requestSort('videoLength')}>
                                Length <SortIcon columnKey="videoLength" />
                            </div>
                            <div className="col-span-1 flex items-center justify-center cursor-pointer hover:text-gray-600 outline-none" onClick={() => requestSort('status')}>
                                Status <SortIcon columnKey="status" />
                            </div>
                            <div className="col-span-1 flex items-center justify-center text-gray-400 cursor-default">
                                Approval
                            </div>
                        </div>

                        <div className="divide-y divide-[#F4F6F8]">
                            {sortedApprovals.map((item) => (
                                <div
                                    key={item.id}
                                    className="grid grid-cols-10 gap-4 p-6 items-center hover:bg-gray-50 transition-colors"
                                >
                                    <div className="col-span-5 flex items-center gap-3 ">
                                        <span className="font-semibold text-gray-900">{item.campaignName}</span>
                                    </div>
                                    <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center">{item.submissionCount}x</div>
                                    <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center">{item.submittedOn}</div>
                                    <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center">{item.videoLength}</div>
                                    <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center">{item.status}</div>
                                    <div className="col-span-1 flex justify-center">
                                        <button
                                            onClick={() => setShowReviewModal(true)}
                                            className="bg-[#1C1C1C] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
                                        >
                                            Review
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {showReviewModal && <ReviewSubmissionModal onClose={() => setShowReviewModal(false)} />}

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
