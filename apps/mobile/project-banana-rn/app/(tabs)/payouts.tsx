import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header } from '@/components/Header';
import { Banner } from '@/components/Banner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { PayoutCard } from '@/components/PayoutCard';
import { PastPayoutListItem } from '@/components/PastPayoutListItem';

const pastPayouts = [
    { id: '1', campaignName: 'Campaign Name', date: '14/2/26', amount: '+ Rm 1.8k' },
    { id: '2', campaignName: 'Campaign Name', date: '14/2/26', amount: '+ Rm 1.8k' },
    { id: '3', campaignName: 'Campaign Name', date: '14/2/26', amount: '+ Rm 1.8k' },
    { id: '4', campaignName: 'Campaign Name', date: '14/2/26', amount: '+ Rm 1.8k' },
];

export default function PayoutsScreen() {
    const colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();
    const [selectedTab, setSelectedTab] = useState<'payouts' | 'withdrawals'>('payouts');
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 2000);
    }, []);

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
                    <PayoutCard amount="Rm 453" />
                </View>

                {/* Segmented Control */}
                <View style={styles.section}>
                    <View style={styles.segmentedControl}>
                        <Pressable
                            style={[
                                styles.segmentButton,
                                selectedTab === 'payouts' && styles.selectedSegment
                            ]}
                            onPress={() => setSelectedTab('payouts')}
                        >
                            <ThemedText style={[
                                styles.segmentText,
                                selectedTab === 'payouts' && styles.selectedSegmentText
                            ]}>Payouts</ThemedText>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.segmentButton,
                                selectedTab === 'withdrawals' && styles.selectedSegment
                            ]}
                            onPress={() => setSelectedTab('withdrawals')}
                        >
                            <ThemedText style={[
                                styles.segmentText,
                                selectedTab === 'withdrawals' && styles.selectedSegmentText
                            ]}>Withdrawals</ThemedText>
                        </Pressable>
                    </View>
                </View>

                {/* Past Payouts List */}
                <View style={styles.section}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                        Past Payouts
                    </ThemedText>

                    <View style={styles.list}>
                        {pastPayouts.map((item) => (
                            <PastPayoutListItem
                                key={item.id}
                                campaignName={item.campaignName}
                                date={item.date}
                                amount={item.amount}
                            />
                        ))}
                    </View>
                </View>

                {/* Banner */}
                <View style={styles.bannerContainer}>
                    <Banner type="cashback" />
                </View>
            </ScrollView>
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
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#F0F0F0',
        borderRadius: 12,
        padding: 4,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    selectedSegment: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentText: {
        fontSize: 14,
        fontFamily: 'GoogleSans_700Bold',
        color: '#666666',
    },
    selectedSegmentText: {
        color: '#000000',
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
