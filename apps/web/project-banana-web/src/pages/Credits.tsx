import { ArrowRight, Loader2, Link as LinkIcon } from 'lucide-react';
import { useQuery, usePaginatedQuery } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import Button from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Pagination } from "@heroui/pagination";

import { useState } from 'react';

export default function Credits() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("all");
    const [activeTab, setActiveTab] = useState<"topups" | "spending">("topups");
    const [spendingPage, setSpendingPage] = useState(1);
    const business = useQuery(api.businesses.getMyBusiness);

    // Top-up paginated query
    const {
        results: topUpHistory,
        status: paginationStatus,
        loadMore
    } = usePaginatedQuery(api.topup.getPastTopUpPayments, { status: statusFilter }, { initialNumItems: 10 });

    const totalTopUps = useQuery(api.topup.getTopUpCount, { status: statusFilter }) ?? 0;

    // Spending paginated query
    const {
        results: spendingHistory,
        status: spendingPaginationStatus,
        loadMore: loadMoreSpending
    } = usePaginatedQuery(api.topup.getPastCreditSpending, {}, { initialNumItems: 10 });

    const totalSpending = useQuery(api.topup.getSpendingCount) ?? 0;

    const credits = business?.credit_balance ?? 0;
    const isLoading = business === undefined || paginationStatus === "LoadingFirstPage";
    const isSpendingLoading = business === undefined || spendingPaginationStatus === "LoadingFirstPage";

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'succeeded':
            case 'paid':
            case 'completed':
                return 'text-green-600 bg-green-50 px-2 py-1 rounded';
            case 'failed':
            case 'canceled':
                return 'text-red-600 bg-red-50 px-2 py-1 rounded';
            case 'processing':
            case 'pending':
                return 'text-blue-600 bg-blue-50 px-2 py-1 rounded';
            default:
                return 'text-yellow-600 bg-yellow-50 px-2 py-1 rounded';
        }
    };

    const ITEMS_PER_PAGE = 10;
    const paginatedHistory = topUpHistory ? topUpHistory.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE) : [];
    const paginatedSpending = spendingHistory ? spendingHistory.slice((spendingPage - 1) * ITEMS_PER_PAGE, spendingPage * ITEMS_PER_PAGE) : [];

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        const neededItems = newPage * ITEMS_PER_PAGE;
        const currentLoaded = topUpHistory.length;
        if (neededItems > currentLoaded && paginationStatus === "CanLoadMore") {
            loadMore(neededItems - currentLoaded);
        }
    };

    const handleSpendingPageChange = (newPage: number) => {
        setSpendingPage(newPage);
        const neededItems = newPage * ITEMS_PER_PAGE;
        const currentLoaded = spendingHistory.length;
        if (neededItems > currentLoaded && spendingPaginationStatus === "CanLoadMore") {
            loadMoreSpending(neededItems - currentLoaded);
        }
    };

    const handleFilterChange = (status: string) => {
        setStatusFilter(status);
        setPage(1);
    };

    const handleTopUp = () => {
        navigate('/credits/topup');
    };

    const handleTabChange = (tab: "topups" | "spending") => {
        setActiveTab(tab);
    };

    return (
        <div className="p-8 font-sans text-gray-900 animate-fadeIn">
            <h1 className="text-2xl font-bold mb-6">Credits</h1>

            <div className="flex flex-col gap-8">
                {/* Top Section: Balance & Actions */}
                <div className="w-full max-w-lg">
                    <div className="bg-[#1C1C1C] text-white p-8 rounded-xl flex flex-col justify-between min-h-[300px] shadow-xl shadow-black/10 relative">
                        {/* Icon */}
                        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                            <img src="/banana-icon.png" alt="Banana" className="w-12 h-12 object-contain" />
                        </div>

                        {/* Bottom Section */}
                        <div className="flex items-end justify-between mt-8">
                            <div>
                                <div className="text-gray-400 font-medium mb-2">Available Credits</div>
                                <div className="text-4xl font-bold">
                                    {isLoading ? (
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    ) : (
                                        `Rm ${credits.toLocaleString()}`
                                    )}
                                </div>
                            </div>
                            <Button
                                variant='outline'
                                className="rounded-full px-6"
                                icon={<ArrowRight className="w-4 h-4" />}
                                onClick={handleTopUp}
                            >
                                Top Up
                            </Button>
                        </div>
                    </div>
                </div>

                {/* History Section with Tabs */}
                <div className="bg-white overflow-hidden">
                    <div className="flex items-center justify-between mb-4 w-[70%]">
                        {/* Tab Buttons */}
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => handleTabChange("topups")}
                                className={`font-bold text-lg transition-colors relative pb-1 ${activeTab === "topups"
                                        ? 'text-gray-900 border-b-2 border-gray-900'
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                Past Topups
                            </button>
                            <button
                                onClick={() => handleTabChange("spending")}
                                className={`font-bold text-lg transition-colors relative pb-1 ${activeTab === "spending"
                                        ? 'text-gray-900 border-b-2 border-gray-900'
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                Past Spending
                            </button>
                        </div>

                        {/* Status filters — only show for topups tab */}
                        {activeTab === "topups" && (
                            <div className="flex gap-2">
                                {['all', 'paid', 'pending', 'failed'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => handleFilterChange(status)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${statusFilter === status
                                            ? 'bg-gray-900 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Past Topups Tab Content */}
                    {activeTab === "topups" && (
                        <>
                            <div className="bg-[#F4F6F8] w-[70%] rounded-lg mt-2 grid grid-cols-4 gap-4 p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">
                                <div className="col-span-1 pl-2">Date</div>
                                <div className="col-span-1 flex items-center justify-center">Amount</div>
                                <div className="col-span-1 flex items-center justify-center">Link</div>
                                <div className="col-span-1 flex items-center justify-center">Status</div>
                            </div>

                            {isLoading ? (
                                <div className="flex items-center justify-center py-12 w-[70%]">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                </div>
                            ) : !topUpHistory || topUpHistory.length === 0 ? (
                                <div className="py-12 text-center text-gray-500 w-[70%]">
                                    No top-up history found
                                </div>
                            ) : (
                                <>
                                    <div className="divide-y divide-[#F4F6F8]">
                                        {paginatedHistory.map((item: any) => (
                                            <div
                                                key={item._id}
                                                className="grid grid-cols-4 p-6 items-center hover:bg-gray-50 transition-colors w-[70%]"
                                            >
                                                <div className="col-span-1 font-medium text-gray-900 truncate pl-2">
                                                    {formatDate(item.created_at)}
                                                </div>
                                                <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center">
                                                    Rm {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                                <div className="col-span-1 flex items-center justify-center">
                                                    {item.billplz_url ? (
                                                        <a
                                                            href={item.billplz_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm border border-blue-200 hover:border-blue-400 rounded-md px-3 py-1.5 transition-colors"
                                                        >
                                                            Link <LinkIcon className="w-3 h-3" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">-</span>
                                                    )}
                                                </div>
                                                <div className="col-span-1 flex items-center justify-center font-medium">
                                                    <span className={getStatusStyle(item.status)}>
                                                        {item.status ? (item.status.charAt(0).toUpperCase() + item.status.slice(1)) : 'Unknown'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {totalTopUps > ITEMS_PER_PAGE && (
                                        <div className="mt-6 flex justify-center w-[70%]">
                                            <Pagination
                                                total={Math.ceil(totalTopUps / ITEMS_PER_PAGE)}
                                                initialPage={1}
                                                page={page}
                                                onChange={handlePageChange}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* Past Spending Tab Content */}
                    {activeTab === "spending" && (
                        <>
                            <div className="bg-[#F4F6F8] w-[70%] rounded-lg mt-2 grid grid-cols-4 gap-4 p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">
                                <div className="col-span-1 pl-2">Date</div>
                                <div className="col-span-1 flex items-center justify-center">Campaign</div>
                                <div className="col-span-1 flex items-center justify-center">Amount</div>
                                <div className="col-span-1 flex items-center justify-center">Status</div>
                            </div>

                            {isSpendingLoading ? (
                                <div className="flex items-center justify-center py-12 w-[70%]">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                </div>
                            ) : !spendingHistory || spendingHistory.length === 0 ? (
                                <div className="py-12 text-center text-gray-500 w-[70%]">
                                    No spending history found
                                </div>
                            ) : (
                                <>
                                    <div className="divide-y divide-[#F4F6F8]">
                                        {paginatedSpending.map((item: any) => (
                                            <div
                                                key={item._id}
                                                className="grid grid-cols-4 p-6 items-center hover:bg-gray-50 transition-colors w-[70%]"
                                            >
                                                <div className="col-span-1 font-medium text-gray-900 truncate pl-2">
                                                    {formatDate(item.created_at)}
                                                </div>
                                                <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center truncate">
                                                    {item.campaign_name}
                                                </div>
                                                <div className="col-span-1 text-red-600 font-medium flex items-center justify-center">
                                                    - Rm {Math.abs(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                                <div className="col-span-1 flex items-center justify-center font-medium">
                                                    <span className={getStatusStyle(item.status)}>
                                                        {item.status ? (item.status.charAt(0).toUpperCase() + item.status.slice(1)) : 'Unknown'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {totalSpending > ITEMS_PER_PAGE && (
                                        <div className="mt-6 flex justify-center w-[70%]">
                                            <Pagination
                                                total={Math.ceil(totalSpending / ITEMS_PER_PAGE)}
                                                initialPage={1}
                                                page={spendingPage}
                                                onChange={handleSpendingPageChange}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out forwards;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
