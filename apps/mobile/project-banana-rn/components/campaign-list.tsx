import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { LogoCard } from '@/components/LogoCard';
import { CampaignListItem } from '@/components/CampaignListItem';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Demo data
const trendingCampaigns = [
    { id: '1', name: 'Campaign A', claimed: 486, viewCount: '1k', payout: '15', logoUrl: undefined },
    { id: '2', name: 'Campaign B', claimed: 486, viewCount: '1k', payout: '15', logoUrl: undefined },
];

const campaignList = [
    { id: '3', name: 'Campaign Name', claimed: 486, viewCount: '1k', payout: '15' },
    { id: '4', name: 'Campaign Name', claimed: 486, viewCount: '1k', payout: '15' },
    { id: '5', name: 'Campaign Name', claimed: 486, viewCount: '1k', payout: '15' },
    { id: '6', name: 'Campaign Name', claimed: 486, viewCount: '1k', payout: '15' },
];

export function CampaignList() {
    const colorScheme = useColorScheme();
    const router = useRouter();

    const handlePress = (id: string) => {
        router.push(`/campaign/${id}`);
    };

    return (
        <View style={styles.container}>
            {/* Trending Now Section */}
            <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                    Trending Now 🔥
                </ThemedText>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.trendingScroll}
                >
                    {trendingCampaigns.map((campaign) => (
                        <LogoCard
                            key={campaign.id}
                            name={campaign.name}
                            claimed={campaign.claimed}
                            viewCount={campaign.viewCount}
                            payout={campaign.payout}
                            logoUrl={campaign.logoUrl}
                            onPress={() => handlePress(campaign.id)}
                        />
                    ))}
                </ScrollView>
            </View>

            {/* Filter Section */}
            <View style={styles.filterSection}>
                <Pressable style={styles.filterButton}>
                    <ThemedText style={styles.filterButtonText}>For you</ThemedText>
                    <ChevronDown size={16} color={Colors[colorScheme ?? 'light'].text} />
                </Pressable>
                <Pressable style={styles.filterButton}>
                    <ThemedText style={styles.filterButtonText}>Filter</ThemedText>
                    <ChevronDown size={16} color={Colors[colorScheme ?? 'light'].text} />
                </Pressable>
            </View>

            {/* Campaign List */}
            <View style={styles.listSection}>
                {campaignList.map((campaign) => (
                    <CampaignListItem
                        key={campaign.id}
                        name={campaign.name}
                        claimed={campaign.claimed}
                        viewCount={campaign.viewCount}
                        payout={campaign.payout}
                        onPress={() => handlePress(campaign.id)}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        paddingTop: 16,
    },
    sectionTitle: {
        fontSize: 18,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    trendingScroll: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    filterSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
    },
    filterButtonText: {
        fontSize: 14,
        fontFamily: 'GoogleSans_500Medium',
    },
    listSection: {
        paddingHorizontal: 16,
    },
});
