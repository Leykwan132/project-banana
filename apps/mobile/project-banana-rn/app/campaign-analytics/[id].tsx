import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { View, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import { useQuery, useAction } from 'convex/react';
import Animated, {
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    useAnimatedStyle,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

import { ThemedText } from '@/components/themed-text';
import { ApplicationAnalyticItem } from '@/components/ApplicationAnalyticItem';
import { FlippableEarningsCard } from '@/components/FlippableEarningsCard';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { Id } from '../../../../../packages/backend/convex/_generated/dataModel';

type CampaignApplicationAnalytics = {
    _id: Id<'applications'>;
    created_at: number;
    title: string;
    thumbnail_url?: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    earnings: number;
};

const formatCurrency = (value: number) => `RM ${value.toLocaleString()}`;

const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return `${num}`;
};

const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString('en-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

const SkeletonBlock = ({ style }: { style: any }) => {
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
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return <Animated.View style={[{ backgroundColor: isDark ? '#1F1F1F' : '#ECE8DF' }, animatedStyle, style]} />;
};

const CampaignAnalyticsSkeleton = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const skeletonStyle = { backgroundColor: isDark ? '#1F1F1F' : '#ECE8DF' };

    return (
        <View>
            <View style={[styles.skeletonCircle, skeletonStyle]} />
            <View style={[styles.skeletonTitle, skeletonStyle]} />
            <View style={[styles.skeletonSubtitle, skeletonStyle]} />
            <View style={[styles.skeletonCard, skeletonStyle]} />
            <View style={[styles.skeletonListItem, skeletonStyle]} />
            <View style={[styles.skeletonListItem, skeletonStyle]} />
        </View>
    );
};

export default function CampaignAnalyticsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const screenBackgroundColor = isDark ? theme.screenBackground : '#F4F3EE';
    const controlBackgroundColor = isDark ? '#141414' : '#F7F4ED';
    const panelBorderColor = isDark ? '#303030' : '#E4DED2';
    const skeletonColor = isDark ? '#1F1F1F' : '#ECE8DF';

    const campaignId = typeof id === 'string' ? (id as Id<'campaigns'>) : undefined;

    const campaign = useQuery(
        api.campaigns.getCampaign,
        campaignId ? { campaignId } : 'skip'
    );
    const userCampaignStatus = useQuery(
        api.userCampaignStatus.getUserCampaignStatus,
        campaignId ? { campaignId } : 'skip'
    );
    const applications = useQuery(
        api.applications.getMyApplicationsByCampaignWithStats,
        campaignId ? { campaignId } : 'skip'
    ) as CampaignApplicationAnalytics[] | undefined;

    const generateCampaignImageAccessUrl = useAction(api.campaigns.generateCampaignImageAccessUrl);

    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!campaign) return;
        if (campaign.logo_r2_key) {
            let cancelled = false;
            setLogoUrl(null);
            generateCampaignImageAccessUrl({ r2Key: campaign.logo_r2_key })
                .then(url => { if (!cancelled) setLogoUrl(url || campaign.logo_url || null); })
                .catch(() => { if (!cancelled) setLogoUrl(campaign.logo_url || null); });
            return () => { cancelled = true; };
        } else {
            setLogoUrl(campaign.logo_url || null);
        }
    }, [campaign?.logo_r2_key, campaign?.logo_url, generateCampaignImageAccessUrl]);

    const isLoading =
        campaign === undefined ||
        userCampaignStatus === undefined ||
        applications === undefined;

    if (campaign === null) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: screenBackgroundColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <ThemedText>Campaign not found</ThemedText>
                <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <ThemedText style={{ color: 'blue' }}>Go Back</ThemedText>
                </Pressable>
            </View>
        );
    }

    const totalEarnings = userCampaignStatus?.total_earnings ?? 0;
    const maximumPayout = userCampaignStatus?.maximum_payout ?? campaign?.maximum_payout ?? 0;
    const remainingPayout = Math.max(0, maximumPayout - totalEarnings);
    const isMaxedOut = userCampaignStatus?.status === 'maxed_out';

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: screenBackgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={[styles.backButton, { borderColor: panelBorderColor, backgroundColor: controlBackgroundColor }]}>
                    <ArrowLeft size={20} color={theme.text} />
                </Pressable>
                {campaignId && (
                    <Pressable
                        style={[styles.viewCampaignButton, { borderColor: panelBorderColor, backgroundColor: controlBackgroundColor }]}
                        onPress={() => router.push(`/campaign/${campaignId}`)}
                    >
                        <ThemedText style={[styles.viewCampaignText, { color: theme.text }]}>View Campaign</ThemedText>
                        <ExternalLink size={14} color={theme.text} />
                    </Pressable>
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <CampaignAnalyticsSkeleton />
                ) : (
                    <>
                        <View style={styles.campaignInfo}>
                            <View style={styles.logoContainer}>
                                {campaign?.logo_r2_key && logoUrl === null ? (
                                    <SkeletonBlock style={[styles.logoPlaceholder, { backgroundColor: skeletonColor }]} />
                                ) : logoUrl ? (
                                    <Image source={{ uri: logoUrl }} style={styles.logoImage} />
                                ) : (
                                    <View style={[styles.logoPlaceholder, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: panelBorderColor }]}>
                                        <ThemedText style={[styles.logoText, { color: isDark ? '#D4D4D4' : '#6B7280' }]}>
                                            {(campaign?.business_name ?? 'C').charAt(0).toUpperCase()}
                                        </ThemedText>
                                    </View>
                                )}
                            </View>
                            <ThemedText style={styles.campaignName}>{campaign?.name}</ThemedText>
                            <ThemedText style={[styles.companyName, { color: isDark ? '#8A8A8A' : '#666666' }]}>{campaign?.business_name}</ThemedText>
                        </View>

                        <FlippableEarningsCard
                            style={{ marginBottom: 24 }}
                            frontContent={
                                totalEarnings > 0 ? (
                                    <ThemedText style={{ fontSize: 22, color: '#FFFFFF' }}>
                                        Your post is earning{' '}
                                        <ThemedText style={{ color: '#4CAF50', fontSize: 22 }}>
                                            {formatCurrency(totalEarnings)}
                                        </ThemedText>
                                    </ThemedText>
                                ) : (
                                    <ThemedText style={{ fontSize: 22, color: '#FFFFFF' }}>
                                        Your post is <ThemedText style={{ color: '#4CAF50', fontSize: 22 }}>earning</ThemedText> now!
                                    </ThemedText>
                                )
                            }
                            backContent={
                                isMaxedOut ? (
                                    <ThemedText style={{ color: '#FFFFFF', fontSize: 20 }}>
                                        You have <ThemedText style={{ color: '#FFD700', fontSize: 20 }}>maxed out</ThemedText> this campaign payout.
                                    </ThemedText>
                                ) : totalEarnings === 0 ? (
                                    <ThemedText style={{ color: '#FFFFFF', fontSize: 20 }}>
                                        Keep posting consistently, your first payout is coming.
                                    </ThemedText>
                                ) : (
                                    <ThemedText style={{ color: '#FFFFFF', fontSize: 20 }}>
                                        {remainingPayout > 0
                                            ? `${formatCurrency(remainingPayout)} left to max payout.`
                                            : 'Great momentum, keep scaling your post performance.'}
                                    </ThemedText>
                                )
                            }
                        />

                        <View style={styles.applicationsSection}>
                            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                                Your applications
                            </ThemedText>

                            {applications && applications.length > 0 ? (
                                <View style={styles.list}>
                                    {applications.map((application) => (
                                        <ApplicationAnalyticItem
                                            key={application._id}
                                            applicationName={application.title}
                                            submittedOn={formatDate(application.created_at)}
                                            thumbnailUrl={application.thumbnail_url}
                                            views={formatNumber(application.views)}
                                            likes={formatNumber(application.likes)}
                                            comments={formatNumber(application.comments)}
                                            shares={formatNumber(application.shares)}
                                            earnings={formatCurrency(application.earnings)}
                                            onPress={() => router.push(`/application-analytics/${application._id}`)}
                                        />
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.emptyStateContainer}>
                                    <LottieView
                                        source={require('@/assets/lotties/not-found.json')}
                                        autoPlay
                                        loop
                                        style={styles.lottie}
                                    />
                                    <ThemedText style={[styles.emptyStateText, { color: isDark ? '#8A8A8A' : '#6B7280' }]}>
                                        No application analytics yet
                                    </ThemedText>
                                </View>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    viewCampaignButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E4DED2',
    },
    viewCampaignText: {
        fontSize: 13,
        fontFamily: 'GoogleSans_500Medium',
        color: '#000000',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    campaignInfo: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoContainer: {
        marginBottom: 16,
    },
    logoImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        resizeMode: 'cover',
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FF9900',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 36,
        color: '#FFFFFF',
        fontFamily: 'GoogleSans_700Bold',
    },
    campaignName: {
        fontSize: 24,
        fontFamily: 'GoogleSans_700Bold',
        marginBottom: 4,
        textAlign: 'center',
    },
    companyName: {
        fontSize: 14,
        color: '#666666',
        fontFamily: 'GoogleSans_400Regular',
    },
    applicationsSection: {
        gap: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
    },
    list: {
        marginTop: 4,
    },
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
    },
    emptyStateText: {
        marginTop: 8,
        color: '#6B7280',
    },
    lottie: {
        width: 150,
        height: 150,
    },
    skeletonCircle: {
        alignSelf: 'center',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ECE8DF',
        marginBottom: 16,
    },
    skeletonTitle: {
        alignSelf: 'center',
        width: 180,
        height: 24,
        borderRadius: 8,
        backgroundColor: '#ECE8DF',
        marginBottom: 8,
    },
    skeletonSubtitle: {
        alignSelf: 'center',
        width: 120,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#ECE8DF',
        marginBottom: 24,
    },
    skeletonCard: {
        width: '100%',
        height: 140,
        borderRadius: 16,
        backgroundColor: '#ECE8DF',
        marginBottom: 24,
    },
    skeletonListItem: {
        width: '100%',
        height: 120,
        borderRadius: 12,
        backgroundColor: '#ECE8DF',
        marginBottom: 12,
    },
});
