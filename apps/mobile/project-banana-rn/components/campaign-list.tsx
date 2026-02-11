import { useRef, useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    useSharedValue
} from 'react-native-reanimated';
import { Filter, ArrowUpDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ActionSheetRef } from 'react-native-actions-sheet';
import LottieView from 'lottie-react-native';
import { usePaginatedQuery } from 'convex/react';

import { CampaignListItem } from '@/components/CampaignListItem';
import { SelectionSheet } from '@/components/SelectionSheet';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '../../../../packages/backend/convex/_generated/api';

const CATEGORY_OPTIONS = [
    { label: 'For you', value: 'for-you' },
    { label: 'No-face', value: 'no-face' },
    { label: 'Script 1:1', value: 'script-1-1' },
    { label: 'Food Review', value: 'food-review' },
    { label: 'Product Review', value: 'product-review' },
];

const SORT_OPTIONS = [
    { label: 'Pay per 1k view', value: 'payout-view' },
    { label: 'Max Payout', value: 'max-payout' },
    { label: 'Number of claimed', value: 'claimed' },
];

const CampaignSkeleton = () => {
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

export function CampaignList() {
    const colorScheme = useColorScheme();
    const router = useRouter();

    const categorySheetRef = useRef<ActionSheetRef>(null);
    const sortSheetRef = useRef<ActionSheetRef>(null);

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedSort, setSelectedSort] = useState<string | null>(null);

    // Fetch campaigns from Convex
    const { results, status } = usePaginatedQuery(
        api.campaigns.getActiveCampaigns,
        {},
        { initialNumItems: 20 }
    );

    const isLoading = status === 'LoadingFirstPage';

    const handlePress = (id: string) => {
        router.push(`/campaign/${id}`);
    };

    const handleCategorySelect = (value: string) => {
        setSelectedCategory(value);
    };

    const handleSortSelect = (value: string) => {
        setSelectedSort(value);
    };

    // Process campaigns data
    const processedCampaigns = useMemo(() => {
        if (!results) return [];

        return results.map((campaign) => {
            // Calculate pay per 1k views from payout thresholds
            const payoutPer1k = campaign.payout_thresholds?.[0]?.payout || 0;

            return {
                id: campaign._id,
                name: campaign.name,
                companyName: 'Campaign', // You'll need to join with business table to get this
                claimed: campaign.budget_claimed || 0,
                viewCount: '1k',
                payout: payoutPer1k.toString(),
                maxPayout: campaign.maximum_payout.toString(),
                logoUrl: campaign.cover_photo_url || 'https://via.placeholder.com/100',
                isTrending: campaign.budget_claimed > 1000, // Calculate trending based on claimed budget
                category: 'for-you', // You'll need to add category field to schema
            };
        });
    }, [results]);

    // Filter and sort campaigns
    const filteredCampaigns = useMemo(() => {
        return processedCampaigns.filter(campaign => {
            if (!selectedCategory || selectedCategory === 'for-you') return true;
            return campaign.category === selectedCategory;
        });
    }, [processedCampaigns, selectedCategory]);

    const sortedCampaigns = useMemo(() => {
        if (!selectedSort) return filteredCampaigns;

        return [...filteredCampaigns].sort((a, b) => {
            switch (selectedSort) {
                case 'payout-view':
                    return parseFloat(b.payout) - parseFloat(a.payout);
                case 'max-payout':
                    return parseFloat(b.maxPayout) - parseFloat(a.maxPayout);
                case 'claimed':
                    return b.claimed - a.claimed;
                default:
                    return 0;
            }
        });
    }, [filteredCampaigns, selectedSort]);

    return (
        <View style={styles.container}>
            {/* Filter Section */}
            <View style={styles.filterSection}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                    Campaigns
                </ThemedText>

                <View style={styles.filterButtons}>
                    <Pressable
                        style={[
                            styles.filterButton,
                            selectedCategory && { backgroundColor: '#F0F0F0', borderColor: '#1A1A1A' }
                        ]}
                        onPress={() => categorySheetRef.current?.show()}
                    >
                        <ThemedText style={styles.filterButtonText}>
                            {selectedCategory ? CATEGORY_OPTIONS.find(c => c.value === selectedCategory)?.label : 'Category'}
                        </ThemedText>
                        <Filter size={14} color={Colors[colorScheme ?? 'light'].text} />
                    </Pressable>
                    <Pressable
                        style={[
                            styles.filterButton,
                            selectedSort && { backgroundColor: '#F0F0F0', borderColor: '#1A1A1A' }
                        ]}
                        onPress={() => sortSheetRef.current?.show()}
                    >
                        <ThemedText style={styles.filterButtonText}>
                            {selectedSort ? SORT_OPTIONS.find(s => s.value === selectedSort)?.label : 'Sort By'}
                        </ThemedText>
                        <ArrowUpDown size={14} color={Colors[colorScheme ?? 'light'].text} />
                    </Pressable>
                </View>
            </View>

            <View style={styles.listSection}>
                {isLoading ? (
                    <View>
                        {[...Array(6)].map((_, i) => (
                            <CampaignSkeleton key={i} />
                        ))}
                    </View>
                ) : sortedCampaigns.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        <LottieView
                            source={require('@/assets/lotties/not-found.json')}
                            autoPlay
                            loop
                            style={styles.lottie}
                        />
                        <ThemedText style={styles.emptyStateText}>
                            No campaigns found
                        </ThemedText>
                        <ThemedText style={styles.emptyStateSubtext}>
                            Try adjusting your filters
                        </ThemedText>
                    </View>
                ) : (
                    sortedCampaigns.map((campaign) => (
                        <CampaignListItem
                            key={campaign.id}
                            name={campaign.name}
                            companyName={campaign.companyName}
                            claimed={campaign.claimed}
                            viewCount={campaign.viewCount}
                            payout={campaign.payout}
                            maxPayout={campaign.maxPayout}
                            logoUrl={campaign.logoUrl}
                            isTrending={campaign.isTrending}
                            onPress={() => handlePress(campaign.id)}
                        />
                    ))
                )}
            </View>

            <SelectionSheet
                actionSheetRef={categorySheetRef}
                title="Select Category"
                options={CATEGORY_OPTIONS}
                selectedOption={selectedCategory}
                onSelect={handleCategorySelect}
                onReset={() => setSelectedCategory(null)}
                type="filter"
            />

            <SelectionSheet
                actionSheetRef={sortSheetRef}
                title="Sort By"
                options={SORT_OPTIONS}
                selectedOption={selectedSort}
                onSelect={handleSortSelect}
                onReset={() => setSelectedSort(null)}
                type="sort"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
    },
    filterSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
    },
    filterButtons: {
        flexDirection: 'row',
        gap: 8,
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
        fontSize: 12,
        fontFamily: 'GoogleSans_500Medium',
    },
    listSection: {
        paddingHorizontal: 16,
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
    },
    lottie: {
        width: 150,
        height: 150,
    },
    skeletonItem: {
        width: '100%',
        height: 100,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        marginBottom: 12,
    },
});
