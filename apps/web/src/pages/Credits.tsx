import { ArrowRight, Loader2 } from 'lucide-react';
import { useQuery, usePaginatedQuery } from 'convex/react';
import { api } from '../../../../packages/backend/convex/_generated/api';
import Button from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { AppPagination } from "../components/ui/AppPagination";
import iconDark from '../assets/icon-dark.svg';
import StatusBadge from '../components/ui/StatusBadge';
import { CreditType } from '../lib/constants';
import { Table } from '@heroui/react';
import { businessTableCellClassName, businessTableClassName, businessTableColumnClassName, businessTableContentClassName } from '../components/ui/businessTableStyles';

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
                <div className="w-full max-w-md">
                    <div className="bg-[#1C1C1C] text-white p-6 rounded-xl flex flex-col justify-between min-h-[210px] shadow-lg shadow-black/10 relative">
                        {/* Icon */}
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                            <img src={iconDark} alt="Banana" className="w-7 h-7 object-contain" />
                        </div>

                        {/* Bottom Section */}
                        <div className="flex items-end justify-between mt-8">
                            <div>
                                <div className="text-gray-400 font-medium mb-2">Available Credits</div>
                                <div className="text-3xl font-bold">
                                    {isLoading ? (
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    ) : (
                                        `Rm ${credits.toLocaleString()}`
                                    )}
                                </div>
                            </div>
                            <Button
                                variant='outline'
                                data-tour-id="credits-topup-button"
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
                <div className="w-full overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4 w-full">
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
                            {isLoading ? (
                                <div role="status" aria-label="Loading top-ups" className="mt-2 flex h-40 items-center justify-center rounded-[22px] border border-gray-200 bg-gray-100 text-gray-400">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                </div>
                            ) : !topUpHistory || topUpHistory.length === 0 ? (
                                <div className="mt-2 rounded-[22px] border border-gray-200 bg-gray-50 py-12 text-center text-gray-500">
                                    No top-up history found
                                </div>
                            ) : (
                                <>
                                    <Table variant="primary" className={businessTableClassName}>
                                        <Table.ScrollContainer>
                                            <Table.Content aria-label="Past top-ups" className={`${businessTableContentClassName} min-w-[720px]`}>
                                                <Table.Header>
                                                    <Table.Column className={businessTableColumnClassName}>DATE</Table.Column>
                                                    <Table.Column className={businessTableColumnClassName}>AMOUNT</Table.Column>
                                                    <Table.Column className={businessTableColumnClassName}>PAYMENT LINK</Table.Column>
                                                    <Table.Column className={businessTableColumnClassName}>STATUS</Table.Column>
                                                </Table.Header>
                                                <Table.Body items={paginatedHistory}>
                                                    {item => <Table.Row id={item._id} textValue={`${formatDate(item.created_at)} ${item.status || 'unknown'}`} className="group">
                                                        <Table.Cell className={`${businessTableCellClassName} font-medium`}>{formatDate(item.created_at)}</Table.Cell>
                                                        <Table.Cell className={`${businessTableCellClassName} font-medium`}>RM {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Table.Cell>
                                                        <Table.Cell className={businessTableCellClassName}>{item.billplz_url ? <a href={item.billplz_url} target="_blank" rel="noopener noreferrer" className="text-gray-700 underline transition-colors hover:text-gray-900">Payment link</a> : <span className="text-gray-400">-</span>}</Table.Cell>
                                                        <Table.Cell className={businessTableCellClassName}><StatusBadge status={item.status || 'unknown'} /></Table.Cell>
                                                    </Table.Row>}
                                                </Table.Body>
                                            </Table.Content>
                                        </Table.ScrollContainer>
                                    </Table>

                                    {totalTopUps > ITEMS_PER_PAGE && (
                                        <div className="mt-6 flex justify-center">
                                            <AppPagination
                                                total={Math.ceil(totalTopUps / ITEMS_PER_PAGE)}
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
                            {isSpendingLoading ? (
                                <div role="status" aria-label="Loading credit spending" className="mt-2 flex h-40 items-center justify-center rounded-[22px] border border-gray-200 bg-gray-100 text-gray-400">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                </div>
                            ) : !spendingHistory || spendingHistory.length === 0 ? (
                                <div className="mt-2 rounded-[22px] border border-gray-200 bg-gray-50 py-12 text-center text-gray-500">
                                    No spending history found
                                </div>
                            ) : (
                                <>
                                    <Table variant="primary" className={businessTableClassName}>
                                      <Table.ScrollContainer>
                                        <Table.Content aria-label="Past credit spending" className={`${businessTableContentClassName} min-w-[820px]`}>
                                          <Table.Header>
                                            <Table.Column className={businessTableColumnClassName}>DATE</Table.Column>
                                            <Table.Column className={businessTableColumnClassName}>CAMPAIGN</Table.Column>
                                            <Table.Column className={businessTableColumnClassName}>TYPE</Table.Column>
                                            <Table.Column className={businessTableColumnClassName}>AMOUNT</Table.Column>
                                            <Table.Column className={businessTableColumnClassName}>STATUS</Table.Column>
                                          </Table.Header>
                                          <Table.Body items={paginatedSpending}>
                                            {item => {
                                            const isRefund = item.type === CreditType.Refund || (item.amount ?? 0) > 0;
                                            const formattedAmount = Math.abs(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                                            return <Table.Row id={item._id} textValue={`${item.campaign_name ?? 'Credit transaction'} ${isRefund ? 'refund' : 'spent'}`} className="group">
                                                <Table.Cell className={`${businessTableCellClassName} font-medium`}>{formatDate(item.created_at)}</Table.Cell>
                                                <Table.Cell className={businessTableCellClassName}>
                                                    {item.campaign_id ? <button type="button" onClick={() => navigate(`/campaigns/${item.campaign_id}`)} className="max-w-full truncate font-medium text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-gray-900" title={item.campaign_name}>{item.campaign_name}</button> : <span className="max-w-full truncate font-medium text-gray-900" title={item.campaign_name}>{item.campaign_name}</span>}
                                                </Table.Cell>
                                                <Table.Cell className={businessTableCellClassName}><span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${isRefund ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>{isRefund ? 'Refund' : 'Spent'}</span></Table.Cell>
                                                <Table.Cell className={`${businessTableCellClassName} font-medium ${isRefund ? '!text-emerald-600' : '!text-red-600'}`}>{isRefund ? '+ ' : '- '}RM {formattedAmount}</Table.Cell>
                                                <Table.Cell className={businessTableCellClassName}><StatusBadge status={item.status || 'unknown'} /></Table.Cell>
                                            </Table.Row>;
                                          }}
                                          </Table.Body>
                                        </Table.Content>
                                      </Table.ScrollContainer>
                                    </Table>

                                    {totalSpending > ITEMS_PER_PAGE && (
                                        <div className="mt-6 flex justify-center">
                                            <AppPagination
                                                total={Math.ceil(totalSpending / ITEMS_PER_PAGE)}
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
