import { useState, useCallback, useRef, useMemo } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SegmentedControl } from 'react-native-ui-lib';
import { useRouter } from 'expo-router';
import { ActionSheetRef } from "react-native-actions-sheet";

import { Header } from '@/components/Header';
import { Banner } from '@/components/Banner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { PayoutCard } from '@/components/PayoutCard';
import { PastPayoutListItem } from '@/components/PastPayoutListItem';
import { TransactionDetailsSheet, DetailItem } from '@/components/TransactionDetailsSheet';

interface Transaction {
    id: string;
    campaignName: string;
    date: string;
    amount: string;
    status?: string;
    bankName?: string;
    accountNumber?: string;
}

const pastPayouts: Transaction[] = [
    { id: '1', campaignName: 'Campaign Name', date: '14/2/26', amount: '+ Rm 1.8k' },
    { id: '2', campaignName: 'Campaign Name', date: '14/2/26', amount: '+ Rm 1.8k' },
    { id: '3', campaignName: 'Campaign Name', date: '14/2/26', amount: '+ Rm 1.8k' },
    { id: '4', campaignName: 'Campaign Name', date: '14/2/26', amount: '+ Rm 1.8k' },
];

const withdrawals: Transaction[] = [
    { id: '1', campaignName: 'Withdraw', date: '12/2/26', amount: '- Rm 500', status: 'Pending', bankName: 'Public Bank Berhad', accountNumber: '6558********' },
    { id: '2', campaignName: 'Withdraw', date: '10/2/26', amount: '- Rm 1.0k', status: 'Paid', bankName: 'Public Bank Berhad', accountNumber: '6558********' },
];

export default function PayoutsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const actionSheetRef = useRef<ActionSheetRef>(null);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 2000);
    }, []);

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
        const data = selectedIndex === 0 ? pastPayouts : withdrawals;
        return data.map((item) => (
            <PastPayoutListItem
                key={item.id}
                campaignName={item.campaignName}
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
                details.push({
                    label: 'Status',
                    value: selectedTransaction.status,
                    valueStyle: {
                        color: selectedTransaction.status === 'Pending' ? '#F57C00' : '#2E7D32'
                    }
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
                        amount="Rm 453"
                        onWithdraw={() => router.push('/withdraw')}
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
                <View style={styles.bannerContainer}>
                    <Banner type="cashback" />
                </View>
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
        marginBottom: 12,
    },
    list: {
        gap: 8,
    },
    bannerContainer: {
        // Banner generic container
    }
});
