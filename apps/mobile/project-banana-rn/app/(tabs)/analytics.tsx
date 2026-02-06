import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';

import { Header } from '@/components/Header';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { TopCampaignListItem } from '@/components/TopCampaignListItem';

const metrics = [
    { id: 'earnings', title: 'Earnings', value: 'Rm 453', icon: 'netflix', type: 'large' },
    { id: 'views', title: 'Views', value: '45K', icon: 'dropbox', type: 'small' },
    { id: 'likes', title: 'Likes', value: '340K', icon: 'dropbox', type: 'small' },
    { id: 'comments', title: 'Comments', value: '4,600', icon: 'dropbox', type: 'small' },
    { id: 'share', title: 'Share', value: '333', icon: 'netflix', type: 'small' },
];

const topCampaigns = [
    { id: '1', name: 'Campaign Name', value: '1.8k', progress: 0.7 },
    { id: '2', name: 'Campaign Name', value: '1.8k', progress: 0.5 },
    { id: '3', name: 'Campaign Name', value: '1.8k', progress: 0.3 },
];

export default function AnalyticsScreen() {
    const colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();
    const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 2000);
    }, []);

    const MetricCard = ({ item }: { item: typeof metrics[0] }) => {
        const isSelected = selectedMetric === item.id;
        const IconComponent = () => {
            // Placeholder icons based on screenshot using images or text
            if (item.icon === 'netflix') {
                return (
                    <View style={styles.iconPlaceholder}>
                        <ThemedText style={{ color: 'red', fontWeight: 'bold' }}>N</ThemedText>
                    </View>
                )
            }
            return (
                <View style={[styles.iconPlaceholder, { backgroundColor: '#E3F2FD' }]}>
                    <ThemedText style={{ color: '#2196F3', fontWeight: 'bold' }}>box</ThemedText>
                </View>
            )
        };

        return (
            <Pressable
                onPress={() => setSelectedMetric(item.id)}
                style={[
                    styles.card,
                    item.type === 'large' ? styles.largeCard : styles.smallCard,
                    isSelected && styles.selectedCard,
                ]}
            >
                <IconComponent />
                <View style={styles.cardContent}>
                    <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
                    <ThemedText style={styles.cardValue}>{item.value}</ThemedText>
                </View>
            </Pressable>
        );
    };

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
            <Header title="Analytics" />
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Metrics Grid */}
                <View style={styles.metricsContainer}>
                    {/* Large Card (Earnings) */}
                    <MetricCard item={metrics[0]} />

                    {/* Grid of Small Cards */}
                    <View style={styles.gridRow}>
                        <MetricCard item={metrics[1]} />
                        <MetricCard item={metrics[2]} />
                    </View>
                    <View style={styles.gridRow}>
                        <MetricCard item={metrics[3]} />
                        <MetricCard item={metrics[4]} />
                    </View>
                </View>

                {/* Top Campaigns Section */}
                <View style={styles.campaignsSection}>
                    <View style={styles.sectionHeader}>
                        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                            Your top campaigns
                        </ThemedText>
                        <Pressable style={styles.filterButton}>
                            <ThemedText style={styles.filterButtonText}>Share</ThemedText>
                            <ChevronDown size={16} color={Colors[colorScheme ?? 'light'].text} />
                        </Pressable>
                    </View>

                    <View style={styles.campaignList}>
                        {topCampaigns.map((campaign) => (
                            <TopCampaignListItem
                                key={campaign.id}
                                name={campaign.name}
                                value={campaign.value}
                                progress={campaign.progress}
                            />
                        ))}
                    </View>
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
    metricsContainer: {
        paddingHorizontal: 16,
        paddingTop: 4,
        gap: 12,
        marginBottom: 24,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 12,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        minHeight: 120, // ensure some height
        justifyContent: 'space-between',
    },
    largeCard: {
        width: '100%',
        height: 160,
    },
    smallCard: {
        flex: 1,
        height: 140, // consistent height might look cleaner
    },
    selectedCard: {
        borderColor: '#000000',
        borderWidth: 1.5,
        padding: 15.5, // Compensate for increased border width (1.5 - 1.0 = 0.5 diff from base padding 16)
    },
    cardContent: {
        gap: 4,
    },
    cardTitle: {
        fontSize: 14,
        color: '#666666',
        fontFamily: 'GoogleSans_400Regular',
    },
    cardValue: {
        fontSize: 24,
        fontFamily: 'GoogleSans_700Bold',
    },
    iconPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3E5F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    // Campaigns Section
    campaignsSection: {
        paddingHorizontal: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
    },
    filterButtonText: {
        fontSize: 14,
        fontFamily: 'GoogleSans_500Medium',
    },
    campaignList: {
        gap: 16,
    },
});
