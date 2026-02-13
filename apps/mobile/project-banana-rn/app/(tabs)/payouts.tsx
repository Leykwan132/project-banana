import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SegmentedControl } from 'react-native-ui-lib';
import { useRouter } from 'expo-router';
import { ActionSheetRef } from "react-native-actions-sheet";
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
import { Banner } from '@/components/Banner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { PayoutCard } from '@/components/PayoutCard';
import { PastPayoutListItem } from '@/components/PastPayoutListItem';
import { TransactionDetailsSheet, DetailItem } from '@/components/TransactionDetailsSheet';
import { ApplicationStatus } from '@/components/ApplicationStatusBadge';
import { api } from '../../../../../packages/backend/convex/_generated/api';

interface Transaction {
    id: string;
    campaignName: string;
    date: string;
    amount: string;
    status?: ApplicationStatus;
    bankName?: string;
    accountNumber?: string;
}


const TransactionItemSkeleton = () => {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 800 }),
                withTiming(0.3, { duration: 800 })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.skeletonItem, animatedStyle]} />
    );
};

export default function PayoutsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const actionSheetRef = useRef<ActionSheetRef>(null);

    // Fetch user balance from Convex
    const creatorData = useQuery(api.creators.getCreator);
    const isBalanceLoading = creatorData === undefined;
    const balance = creatorData?.balance ?? 0;

    // Fetch payouts and withdrawals
    const payoutsData = useQuery(api.payouts.getUserPayouts);
    const withdrawalsData = useQuery(api.payouts.getUserWithdrawals);
    const isPayoutsLoading = payoutsData === undefined;
    const isWithdrawalsLoading = withdrawalsData === undefined;

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
        return `${day}/${month}/${year}`;
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

    // Format payouts for display
    const formattedPayouts: Transaction[] = useMemo(() => {
        if (!payoutsData) return [];
        return payoutsData.map((payout) => ({
            id: payout._id,
            campaignName: 'Campaign Name', // TODO: Join with campaigns/applications table
            date: formatDate(payout.created_at),
            amount: formatAmount(payout.amount, true),
        }));
    }, [payoutsData]);
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
            campaignName: 'Withdraw',
            date: formatDate(withdrawal.requested_at),
            amount: formatAmount(withdrawal.amount, false),
            status: (withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)) as ApplicationStatus,
            bankName: withdrawal.bank_name,
            accountNumber: maskAccountNumber(withdrawal.bank_account),
        }));
    }, [withdrawalsData]);



    const handleItemPress = (item: Transaction) => {
        setSelectedTransaction(item);
        actionSheetRef.current?.show();
    };

    const handleCancelWithdrawal = async () => {
        if (!selectedTransaction) return;
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                // In a real app, call API here
                resolve();
            }, 2000);
        });
    };

    const renderList = () => {
        const isLoading = selectedIndex === 0 ? isPayoutsLoading : isWithdrawalsLoading;

        if (isLoading) {
            return (
                <>
                    {[...Array(3)].map((_, i) => (
                        <TransactionItemSkeleton key={i} />
                    ))}
                </>
            );
        }

        const data = selectedIndex === 0 ? formattedPayouts : formattedWithdrawals;

        if (data.length === 0) {
            return (
                <View style={styles.emptyStateContainer}>
                    <LottieView
                        source={require('@/assets/lotties/not-found.json')}
                        autoPlay
                        loop
                        style={styles.lottie}
                    />
                    <ThemedText style={styles.emptyStateText}>
                        {selectedIndex === 0 ? 'No payouts yet' : 'No withdrawals yet'}
                    </ThemedText>
                    <ThemedText style={styles.emptyStateSubtext}>
                        {selectedIndex === 0
                            ? 'Your earnings will appear here once campaigns are completed'
                            : 'Request a withdrawal to see it here'
                        }
                    </ThemedText>
                </View>
            );
        }

        return data.map((item) => (
            <PastPayoutListItem
                key={item.id}
                campaignName={item.campaignName}
                accountNumber={item.accountNumber}
                date={item.date}
                amount={item.amount}
                status={item.status}
                onPress={() => handleItemPress(item)}
            />
        ));
    };

    const sheetDetails = useMemo((): DetailItem[] => {
        if (!selectedTransaction) return [];

        const details: DetailItem[] = [];

        if (selectedTransaction.campaignName !== 'Withdraw') {
            // Payout: Campaign, Date, Amount
            details.push({ label: 'Campaign', value: selectedTransaction.campaignName });
            details.push({ label: 'Date', value: selectedTransaction.date });
            details.push({ label: 'Amount', value: selectedTransaction.amount });
        } else {
            // Withdrawal: Date, Amount, Bank, Account Number, Status
            details.push({ label: 'Date', value: selectedTransaction.date });
            details.push({ label: 'Amount', value: selectedTransaction.amount });
            if (selectedTransaction.bankName) details.push({ label: 'Bank', value: selectedTransaction.bankName });
            if (selectedTransaction.accountNumber) details.push({ label: 'Account Number', value: selectedTransaction.accountNumber });
            if (selectedTransaction.status) {
                const isPendingOrProcessing = ['Pending', 'Processing'].includes(selectedTransaction.status);
                details.push({
                    label: 'Status',
                    value: selectedTransaction.status,
                    valueStyle: {
                        color: isPendingOrProcessing ? '#F57C00' : '#2E7D32'
                    },
                    note: isPendingOrProcessing ? 'Estimated arrival: 2-5 days' : undefined
                });
            }
        }

        return details;
    }, [selectedTransaction]);

    const showCancelButton = selectedTransaction?.campaignName === 'Withdraw' && selectedTransaction?.status === 'Pending';

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: Colors[colorScheme ?? 'light'].screenBackground,
                    paddingTop: insets.top,
                },
            ]}
        >
            <Header title="Payouts" />

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

                {/* Segmented Control */}
                <View style={styles.section}>
                    <SegmentedControl
                        segments={[{ label: 'Payouts' }, { label: 'Withdrawals' }]}
                        onChangeIndex={(index: number) => setSelectedIndex(index)}
                        backgroundColor={Colors[colorScheme ?? 'light'].background}
                        activeBackgroundColor={Colors[colorScheme ?? 'light'].tint}
                        activeColor={Colors[colorScheme ?? 'light'].background}
                        style={{ height: 45 }}
                    />
                </View>

                {/* List */}
                <View style={styles.section}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                        {selectedIndex === 0 ? 'Past Payouts' : 'Withdrawal History'}
                    </ThemedText>

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
                title={selectedTransaction?.campaignName === 'Withdraw' ? "Withdrawal Details" : "Payout Details"}
                details={sheetDetails}
                onCancel={showCancelButton ? handleCancelWithdrawal : undefined}
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
        marginBottom: 24,
    },
    list: {
        gap: 8,
    },
    bannerContainer: {
        // Banner generic container
    },
    skeletonItem: {
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        height: 80,
        marginBottom: 8,
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
});
