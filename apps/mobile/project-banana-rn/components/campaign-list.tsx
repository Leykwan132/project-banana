import { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Filter, ArrowUpDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ActionSheetRef } from 'react-native-actions-sheet';
import LottieView from 'lottie-react-native';


import { CampaignListItem } from '@/components/CampaignListItem';
import { SelectionSheet } from '@/components/SelectionSheet';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Demo data
const trendingCampaigns = [
    { id: '1', name: 'Zus Coffee: New Frappe Launch', companyName: 'Zus Coffee', claimed: 1240, viewCount: '1k', payout: '25', maxPayout: '500', logoUrl: 'https://zuscoffee.com/wp-content/uploads/2025/07/app-logo-resize-256x256-1.png', category: 'food-review' },
    { id: '2', name: 'Shopee 9.9 Super Sale', companyName: 'Shopee Malaysia', claimed: 5892, viewCount: '1k', payout: '10', maxPayout: '300', logoUrl: 'https://static.vecteezy.com/system/resources/thumbnails/028/766/353/small/shopee-icon-symbol-free-png.png', category: 'product-review' },
];

const campaignList = [
    { id: '3', name: 'Merdeka Special: Makan Lokal', companyName: 'GrabFood', claimed: 856, viewCount: '1k', payout: '20', maxPayout: '450', logoUrl: 'https://images.seeklogo.com/logo-png/62/2/grab-logo-png_seeklogo-622162.png', category: 'food-review' },
    { id: '4', name: 'Watsons K-Beauty Review', companyName: 'Watsons', claimed: 342, viewCount: '1k', payout: '35', maxPayout: '800', logoUrl: 'https://www.watsonsasia.com/assets/images/logo_watsons_mobile.png', category: 'product-review' },
    { id: '5', name: 'AirAsia FREE Seats Promo', companyName: 'AirAsia', claimed: 2105, viewCount: '1k', payout: '15', maxPayout: '1000', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/AirAsia_New_Logo.svg/250px-AirAsia_New_Logo.svg.png', category: 'for-you' },
    { id: '6', name: 'Uniqlo AIRism Challenge', companyName: 'Uniqlo MY', claimed: 980, viewCount: '1k', payout: '40', maxPayout: '600', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/UNIQLO_logo.svg/1024px-UNIQLO_logo.svg.png', category: 'product-review' },
    { id: '7', name: 'MyTown KL: Weekend Vibes', companyName: 'MyTown Shopping Centre', claimed: 156, viewCount: '1k', payout: '30', maxPayout: '400', logoUrl: 'https://mytownkl.com.my/assets/img/og_image.png', category: 'for-you' },
    { id: '8', name: 'Touch n Go RFID Campaign', companyName: 'Touch n Go', claimed: 3100, viewCount: '1k', payout: '12', maxPayout: '250', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Touch_%27n_Go_logo.svg/1280px-Touch_%27n_Go_logo.svg.png', category: 'product-review' },
];

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

export function CampaignList() {
    const colorScheme = useColorScheme();
    const router = useRouter();

    const categorySheetRef = useRef<ActionSheetRef>(null);
    const sortSheetRef = useRef<ActionSheetRef>(null);

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedSort, setSelectedSort] = useState<string | null>(null);

    const handlePress = (id: string) => {
        router.push(`/campaign/${id}`);
    };

    const handleCategorySelect = (value: string) => {
        setSelectedCategory(value);
    };

    const handleSortSelect = (value: string) => {
        setSelectedSort(value);
    };

    // Merge and Process Data
    const allCampaigns = [
        ...trendingCampaigns.map(c => ({ ...c, isTrending: true })),
        ...campaignList.map(c => ({ ...c, isTrending: false }))
    ];

    const filteredCampaigns = allCampaigns.filter(campaign => {
        if (!selectedCategory || selectedCategory === 'for-you') return true;
        return campaign.category === selectedCategory;
    });

    const sortedCampaigns = filteredCampaigns.sort((a, b) => {
        if (!selectedSort) return 0;

        switch (selectedSort) {
            case 'payout-view':
                return parseInt(b.payout) - parseInt(a.payout);
            case 'maxPayout': // The value in SORT_OPTIONS must match or be mapped
            case 'max-payout':
                return parseInt(b.maxPayout || '0') - parseInt(a.maxPayout || '0');
            case 'claimed':
                return b.claimed - a.claimed;
            default:
                return 0;
        }
    });

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
                {sortedCampaigns.length === 0 ? (
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
});
