import { useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    useSharedValue
} from 'react-native-reanimated';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';

import { CampaignsAnalyticItem } from '@/components/CampaignsAnalyticItem';
import { ThemedText } from '@/components/themed-text';
import { api } from '../../../../packages/backend/convex/_generated/api';

const CampaignAnalyticSkeleton = () => {
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

interface CampaignsAnalyticListProps {
    sortBy?: string;
}

export function CampaignsAnalyticList({ sortBy = 'shares' }: CampaignsAnalyticListProps) {
    const router = useRouter();

    // Fetch all user campaign statuses
    const statuses = useQuery(api.userCampaignStatus.getUserCampaignStatuses);

    const isLoading = statuses === undefined;

    // Format number for display
    const formatNumber = (num: number): string => {
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toString();
    };

    // Process and sort campaign data
    const processedCampaigns = useMemo(() => {
        if (!statuses) return [];

        return statuses.map((status) => ({
            id: status._id,
            campaignId: status.campaign_id,
            name: 'Campaign Name', // TODO: Join with campaigns table
            companyName: 'Company', // TODO: Join with businesses table via campaigns
            logoUrl: undefined, // TODO: Get from campaigns table
            views: formatNumber(status.views || 0),
            likes: formatNumber(status.likes || 0),
            comments: formatNumber(status.comments || 0),
            shares: formatNumber(status.shares || 0),
            earnings: `RM ${status.total_earnings.toFixed(0)}`,
            // Raw values for sorting
            rawViews: status.views || 0,
            rawLikes: status.likes || 0,
            rawComments: status.comments || 0,
            rawShares: status.shares || 0,
            rawEarnings: status.total_earnings,
        }));
    }, [statuses]);

    // Sort campaigns based on selected option
    const sortedCampaigns = useMemo(() => {
        if (!processedCampaigns.length) return [];

        const campaigns = [...processedCampaigns];

        campaigns.sort((a, b) => {
            let aValue: number, bValue: number;

            switch (sortBy) {
                case 'views':
                    aValue = a.rawViews;
                    bValue = b.rawViews;
                    break;
                case 'likes':
                    aValue = a.rawLikes;
                    bValue = b.rawLikes;
                    break;
                case 'comments':
                    aValue = a.rawComments;
                    bValue = b.rawComments;
                    break;
                case 'shares':
                    aValue = a.rawShares;
                    bValue = b.rawShares;
                    break;
                case 'earnings':
                    aValue = a.rawEarnings;
                    bValue = b.rawEarnings;
                    break;
                default:
                    return 0;
            }

            // Sort in descending order (highest first)
            return bValue - aValue;
        });

        return campaigns;
    }, [processedCampaigns, sortBy]);

    return (
        <View style={styles.container}>
            {isLoading ? (
                <View>
                    {[...Array(3)].map((_, i) => (
                        <CampaignAnalyticSkeleton key={i} />
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
                        Join campaigns to track your analytics
                    </ThemedText>
                </View>
            ) : (
                sortedCampaigns.map((campaign) => (
                    <Pressable
                        key={campaign.id}
                        onPress={() => router.push(`/campaign-analytics/${campaign.campaignId}`)}
                    >
                        <CampaignsAnalyticItem
                            name={campaign.name}
                            companyName={campaign.companyName}
                            logoUrl={campaign.logoUrl}
                            views={campaign.views}
                            likes={campaign.likes}
                            comments={campaign.comments}
                            shares={campaign.shares}
                            earnings={campaign.earnings}
                        />
                    </Pressable>
                ))
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    skeletonItem: {
        width: '100%',
        height: 120,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        marginBottom: 12,
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
