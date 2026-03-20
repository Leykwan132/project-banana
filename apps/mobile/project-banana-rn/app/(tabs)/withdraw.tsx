import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActionSheetRef } from "react-native-actions-sheet";
import { SegmentedControl } from 'react-native-ui-lib';
import Animated, {
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    useSharedValue
} from 'react-native-reanimated';
import { useQuery } from 'convex/react';
import LottieView from 'lottie-react-native';

import { Header } from '@/components/Header';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { PayoutCard } from '@/components/PayoutCard';
import { PastPayoutListItem } from '@/components/PastPayoutListItem';
import { PayoutCelebrationModal } from '@/components/PayoutCelebrationModal';
import { TransactionDetailsSheet, DetailItem } from '@/components/TransactionDetailsSheet';
import { ApplicationStatus } from '@/components/ApplicationStatusBadge';
import { api } from '../../../../../packages/backend/convex/_generated/api';

interface Transaction {
    id: string;
    type: 'payout' | 'withdrawal';
    campaignName: string;
    companyName?: string;
    date: string;
    amount: string;
    totalPayoutAmount?: number;
    basePayAmount?: number;
    performanceBreakdownAmount?: number;
    rawAmount?: number;      // original requested withdrawal amount (for fee breakdown)
    gatewayFee?: number;     // total fee stored on the withdrawal record
    status?: ApplicationStatus;
    bankName?: string;
    accountNumber?: string;
}


const TransactionItemSkeleton = () => {
    const opacity = useSharedValue(0.3);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 800 }),
                withTiming(0.3, { duration: 800 })
            ),
            -1,
            true
        );
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                styles.skeletonItem,
                animatedStyle,
                { backgroundColor: isDark ? '#1E1E1E' : '#E7DED0', borderColor: isDark ? '#2E2E2E' : '#D7C9B5' },
            ]}
        />
    );
};

export default function WithdrawalsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ celebrateWithdrawalId?: string }>();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const screenBackgroundColor = isDark ? theme.screenBackground : '#F4F3EE';
    const controlBackgroundColor = isDark ? '#141414' : '#F7F4ED';
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [selectedSegmentedControlIndex, setSelectedSegmentedControlIndex] = useState(0);
    const [isSegmentSwitchLoading, setIsSegmentSwitchLoading] = useState(false);
    const [celebrationTransaction, setCelebrationTransaction] = useState<Transaction | null>(null);
    const [isCelebrationVisible, setIsCelebrationVisible] = useState(false);
    const actionSheetRef = useRef<ActionSheetRef>(null);
    const handledCelebrationId = useRef<string | null>(null);
    const selectedSegmentedControlType = selectedSegmentedControlIndex === 0 ? 'payouts' : 'withdrawals';
    const celebrateWithdrawalId = params.celebrateWithdrawalId;
    const shouldFetchWithdrawals = selectedSegmentedControlType === 'withdrawals' || !!celebrateWithdrawalId;

    // Fetch user balance from Convex
    const creatorData = useQuery(api.creators.getCreator);
    const isBalanceLoading = creatorData === undefined;
    const balance = creatorData?.balance ?? 0;

    const withdrawalsData = useQuery(
        api.payouts.getUserWithdrawals,
        shouldFetchWithdrawals ? {} : 'skip'
    );
    const isWithdrawalsLoading = selectedSegmentedControlType === 'withdrawals' && withdrawalsData === undefined;
    const payoutsData = useQuery(
        api.payouts.getUserPayouts,
        selectedSegmentedControlType === 'payouts' ? {} : 'skip'
    );
    const isPayoutsLoading = selectedSegmentedControlType === 'payouts' && payoutsData === undefined;

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 2000);
    }, []);

    // Format date helper
    const formatDate = (timestamp: number): string => {
        const date = new Date(timestamp);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const period = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${day}/${month}/${year}, ${hour12}:${minutes} ${period}`;
    };

    // Format amount helper
    const formatAmount = (amount: number, isPositive: boolean): string => {
        const sign = isPositive ? '+ ' : '- ';
        const absAmount = Math.abs(amount);
        if (absAmount >= 1000) {
            return `${sign}RM ${(absAmount / 1000).toFixed(1)}k`;
        }
        return `${sign}RM ${absAmount.toFixed(0)}`;
    };

    const formatDetailAmount = (amount: number): string => `RM ${amount.toFixed(2)}`;
    const formatCurrencyAmount = (amount: number): string => `RM ${amount.toFixed(2)}`;

    // Mask account number helper
    const maskAccountNumber = (accountNumber: string): string => {
        if (accountNumber.length <= 4) return accountNumber;
        const lastFour = accountNumber.slice(-4);
        const masked = '*'.repeat(Math.min(8, accountNumber.length - 4));
        return `${masked}${lastFour}`;
    };
    // Format withdrawals for display
    const formattedWithdrawals: Transaction[] = useMemo(() => {
        if (!withdrawalsData) return [];
        return withdrawalsData.map((withdrawal) => ({
            id: withdrawal._id,
            type: 'withdrawal' as const,
            campaignName: withdrawal.bank_name ?? 'Withdrawal',
            date: formatDate(withdrawal.created_at),
            amount: formatAmount(withdrawal.amount, false),
            rawAmount: withdrawal.amount,
            gatewayFee: withdrawal.gateway_fee,
            status: (withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)) as ApplicationStatus,
            bankName: withdrawal.bank_name ?? undefined,
            accountNumber: withdrawal.account_number ?? undefined,
        }));
    }, [withdrawalsData]);

    const formattedPayouts: Transaction[] = useMemo(() => {
        if (!payoutsData) return [];
        return payoutsData.map((payout) => ({
            id: payout._id,
            type: 'payout' as const,
            campaignName: payout.campaign_name ?? 'Payout',
            companyName: payout.company_name ?? undefined,
            date: formatDate(payout.updated_at ?? payout.created_at),
            amount: formatAmount(payout.amount, true),
            totalPayoutAmount: payout.amount,
            basePayAmount: payout.base_pay_amount ?? 0,
            performanceBreakdownAmount: payout.performance_breakdown_amount ?? 0,
            status: 'Paid' as ApplicationStatus,
        }));
    }, [payoutsData]);

    useEffect(() => {
        if (!celebrateWithdrawalId || celebrateWithdrawalId === handledCelebrationId.current) {
            return;
        }

        const matchingWithdrawal = formattedWithdrawals.find((withdrawal) => withdrawal.id === celebrateWithdrawalId);
        if (!matchingWithdrawal || matchingWithdrawal.status !== 'Completed') {
            return;
        }

        handledCelebrationId.current = celebrateWithdrawalId;
        setCelebrationTransaction(matchingWithdrawal);
        setIsCelebrationVisible(true);
    }, [celebrateWithdrawalId, formattedWithdrawals]);

    // handle the loading effect when segment is updated
    useEffect(() => {
        if (!isSegmentSwitchLoading) {
            return;
        }

        const selectedDataReady = selectedSegmentedControlType === 'payouts'
            ? payoutsData !== undefined
            : withdrawalsData !== undefined;

        if (!selectedDataReady) {
            return;
        }

        const timeout = setTimeout(() => {
            setIsSegmentSwitchLoading(false);
        }, 250);

        return () => clearTimeout(timeout);
    }, [isSegmentSwitchLoading, payoutsData, selectedSegmentedControlType, withdrawalsData]);

    const handleSegmentedControlChange = (nextIndex: number) => {
        if (nextIndex === selectedSegmentedControlIndex) {
            return;
        }

        setIsSegmentSwitchLoading(true);
        setSelectedSegmentedControlIndex(nextIndex);
    };

    const handleItemPress = (item: Transaction) => {
        setSelectedTransaction(item);
        actionSheetRef.current?.show();
    };

    const handleCelebrationShowDetails = () => {
        if (!celebrationTransaction) {
            return;
        }

        setSelectedSegmentedControlIndex(1);
        setSelectedTransaction(celebrationTransaction);
        setIsCelebrationVisible(false);
        setCelebrationTransaction(null);

        setTimeout(() => {
            actionSheetRef.current?.show();
        }, 200);
    };

    const renderList = () => {
        const isLoading = isSegmentSwitchLoading || (selectedSegmentedControlType === 'payouts' ? isPayoutsLoading : isWithdrawalsLoading);

        if (isLoading) {
            return (
                <>
                    {[...Array(3)].map((_, i) => (
                        <TransactionItemSkeleton key={i} />
                    ))}
                </>
            );
        }

        const data = selectedSegmentedControlType === 'payouts' ? formattedPayouts : formattedWithdrawals;

        if (data.length === 0) {
            return (
                <View style={styles.emptyStateContainer}>
                    <LottieView
                        source={require('@/assets/lotties/not-found.json')}
                        autoPlay
                        loop
                        style={styles.lottie}
                    />
                    <ThemedText style={[styles.emptyStateText, { color: isDark ? '#D4D4D4' : '#4B5563' }]}>
                        {selectedSegmentedControlType === 'payouts' ? 'No payouts yet' : 'No withdrawals yet'}
                    </ThemedText>
                    <ThemedText style={[styles.emptyStateSubtext, { color: isDark ? '#8A8A8A' : '#9CA3AF' }]}>
                        {selectedSegmentedControlType === 'payouts'
                            ? 'Completed payouts will appear here'
                            : 'Request a withdrawal to see it here'}
                    </ThemedText>
                </View>
            );
        }

        return data.map((item) => (
            <PastPayoutListItem
                key={item.id}
                transactionType={item.type}
                campaignName={item.campaignName}
                subtitle={item.type === 'payout' ? item.companyName : item.accountNumber}
                accountNumber={item.accountNumber}
                date={item.date}
                amount={item.amount}
                status={item.status}
                onPress={() => handleItemPress(item)}
            />
        ));
    };

    const renderCustomWithdrawalContent = () => {
        if (!selectedTransaction || selectedTransaction.type !== 'withdrawal') return null;

        const requested = selectedTransaction.rawAmount ?? 0;
        const actualFee = selectedTransaction.gatewayFee ?? 0;
        const received = Math.max(0, requested - actualFee);
        const isPendingOrProcessing = ['Pending', 'Processing'].includes(selectedTransaction.status || '');

        return (
            <View>
                {/* Date & Status */}
                <View style={styles.reviewRow}>
                    <ThemedText style={[styles.reviewLabel, { color: isDark ? '#A3A3A3' : '#666666' }]}>Requested on</ThemedText>
                    <ThemedText type="defaultSemiBold">{selectedTransaction.date}</ThemedText>
                </View>

                {selectedTransaction.status && (
                    <View style={styles.reviewRow}>
                        <View>
                            <ThemedText style={[styles.reviewLabel, { color: isDark ? '#A3A3A3' : '#666666' }]}>Status</ThemedText>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <ThemedText type="defaultSemiBold" style={{ color: isPendingOrProcessing ? '#F59E0B' : '#22C55E' }}>
                                {selectedTransaction.status}
                            </ThemedText>
                            {isPendingOrProcessing && (
                                <ThemedText style={[styles.noteText, { color: isDark ? '#8A8A8A' : '#666666' }]}>Estimated arrival: 2-5 days</ThemedText>
                            )}
                        </View>
                    </View>
                )}


                {/* Bank info */}
                {selectedTransaction.bankName && (
                    <View style={styles.reviewRow}>
                        <ThemedText style={[styles.reviewLabel, { color: isDark ? '#A3A3A3' : '#666666' }]}>Bank</ThemedText>
                        <ThemedText type="defaultSemiBold">{selectedTransaction.bankName}</ThemedText>
                    </View>
                )}
                {selectedTransaction.accountNumber && (
                    <View style={styles.reviewRow}>
                        <ThemedText style={[styles.reviewLabel, { color: isDark ? '#A3A3A3' : '#666666' }]}>Account</ThemedText>
                        <ThemedText type="defaultSemiBold">{maskAccountNumber(selectedTransaction.accountNumber)}</ThemedText>
                    </View>
                )}

                <View style={[styles.divider, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]} />

                {/* Amount breakdown */}
                <View style={styles.reviewRow}>
                    <ThemedText style={[styles.reviewLabel, { color: isDark ? '#A3A3A3' : '#666666' }]}>Requested Amount</ThemedText>
                    <ThemedText type="defaultSemiBold">RM {requested.toFixed(2)}</ThemedText>
                </View>
                <View style={styles.reviewRow}>
                    <ThemedText style={[styles.reviewLabel, { color: isDark ? '#A3A3A3' : '#666666' }]}>Platform Fee (incl. payment gateway)</ThemedText>
                    <ThemedText type="defaultSemiBold" style={{ color: '#D32F2F' }}>- RM {actualFee.toFixed(2)}</ThemedText>
                </View>
                <View style={styles.reviewRow}>
                    <ThemedText style={[styles.reviewLabel, { color: isDark ? '#A3A3A3' : '#666666' }]}>Amount Sent</ThemedText>
                    <ThemedText type="defaultSemiBold" style={{ color: '#22C55E', fontSize: 18 }}>
                        RM {received.toFixed(2)}
                    </ThemedText>
                </View>
            </View>
        );
    };

    const renderCustomPayoutContent = () => {
        if (!selectedTransaction || selectedTransaction.type !== 'payout') return null;

        return (
            <View>
                <View style={styles.reviewRow}>
                    <ThemedText style={[styles.reviewLabel, { color: isDark ? '#A3A3A3' : '#666666' }]}>Paid on</ThemedText>
                    <ThemedText type="defaultSemiBold">{selectedTransaction.date}</ThemedText>
                </View>

                <View style={styles.reviewRow}>
                    <ThemedText style={[styles.reviewLabel, { color: isDark ? '#A3A3A3' : '#666666' }]}>Company</ThemedText>
                    <ThemedText type="defaultSemiBold">{selectedTransaction.companyName ?? '-'}</ThemedText>
                </View>

                <View style={styles.reviewRow}>
                    <ThemedText style={[styles.reviewLabel, { color: isDark ? '#A3A3A3' : '#666666' }]}>Campaign</ThemedText>
                    <ThemedText type="defaultSemiBold">{selectedTransaction.campaignName}</ThemedText>
                </View>

                <View style={[styles.divider, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]} />

                <View style={styles.reviewRow}>
                    <ThemedText style={[styles.reviewLabel, { color: isDark ? '#A3A3A3' : '#666666' }]}>Base pay</ThemedText>
                    <ThemedText type="defaultSemiBold">{formatDetailAmount(selectedTransaction.basePayAmount ?? 0)}</ThemedText>
                </View>

                <View style={styles.reviewRow}>
                    <ThemedText style={[styles.reviewLabel, { color: isDark ? '#A3A3A3' : '#666666' }]}>Performance breakdown</ThemedText>
                    <ThemedText type="defaultSemiBold">{formatDetailAmount(selectedTransaction.performanceBreakdownAmount ?? 0)}</ThemedText>
                </View>

                <View style={styles.reviewRow}>
                    <ThemedText style={[styles.reviewLabel, { color: isDark ? '#A3A3A3' : '#666666' }]}>Total payout</ThemedText>
                    <ThemedText type="defaultSemiBold" style={{ color: '#22C55E', fontSize: 18 }}>
                        {formatDetailAmount(selectedTransaction.totalPayoutAmount ?? 0)}
                    </ThemedText>
                </View>
            </View>
        );
    };

    const sheetDetails = useMemo((): DetailItem[] => {
        if (!selectedTransaction || selectedTransaction.type === 'withdrawal') return [];

        const details: DetailItem[] = [];

        details.push({ label: 'Paid on', value: selectedTransaction.date });
        details.push({ label: 'Company', value: selectedTransaction.companyName ?? '-' });
        details.push({ label: 'Campaign', value: selectedTransaction.campaignName });
        details.push({
            label: 'Base pay',
            value: formatDetailAmount(selectedTransaction.basePayAmount ?? 0),
        });
        details.push({
            label: 'Performance breakdown',
            value: formatDetailAmount(selectedTransaction.performanceBreakdownAmount ?? 0),
        });
        details.push({
            label: 'Total payout',
            value: formatDetailAmount(selectedTransaction.totalPayoutAmount ?? 0),
            valueStyle: { color: '#22C55E' },
        });

        return details;
    }, [selectedTransaction]);

    const celebrationAmount = celebrationTransaction
        ? formatCurrencyAmount(Math.max((celebrationTransaction.rawAmount ?? 0) - (celebrationTransaction.gatewayFee ?? 0), 0))
        : 'RM 0.00';

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: screenBackgroundColor,
                    paddingTop: insets.top,
                },
            ]}
        >
            <Header title="Withdrawals" />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.section}>
                    <PayoutCard
                        amount={`RM ${balance}`}
                        onWithdraw={() => router.push('/withdraw')}
                        isAmountLoading={isBalanceLoading}
                    />
                </View>

                {/* List */}
                <View style={styles.section}>

                    <SegmentedControl
                        key={`withdraw-history-segment-${selectedSegmentedControlIndex}`}
                        initialIndex={selectedSegmentedControlIndex}
                        onChangeIndex={handleSegmentedControlChange}
                        segments={[{ label: 'Payouts' }, { label: 'Withdrawals' }]}
                        backgroundColor={controlBackgroundColor}
                        activeBackgroundColor={theme.text}
                        activeColor={theme.background}
                        outlineColor={isDark ? 'transparent' : theme.text}
                        outlineWidth={isDark ? 0 : 1}
                        borderRadius={999}
                        containerStyle={styles.segmentedControlContainer}
                        style={[styles.segmentedControl, isDark && styles.segmentedControlDark]}
                        segmentLabelStyle={styles.segmentedControlLabel}
                    />

                    <View style={styles.list}>
                        {renderList()}
                    </View>
                </View>

                {/* Banner */}
                {/* <View style={styles.bannerContainer}>
                    <Banner type="cashback" />
                </View> */}
            </ScrollView>

            <TransactionDetailsSheet
                actionSheetRef={actionSheetRef}
                title={selectedTransaction?.type === 'withdrawal' ? "Withdrawal Details" : "Payout Details"}
                details={sheetDetails}
                customContent={selectedTransaction?.type === 'withdrawal' ? renderCustomWithdrawalContent() : renderCustomPayoutContent()}
            />

            <PayoutCelebrationModal
                visible={isCelebrationVisible}
                amount={celebrationAmount}
                bankName={celebrationTransaction?.bankName}
                accountNumber={celebrationTransaction?.accountNumber}
                onShowDetails={handleCelebrationShowDetails}
                onDismiss={() => {
                    setIsCelebrationVisible(false);
                    setCelebrationTransaction(null);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 24,
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
        marginBottom: 12,
    },
    list: {
        gap: 8,
    },
    segmentedControlContainer: {
        marginBottom: 24,
    },
    segmentedControl: {
        paddingVertical: 6,
        borderRadius: 999,
    },
    segmentedControlDark: {
        borderWidth: 0,
    },
    segmentedControlLabel: {
        fontFamily: 'GoogleSans_500Medium',
        fontSize: 14,
    },
    bannerContainer: {
        // Banner generic container
    },
    skeletonItem: {
        borderRadius: 8,
        height: 104,
        marginBottom: 10,
        borderWidth: 1,
    },
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        gap: 8,
    },
    emptyStateText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_500Medium',
        color: '#4B5563',
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        fontFamily: 'GoogleSans_400Regular',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    lottie: {
        width: 150,
        height: 150,
    },
    reviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    reviewLabel: {
        fontSize: 16,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 4,
    },
    noteText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        fontFamily: 'GoogleSans_400Regular',
    },
});
