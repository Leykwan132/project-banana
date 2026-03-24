import { useState, useMemo, useEffect } from 'react';
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
import LottieView from 'lottie-react-native';
import { usePaginatedQuery } from 'convex/react';

import { CampaignListItem } from '@/components/CampaignListItem';
import { SelectionSheet } from '@/components/SelectionSheet';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '../../../../packages/backend/convex/_generated/api';
import { usePostHog } from 'posthog-react-native';

import { CAMPAIGN_CATEGORIES } from '@/constants/campaignCategories';



const SORT_OPTIONS = [
    { label: 'Base Pay', value: 'payout-view' },
    { label: 'Max Payout', value: 'max-payout' },
    { label: 'Number of claimed', value: 'claimed' },
];

const CampaignSkeleton = () => {
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
        <Animated.View style={[styles.skeletonItem, animatedStyle, { backgroundColor: isDark ? '#1F1F1F' : '#ECE8DF' }]} />
    );
};

export function CampaignList() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const filterBackgroundColor = isDark ? '#141414' : '#F7F4ED';
    const filterBorderColor = isDark ? '#303030' : '#E4DED2';
    const selectedBadgeBackgroundColor = isDark ? '#D84300' : '#E24A10';
    const selectedBadgeBorderColor = isDark ? '#D84300' : '#E24A10';
    const selectedBadgeTextColor = '#FFFFFF';
    const router = useRouter();

    const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
    const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedSort, setSelectedSort] = useState<string | null>(null);

    // Fetch campaigns from Convex
    const { results, status } = usePaginatedQuery(
        api.campaigns.getActiveCampaigns,
        {},
        { initialNumItems: 20 }
    );

    const isLoading = status === 'LoadingFirstPage';

    const posthog = usePostHog();

    const handlePress = (id: string, campaignName?: string, companyName?: string) => {
        posthog.capture('campaign_item_selected', {
            campaign_id: id,
            campaign_name: campaignName ?? '',
            company_name: companyName ?? '',
        });
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
            return {
                id: campaign.campaignId,
                name: campaign.name,
                companyName: campaign.business_name,
                claimed: campaign.submissions || 0,
                basePay: (campaign.base_pay || 0).toString(),
                budgetClaimed: campaign.budget_claimed?.toString() || '0',
                maxPayout: campaign.maximum_payout.toString(),
                logoUrl: campaign.logo_url || null,
                logoR2Key: campaign.logo_r2_key || null,
                isTrending: campaign.submissions > 1000, // Calculate trending based on claimed budget
                category: campaign.category || 'for-you', // You'll need to add category field to schema
            };
        });
    }, [results]);

    // Filter and sort campaigns
    const filteredCampaigns = useMemo(() => {
        return processedCampaigns.filter(campaign => {
            if (!selectedCategory) return true;

            const categoryLabel = CAMPAIGN_CATEGORIES.find(c => c.id === selectedCategory)?.label;

            const categories = campaign.category;
            if (Array.isArray(categories)) {
                return categories.includes(categoryLabel as string);
            }
            return categories === categoryLabel;
        });
    }, [processedCampaigns, selectedCategory]);

    const sortedCampaigns = useMemo(() => {
        if (!selectedSort) return filteredCampaigns;

        return [...filteredCampaigns].sort((a, b) => {
            switch (selectedSort) {
                case 'payout-view':
                    return parseFloat(b.basePay) - parseFloat(a.basePay);
                case 'max-payout':
                    return parseFloat(b.maxPayout) - parseFloat(a.maxPayout);
                case 'claimed':
                    return b.claimed - a.claimed;
                default:
                    return 0;
            }
        });
    }, [filteredCampaigns, selectedSort]);

    const categoryOptionsWithCounts = useMemo(() => {
        const counts = processedCampaigns.reduce((acc, campaign) => {
            const categoryMatch = CAMPAIGN_CATEGORIES.find(c =>
                Array.isArray(campaign.category)
                    ? (campaign.category.includes(c.label) || campaign.category.includes(c.id))
                    : (campaign.category === c.label || campaign.category === c.id)
            );

            if (categoryMatch) {
                acc[categoryMatch.id] = (acc[categoryMatch.id] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return CAMPAIGN_CATEGORIES.map(c => ({
            label: `${c.label} (${counts[c.id] || 0})`,
            shortLabel: c.label,
            count: counts[c.id] || 0,
            value: c.id,
            icon: c.icon
        }));
    }, [processedCampaigns]);

    const selectedCategoryOption = useMemo(
        () => categoryOptionsWithCounts.find((category) => category.value === selectedCategory),
        [categoryOptionsWithCounts, selectedCategory]
    );

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
                            { backgroundColor: filterBackgroundColor, borderColor: filterBorderColor },
                            selectedCategory && { backgroundColor: selectedBadgeBackgroundColor, borderColor: selectedBadgeBorderColor }
                        ]}
                        onPress={() => setIsCategorySheetOpen(true)}
                    >
                        {selectedCategory && selectedCategoryOption ? (
                            <>
                                <View style={styles.filterButtonLeading}>
                                    <selectedCategoryOption.icon
                                        size={14}
                                        color={selectedBadgeTextColor}
                                    />
                                    <ThemedText style={[
                                        styles.filterButtonText,
                                        { color: selectedBadgeTextColor }
                                    ]}>
                                        {selectedCategoryOption.shortLabel}
                                    </ThemedText>
                                </View>
                                <ThemedText style={[
                                    styles.filterButtonCount,
                                    { color: selectedBadgeTextColor }
                                ]}>
                                    {selectedCategoryOption.count}
                                </ThemedText>
                            </>
                        ) : (
                            <>
                                <ThemedText style={styles.filterButtonText}>
                                    Category
                                </ThemedText>
                                <Filter size={14} color={Colors[colorScheme ?? 'light'].text} />
                            </>
                        )}
                    </Pressable>
                    <Pressable
                        style={[
                            styles.filterButton,
                            { backgroundColor: filterBackgroundColor, borderColor: filterBorderColor },
                            selectedSort && { backgroundColor: selectedBadgeBackgroundColor, borderColor: selectedBadgeBorderColor }
                        ]}
                        onPress={() => setIsSortSheetOpen(true)}
                    >
                        <ThemedText style={[
                            styles.filterButtonText,
                            selectedSort && { color: selectedBadgeTextColor }
                        ]}>
                            {selectedSort ? SORT_OPTIONS.find(s => s.value === selectedSort)?.label : 'Sort By'}
                        </ThemedText>
                        <ArrowUpDown size={14} color={selectedSort ? selectedBadgeTextColor : Colors[colorScheme ?? 'light'].text} />
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
                        <ThemedText style={[styles.emptyStateText, { color: isDark ? '#D4D4D4' : '#4B5563' }]}>
                            No campaigns found
                        </ThemedText>
                        <ThemedText style={[styles.emptyStateSubtext, { color: isDark ? '#8A8A8A' : '#9CA3AF' }]}>
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
                            budgetClaimed={campaign.budgetClaimed}
                            maxPayout={campaign.maxPayout}
                            logoUrl={campaign.logoUrl}
                            logoR2Key={campaign.logoR2Key}
                            isTrending={campaign.isTrending}
                            category={campaign.category}
                            onPress={() => handlePress(campaign.id, campaign.name, campaign.companyName)}
                        />
                    ))
                )}
            </View>

            <SelectionSheet
                open={isCategorySheetOpen}
                onClose={() => setIsCategorySheetOpen(false)}
                title="Select Category"
                options={categoryOptionsWithCounts}
                selectedOption={selectedCategory}
                onSelect={handleCategorySelect}
                onReset={() => setSelectedCategory(null)}
                type="filter"
            />

            <SelectionSheet
                open={isSortSheetOpen}
                onClose={() => setIsSortSheetOpen(false)}
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
    filterButtonLeading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    filterButtonText: {
        fontSize: 14,
        fontFamily: 'GoogleSans_500Medium',
    },
    filterButtonCount: {
        fontSize: 14,
        fontFamily: 'GoogleSans_700Bold',
        marginLeft: 4,
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
