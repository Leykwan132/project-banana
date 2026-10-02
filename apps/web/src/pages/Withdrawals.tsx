import { Loader2, ArrowRight, Landmark } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { Skeleton, Table, Tooltip, type SortDescriptor } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import type { Id } from '../../../../packages/backend/convex/_generated/dataModel';
import { api } from '../../../../packages/backend/convex/_generated/api';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { CreatorPageHeader } from '../components/CreatorPageHeader';
import { businessTableCellClassName, businessTableClassName, businessTableColumnClassName, businessTableContentClassName, businessTableMutedCellClassName } from '../components/ui/businessTableStyles';

const formatCurrency = (value: number) =>
    `RM ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function WithdrawalAmount({ requested, gatewayFee, platformFee, finalAmount }: { requested: number; gatewayFee: number; platformFee: number; finalAmount: number }) {
    const rows = [
        ['Requested amount', requested],
        ['Gateway fee', -gatewayFee],
        ['Platform fee', -platformFee],
    ] as const;
    const breakdown = <>
        {rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-5"><span className="text-gray-500">{label}</span><span className="whitespace-nowrap font-medium text-gray-900">{value < 0 ? `- ${formatCurrency(Math.abs(value))}` : formatCurrency(value)}</span></div>)}
        <div className="h-px bg-gray-100" />
        <div className="flex items-center justify-between gap-5"><span className="text-gray-500">Final amount</span><span className="whitespace-nowrap font-semibold text-gray-900">{formatCurrency(finalAmount)}</span></div>
    </>;

    return <Tooltip delay={300} closeDelay={150}>
        <Tooltip.Trigger>
            <button type="button" aria-label={`Show breakdown for ${formatCurrency(finalAmount)}`} className="cursor-help border-b border-dotted border-gray-400 font-medium text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500">
                {formatCurrency(finalAmount)}
            </button>
        </Tooltip.Trigger>
        <Tooltip.Content placement="top" showArrow className="w-60 space-y-3 rounded-xl bg-white p-4 text-xs text-gray-700 shadow-lg">
            {breakdown}
        </Tooltip.Content>
    </Tooltip>;
}

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

type WithdrawalSortKey = 'date' | 'bank' | 'account' | 'amount' | 'status';

const getWithdrawalFinalAmount = (withdrawal: { amount: number; gateway_fee?: number; platform_fee?: number }) =>
    Math.max(withdrawal.amount - (withdrawal.gateway_fee ?? 0) - (withdrawal.platform_fee ?? 0), 0);

export default function Withdrawals({ workspace = 'business' }: { workspace?: 'business' | 'creator' }) {
    const isCreator = workspace === 'creator';
    const navigate = useNavigate();
    const business = useQuery(api.businesses.getMyBusiness, isCreator ? 'skip' : {});
    const withdrawals = useQuery(isCreator ? api.payouts.getUserWithdrawals : api.payouts.getBusinessWithdrawals);

    const creatorBalance = useQuery(api.users.getUserBalance, isCreator ? {} : 'skip');
    const availableCredits = isCreator ? (creatorBalance?.balance ?? 0) : (business?.credit_balance ?? 0);
    const isLoading = (isCreator ? creatorBalance === undefined : business === undefined) || withdrawals === undefined;

    const withdrawalHistory = (withdrawals ?? []) as Array<{
        _id: Id<'withdrawals'>;
        amount: number;
        gateway_fee?: number;
        platform_fee?: number;
        status: string;
        created_at: number;
        bank_name?: string | null;
        account_number?: string | null;
    }>;
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor | null>(null);
    const sortKey = sortDescriptor?.column as WithdrawalSortKey | undefined;
    const sortDirection = sortDescriptor?.direction === 'ascending' ? 'asc' : 'desc';
    const sortedWithdrawalHistory = useMemo(() => {
        if (!sortKey) return withdrawalHistory;

        return [...withdrawalHistory].sort((left, right) => {
            let comparison = 0;
            switch (sortKey) {
                case 'date':
                    comparison = left.created_at - right.created_at;
                    break;
                case 'bank':
                    comparison = (left.bank_name ?? 'Unknown').localeCompare(right.bank_name ?? 'Unknown');
                    break;
                case 'account':
                    comparison = (left.account_number ?? '').localeCompare(right.account_number ?? '');
                    break;
                case 'amount':
                    comparison = getWithdrawalFinalAmount(left) - getWithdrawalFinalAmount(right);
                    break;
                case 'status':
                    comparison = left.status.localeCompare(right.status);
                    break;
            }
            return sortDirection === 'desc' ? -comparison : comparison;
        });
    }, [withdrawalHistory, sortDirection, sortKey]);

    const handleSortChange = (nextDescriptor: SortDescriptor) => {
        const key = nextDescriptor.column as WithdrawalSortKey;
        const direction = sortKey !== key ? 'desc' : sortDirection === 'desc' ? 'asc' : 'desc';
        setSortDescriptor({ column: key, direction: direction === 'desc' ? 'descending' : 'ascending' });
    };

    const handleRequestWithdrawal = () => {
        navigate(isCreator ? '/creator/withdraw/request' : '/withdrawals/request');
    };

    return (
        <div className="bg-white p-4 sm:p-8 font-sans text-gray-900 animate-fadeIn">
            <CreatorPageHeader title={isCreator ? 'Withdraw' : 'Withdrawals'} description="View your available balance and withdrawal history." />

            <div className="flex flex-col gap-8">
                {/* Top Section: Balance & Actions */}
                <div className="w-full max-w-[22.4rem]">
                    <div className="bg-[#0F172A] text-white rounded-xl flex h-[210px] flex-col justify-between p-6 shadow-xl shadow-black/10 relative">
                        {/* Icon */}
                        <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                            <Landmark className="h-5 w-5 text-white" />
                        </div>

                        {/* Bottom Section */}
                        <div className="flex flex-wrap items-end justify-between gap-4 mt-6">
                            <div>
                                <div className="mb-2 text-sm font-medium text-gray-400">Available to withdraw</div>
                                <div className="whitespace-nowrap text-2xl font-bold">
                                    {isLoading ? (
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    ) : (
                                        `RM ${availableCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    )}
                                </div>
                            </div>
                            <Button
                                variant='outline'
                                data-tour-id="withdrawals-request-button"
                                className="!px-4 whitespace-nowrap rounded-full text-gray-900 bg-white hover:bg-gray-100 border-none"
                                icon={<ArrowRight className="w-4 h-4" />}
                                onClick={handleRequestWithdrawal}
                            >
                                Request
                            </Button>
                        </div>
                    </div>
                </div>

                {/* History Section */}
                <div className="bg-white overflow-x-auto">
                    <div className="flex items-center justify-between mb-4 w-full">
                        <div className="flex items-center gap-6">
                            <button className="font-bold text-lg transition-colors relative pb-1 text-gray-900 border-b-2 border-gray-900">
                                Past Withdrawals
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div role="status" aria-label="Loading withdrawals" className="mt-2 min-w-[640px] overflow-hidden rounded-[22px] border border-gray-200 bg-gray-100 p-1">
                            <span className="sr-only">Loading withdrawal history…</span>
                            <div aria-hidden="true" className="grid grid-cols-5 gap-4 rounded-t-xl bg-gray-100 px-3 py-3">
                                {['Date', 'Bank', 'Account Number', 'Amount', 'Status'].map(label => <Skeleton key={label} className="h-3 w-16 rounded-md bg-gray-200" />)}
                            </div>
                            {Array.from({ length: 4 }, (_, index) => <div key={index} className="grid grid-cols-5 items-center gap-4 border-b border-gray-100 bg-white px-3 py-4">
                                <Skeleton className="h-4 w-28 rounded-md bg-gray-200" />
                                <Skeleton className="h-4 w-20 rounded-md bg-gray-200" />
                                <Skeleton className="h-4 w-16 rounded-md bg-gray-200" />
                                <Skeleton className="h-4 w-20 rounded-md bg-gray-200" />
                                <Skeleton className="h-5 w-24 rounded-full bg-gray-200" />
                            </div>)}
                        </div>
                    ) : !withdrawalHistory || withdrawalHistory.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">
                            No withdrawal history found
                        </div>
                    ) : (
                        <Table variant="primary" className={businessTableClassName}>
                            <Table.ScrollContainer>
                                <Table.Content
                                    aria-label="Withdrawal history"
                                    className={`${businessTableContentClassName} min-w-[640px]`}
                                    sortDescriptor={sortDescriptor ?? undefined}
                                    onSortChange={handleSortChange}
                                >
                                    <Table.Header>
                                        <Table.Column id="date" allowsSorting className={businessTableColumnClassName}>
                                            {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>DATE</Table.SortableColumnHeader>}
                                        </Table.Column>
                                        <Table.Column id="bank" allowsSorting className={businessTableColumnClassName}>
                                            {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>BANK</Table.SortableColumnHeader>}
                                        </Table.Column>
                                        <Table.Column id="account" allowsSorting className={businessTableColumnClassName}>
                                            {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>ACCOUNT NUMBER</Table.SortableColumnHeader>}
                                        </Table.Column>
                                        <Table.Column id="amount" allowsSorting className={businessTableColumnClassName}>
                                            {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>AMOUNT</Table.SortableColumnHeader>}
                                        </Table.Column>
                                        <Table.Column id="status" allowsSorting className={businessTableColumnClassName}>
                                            {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>STATUS</Table.SortableColumnHeader>}
                                        </Table.Column>
                                    </Table.Header>
                                    <Table.Body items={sortedWithdrawalHistory}>
                                        {withdrawal => <Table.Row id={withdrawal._id} textValue={`${withdrawal.bank_name ?? 'Unknown'} withdrawal`} className="group">
                                            <Table.Cell className={`${businessTableCellClassName} font-medium`}>{formatDate(withdrawal.created_at)}</Table.Cell>
                                            <Table.Cell className={`${businessTableCellClassName} font-medium`}>{withdrawal.bank_name ?? 'Unknown'}</Table.Cell>
                                            <Table.Cell className={`${businessTableMutedCellClassName} text-sm font-medium`}>****{withdrawal.account_number?.slice(-4) ?? '0000'}</Table.Cell>
                                            <Table.Cell className={businessTableCellClassName}>
                                                <WithdrawalAmount requested={withdrawal.amount} gatewayFee={withdrawal.gateway_fee ?? 0} platformFee={withdrawal.platform_fee ?? 0} finalAmount={getWithdrawalFinalAmount(withdrawal)} />
                                            </Table.Cell>
                                            <Table.Cell className={businessTableCellClassName}><StatusBadge status={withdrawal.status || 'unknown'} /></Table.Cell>
                                        </Table.Row>}
                                    </Table.Body>
                                </Table.Content>
                            </Table.ScrollContainer>
                        </Table>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
