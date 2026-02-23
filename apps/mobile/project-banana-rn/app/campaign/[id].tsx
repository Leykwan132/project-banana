import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { View, StyleSheet, Image, Pressable, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, Check, Building, ArrowUpRight, Video } from 'lucide-react-native';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import Animated, {
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    useAnimatedStyle,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CreatorListItem } from '@/components/CreatorListItem';
import { ActionSheetRef } from "react-native-actions-sheet";
import ActionSheet from "react-native-actions-sheet";
import { Timeline, Text, Assets } from 'react-native-ui-lib';
import LottieView from 'lottie-react-native';
import { CAMPAIGN_CATEGORIES } from '@/constants/campaignCategories';

import { api } from '../../../../../packages/backend/convex/_generated/api';
import { Id } from '../../../../../packages/backend/convex/_generated/dataModel';

// Helper to format currency
const formatCurrency = (amount: number) => {
    return `Rm ${amount.toLocaleString()}`;
};

// Helper to format views
const formatViews = (views: number) => {
    if (views >= 1000000) {
        return `${(views / 1000000).toFixed(1)}M views`;
    }
    if (views >= 1000) {
        return `${(views / 1000).toFixed(0)}k views`;
    }
    return `${views} views`;
};

const SkeletonBlock = ({ style }: { style: any }) => {
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

    return <Animated.View style={[styles.skeletonBlock, animatedStyle, style]} />;
};



export default function CampaignDetailsScreen() {
    const requirementsSheetRef = useRef<ActionSheetRef>(null);
    const payoutsSheetRef = useRef<ActionSheetRef>(null);
    const successSheetRef = useRef<ActionSheetRef>(null);
    const categorySheetRef = useRef<ActionSheetRef>(null);

    const [selectedCategoryDesc, setSelectedCategoryDesc] = useState<{ label: string; desc: string; icon: any; examples: { label: string; url: string }[] } | null>(null);

    const { id } = useLocalSearchParams();
    const campaignId = id as Id<"campaigns">;
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();

    const campaign = useQuery(api.campaigns.getCampaign, { campaignId });
    const topApps = useQuery(api.applications.getTopApplicationsByCampaign, { campaignId });
    const existingApplication = useQuery(api.applications.getApplicationByCampaignId, { campaignId });
    const createApplication = useMutation(api.applications.createApplication);
    const generateCampaignImageAccessUrl = useAction(api.campaigns.generateCampaignImageAccessUrl);

    const isLoading = campaign === undefined || topApps === undefined || existingApplication === undefined;

    const [isJoining, setIsJoining] = useState(false);
    const [createdApplicationId, setCreatedApplicationId] = useState<Id<"applications"> | null>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const hasExistingNonEarningApplication = !!existingApplication && existingApplication.status !== "earning";

    // Resolve cover photo
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!campaign) return;
        if (campaign.cover_photo_s3_key) {
            let cancelled = false;
            generateCampaignImageAccessUrl({ s3Key: campaign.cover_photo_s3_key })
                .then(url => { if (!cancelled) setCoverUrl(url || campaign.cover_photo_url || null); })
                .catch(() => { if (!cancelled) setCoverUrl(campaign.cover_photo_url || null); });
            return () => { cancelled = true; };
        } else {
            setCoverUrl(campaign.cover_photo_url || null);
        }
    }, [campaign?.cover_photo_s3_key, campaign?.cover_photo_url]);

    // Resolve campaign logo
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!campaign) return;
        if (campaign.logo_s3_key) {
            let cancelled = false;
            generateCampaignImageAccessUrl({ s3Key: campaign.logo_s3_key })
                .then(url => { if (!cancelled) setLogoUrl(url || campaign.logo_url || null); })
                .catch(() => { if (!cancelled) setLogoUrl(campaign.logo_url || null); });
            return () => { cancelled = true; };
        } else {
            setLogoUrl(campaign.logo_url || null);
        }
    }, [campaign?.logo_s3_key, campaign?.logo_url]);

    // Fade-in animations when images resolve
    const coverOpacity = useSharedValue(0);
    const logoOpacity = useSharedValue(0);
    const coverAnimStyle = useAnimatedStyle(() => ({ opacity: coverOpacity.value }));
    const logoAnimStyle = useAnimatedStyle(() => ({ opacity: logoOpacity.value }));

    useEffect(() => {
        if (coverUrl !== null) coverOpacity.value = withTiming(1, { duration: 500 });
    }, [coverUrl]);

    useEffect(() => {
        if (logoUrl !== null) logoOpacity.value = withTiming(1, { duration: 400 });
    }, [logoUrl]);

    // Logic for join flow
    const handleJoin = async () => {
        if (hasExistingNonEarningApplication && existingApplication) {
            router.push(`/application/${existingApplication._id}`);
            return;
        }

        setIsJoining(true);
        try {
            const applicationId = await createApplication({ campaignId });
            setCreatedApplicationId(applicationId);
            successSheetRef.current?.show();
        } catch (error) {
            console.error("Error joining campaign", error);
        } finally {
            setIsJoining(false);
        }
    };



    if (campaign === null) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <ThemedText>Campaign not found</ThemedText>
                <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <ThemedText style={{ color: 'blue' }}>Go Back</ThemedText>
                </Pressable>
            </View>
        );
    }

    const progress = campaign && campaign.total_budget > 0 ? campaign.budget_claimed / campaign.total_budget : 0;

    // Resolve the category configs for this campaign's categories
    const campaignCategoryConfigs = (campaign?.category || []).map(
        label => CAMPAIGN_CATEGORIES.find(c => c.label === label)
    ).filter(Boolean) as typeof CAMPAIGN_CATEGORIES;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header / Cover Image Area */}
            <View style={styles.coverContainer}>
                {(() => {
                    const coverIsLoading = campaign === undefined || (!!campaign?.cover_photo_s3_key && coverUrl === null);
                    if (coverIsLoading) {
                        return <SkeletonBlock style={[styles.coverImage, { borderRadius: 0 }]} />;
                    }
                    if (coverUrl) {
                        return (
                            <Animated.View style={[StyleSheet.absoluteFill, coverAnimStyle]}>
                                <Image source={{ uri: coverUrl }} style={styles.coverImage} resizeMode="cover" />
                            </Animated.View>
                        );
                    }
                    // No image available — neutral dark background
                    return <View style={[styles.coverImage, { backgroundColor: '#1F2937' }]} />;
                })()}

                {/* Header Buttons */}
                <View style={[styles.header, { top: insets.top + 10 }]}>
                    <Pressable style={styles.iconButton} onPress={() => router.back()}>
                        <ArrowLeft size={20} color="#000" />
                    </Pressable>
                    <Pressable style={styles.iconButton} onPress={() => setIsFavorite(!isFavorite)}>
                        <Heart size={20} color={isFavorite ? "#E11D48" : "#000"} fill={isFavorite ? "#E11D48" : "transparent"} />
                    </Pressable>
                </View>
            </View>

            {/* Content Sheet */}
            <View style={styles.sheetContainer}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Campaign Info Header */}
                    <View style={styles.campaignHeader}>
                        {!isLoading && campaign ? (
                            <>
                                <View style={styles.logoContainer}>
                                    {campaign.logo_s3_key && logoUrl === null ? (
                                        <SkeletonBlock style={styles.logoPlaceholder} />
                                    ) : logoUrl ? (
                                        <Animated.View style={logoAnimStyle}>
                                            <Image source={{ uri: logoUrl }} style={styles.logo} />
                                        </Animated.View>
                                    ) : (
                                        <View style={styles.logoPlaceholder}>
                                            <Building size={28} color="#9CA3AF" />
                                        </View>
                                    )}
                                </View>
                                <View style={styles.headerText}>
                                    <ThemedText style={styles.campaignName}>{campaign.name}</ThemedText>
                                    <ThemedText style={styles.companyName}>{campaign.business_name}</ThemedText>
                                </View>
                            </>
                        ) : (
                            <>
                                <SkeletonBlock style={{ width: 64, height: 64, borderRadius: 32 }} />
                                <View style={{ gap: 8 }}>
                                    <SkeletonBlock style={{ width: 200, height: 24, borderRadius: 4 }} />
                                    <SkeletonBlock style={{ width: 120, height: 16, borderRadius: 4 }} />
                                </View>
                            </>
                        )}
                    </View>

                    {/* Categories */}
                    {campaign && campaignCategoryConfigs.length > 0 && (
                        <View style={styles.categoryRow}>
                            {campaignCategoryConfigs.map((cat) => {
                                const Icon = cat.icon;
                                return (
                                    <Pressable
                                        key={cat.id}
                                        style={styles.categoryChip}
                                        onPress={() => {
                                            setSelectedCategoryDesc(cat);
                                            categorySheetRef.current?.show();
                                        }}
                                    >
                                        <Icon size={14} color="#374151" />
                                        <ThemedText style={styles.categoryChipText}>{cat.label}</ThemedText>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}

                    {/* Available Payouts */}
                    <View style={styles.section}>
                        {!isLoading && campaign ? (
                            <>
                                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Available Payouts</ThemedText>

                                <View style={styles.progressContainer}>
                                    <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                                </View>

                                <View style={styles.payoutStats}>
                                    <ThemedText style={styles.payoutText}>{formatCurrency(campaign.budget_claimed)} claimed</ThemedText>
                                    <ThemedText style={styles.payoutText}>{formatCurrency(campaign.total_budget)}</ThemedText>
                                </View>
                            </>
                        ) : (
                            <>
                                <SkeletonBlock style={{ width: 150, height: 20, marginBottom: 12, borderRadius: 4 }} />
                                <SkeletonBlock style={{ width: '100%', height: 6, marginBottom: 8, borderRadius: 3 }} />
                                <View style={styles.payoutStats}>
                                    <SkeletonBlock style={{ width: 100, height: 16, borderRadius: 4 }} />
                                    <SkeletonBlock style={{ width: 80, height: 16, borderRadius: 4 }} />
                                </View>
                            </>
                        )}
                    </View>

                    {/* Info Cards Grid */}
                    <View style={styles.cardsGrid}>
                        {!isLoading && campaign ? (
                            <>
                                <Pressable style={styles.infoCard} onPress={() => requirementsSheetRef.current?.show()}>
                                    <View style={styles.infoIconContainer}>
                                        <ThemedText style={styles.infoIconText}>N</ThemedText>
                                    </View>
                                    <View>
                                        <ThemedText style={styles.infoTitle}>Requirements</ThemedText>
                                        <ThemedText style={styles.infoSubtitle}>How do i participate?</ThemedText>
                                    </View>
                                </Pressable>

                                <Pressable style={styles.infoCard} onPress={() => payoutsSheetRef.current?.show()}>
                                    <View style={styles.infoIconContainer}>
                                        <ThemedText style={styles.infoIconText}>N</ThemedText>
                                    </View>
                                    <View>
                                        <ThemedText style={styles.infoTitle}>Payout Rates</ThemedText>
                                        <ThemedText style={styles.infoSubtitle}>How much do i get paid?</ThemedText>
                                    </View>
                                </Pressable>
                            </>
                        ) : (
                            <>
                                <View style={[styles.infoCard, { gap: 16 }]}>
                                    <SkeletonBlock style={{ width: 32, height: 32, borderRadius: 16 }} />
                                    <View style={{ gap: 8 }}>
                                        <SkeletonBlock style={{ width: 100, height: 20, borderRadius: 4 }} />
                                        <SkeletonBlock style={{ width: '80%', height: 16, borderRadius: 4 }} />
                                    </View>
                                </View>

                                <View style={[styles.infoCard, { gap: 16 }]}>
                                    <SkeletonBlock style={{ width: 32, height: 32, borderRadius: 16 }} />
                                    <View style={{ gap: 8 }}>
                                        <SkeletonBlock style={{ width: 100, height: 20, borderRadius: 4 }} />
                                        <SkeletonBlock style={{ width: '80%', height: 16, borderRadius: 4 }} />
                                    </View>
                                </View>
                            </>
                        )}
                    </View>

                    {/* Best Performing Creator */}
                    <View style={styles.section}>
                        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Best Performing Creator</ThemedText>
                        <View style={styles.creatorList}>
                            {!isLoading && topApps ? (
                                topApps.length > 0 ? (
                                    topApps.map((app) => (
                                        <CreatorListItem
                                            key={app.id}
                                            name={app.name}
                                            views={app.views}
                                            amount={app.amount}
                                            logoUrl={app.logoUrl}
                                            onPress={() => { }}
                                        />
                                    ))
                                ) : (
                                    <View style={styles.emptyStateContainer}>
                                        <LottieView
                                            source={require('@/assets/lotties/not-found.json')}
                                            autoPlay
                                            loop
                                            style={styles.lottie}
                                        />
                                        <ThemedText style={{ color: '#666', marginTop: 8 }}>
                                            No creators yet. Be the first!
                                        </ThemedText>
                                    </View>
                                )
                            ) : (
                                <>
                                    <SkeletonBlock style={{ width: '100%', height: 72, borderRadius: 12, marginBottom: 8 }} />
                                    <SkeletonBlock style={{ width: '100%', height: 72, borderRadius: 12, marginBottom: 8 }} />
                                    <SkeletonBlock style={{ width: '100%', height: 72, borderRadius: 12, marginBottom: 8 }} />
                                </>
                            )}
                        </View>
                    </View>
                    <ActionSheet gestureEnabled ref={requirementsSheetRef}>
                        <View style={styles.sheetContent}>
                            {/* Header */}
                            <View style={styles.sheetHeader}>
                                <ThemedText style={styles.sheetTitle}>Requirements</ThemedText>
                                <ThemedText style={styles.sheetSubtitle}>How does my post get approved?</ThemedText>
                            </View>

                            {/* Requirements List */}
                            <View style={styles.requirementsList}>
                                {campaign && campaign.requirements.map((req, index) => (
                                    <View key={index} style={styles.requirementItem}>
                                        <Check size={20} color="#000" strokeWidth={3} />
                                        <ThemedText style={styles.requirementText}>{req}</ThemedText>
                                    </View>
                                ))}
                            </View>

                            {/* Dismiss Button */}
                            <Pressable
                                style={[styles.joinButton, { marginTop: 32 }]}
                                onPress={() => requirementsSheetRef.current?.hide()}
                            >
                                <ThemedText style={styles.joinButtonText}>Dismiss</ThemedText>
                            </Pressable>
                        </View>
                    </ActionSheet>

                    <ActionSheet gestureEnabled ref={payoutsSheetRef}>
                        <View style={styles.sheetContent}>
                            {/* Header */}
                            <View style={styles.sheetHeader}>
                                <ThemedText style={styles.sheetTitle}>Payouts</ThemedText>
                                <ThemedText style={styles.sheetSubtitle}>How much do i get paid?</ThemedText>
                            </View>

                            {/* Payouts Table */}
                            <View style={styles.requirementsList}>
                                {/* Table Header */}
                                <View style={styles.payoutRow}>
                                    <ThemedText type="defaultSemiBold" style={[{ textAlign: 'left' }]}>Views</ThemedText>
                                    <ThemedText type="defaultSemiBold" style={[{ textAlign: 'right' }]}>Amount</ThemedText>
                                </View>

                                {/* Rows */}
                                {campaign && campaign.payout_thresholds.map((payout, index) => (
                                    <View key={index} style={styles.payoutRow}>
                                        <ThemedText style={[styles.payoutCell, { textAlign: 'left' }]}>{formatViews(payout.views)}</ThemedText>
                                        <ThemedText style={[styles.payoutCell, { textAlign: 'right' }]}>{formatCurrency(payout.payout)}</ThemedText>
                                    </View>
                                ))}

                                {/* Divider */}
                                <View style={styles.payoutDivider} />

                                {/* Max Payout */}
                                <View style={styles.payoutRow}>
                                    <ThemedText style={[styles.payoutCell, { textAlign: 'left' }]}>You can earn maximum</ThemedText>
                                    <ThemedText style={[styles.payoutCell, { textAlign: 'right' }]}>{campaign && formatCurrency(campaign.maximum_payout)}</ThemedText>
                                </View>
                            </View>

                            {/* Dismiss Button */}
                            <Pressable
                                style={[styles.joinButton, { marginTop: 32 }]}
                                onPress={() => payoutsSheetRef.current?.hide()}
                            >
                                <ThemedText style={styles.joinButtonText}>Dismiss</ThemedText>
                            </Pressable>
                        </View>
                    </ActionSheet>

                    {/* Category Description Sheet */}
                    <ActionSheet gestureEnabled ref={categorySheetRef}>
                        <View style={styles.sheetContent}>
                            <View style={styles.sheetHeader}>
                                <ThemedText style={styles.sheetTitle}>{selectedCategoryDesc?.label}</ThemedText>
                                <ThemedText style={[styles.sheetSubtitle, { textAlign: 'center' }]}>{selectedCategoryDesc?.desc}</ThemedText>
                            </View>

                            {/* Example Videos */}
                            {(selectedCategoryDesc?.examples?.length ?? 0) > 0 && (
                                <View style={styles.requirementsList}>
                                    {selectedCategoryDesc!.examples.map((ex, i) => (
                                        <Pressable
                                            key={i}
                                            style={styles.requirementItem}
                                            onPress={() => Linking.openURL(ex.url)}
                                        >
                                            <Video size={20} color="#000" strokeWidth={2} />
                                            <ThemedText style={[styles.requirementText, { flex: 1 }]} numberOfLines={1}>{ex.label}</ThemedText>
                                            <ArrowUpRight size={20} color="#9CA3AF" />
                                        </Pressable>
                                    ))}
                                </View>
                            )}

                            <Pressable
                                style={[styles.joinButton, { marginTop: 32 }]}
                                onPress={() => categorySheetRef.current?.hide()}
                            >
                                <ThemedText style={styles.joinButtonText}>Dismiss</ThemedText>
                            </Pressable>
                        </View>
                    </ActionSheet>

                    {/* Success Sheet */}
                    <ActionSheet ref={successSheetRef}
                        disableElevation={true}
                        gestureEnabled
                        indicatorStyle={{
                            display: 'none',
                        }}
                        containerStyle={{
                            paddingHorizontal: 24,
                            backgroundColor: 'transparent',
                            paddingBottom: 30,
                        }}
                    >
                        <View style={styles.sheetContent}>
                            <View style={styles.sheetHeader}>
                                <ThemedText style={styles.sheetTitle}>You're in!</ThemedText>
                                <ThemedText style={styles.sheetSubtitle}>Read the requirements and start filming!</ThemedText>
                            </View>

                            <View style={{ paddingHorizontal: 0, marginBottom: 24 }}>
                                <Timeline
                                    bottomLine={{ type: Timeline.lineTypes.DASHED, color: '#E0E0E0' }}
                                    point={{
                                        icon: Assets.internal.icons.checkSmall,
                                        state: Timeline.states.SUCCESS,
                                    }}
                                >
                                    <View style={{ backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16, marginBottom: 0 }}>
                                        <Text text70BO>Application Created</Text>
                                    </View>
                                </Timeline>
                                <Timeline
                                    topLine={{ type: Timeline.lineTypes.DASHED, color: '#E0E0E0' }}
                                    bottomLine={{ type: Timeline.lineTypes.DASHED, color: '#E0E0E0' }}
                                    point={{ type: Timeline.pointTypes.CIRCLE, color: '#E0E0E0' }}
                                >
                                    <View style={{ backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16 }}>
                                        <Text text70BO color="#666">Submit Video</Text>
                                    </View>
                                </Timeline>
                                <Timeline
                                    topLine={{ type: Timeline.lineTypes.DASHED, color: '#E0E0E0' }}
                                    bottomLine={{ type: Timeline.lineTypes.DASHED, color: '#E0E0E0' }}
                                    point={{ type: Timeline.pointTypes.CIRCLE, color: '#E0E0E0' }}
                                >
                                    <View style={{ backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16 }}>
                                        <Text text70BO color="#666">Business Approval</Text>
                                    </View>
                                </Timeline>
                                <Timeline
                                    topLine={{ type: Timeline.lineTypes.DASHED, color: '#E0E0E0' }}
                                    point={{ type: Timeline.pointTypes.CIRCLE, color: '#E0E0E0' }}
                                >
                                    <View style={{ backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16 }}>
                                        <Text text70BO color="#666">Post and Start Earning!</Text>
                                    </View>
                                </Timeline>
                            </View>

                            <Pressable
                                style={styles.joinButton}
                                onPress={() => {
                                    const targetApplicationId = createdApplicationId ?? existingApplication?._id;
                                    successSheetRef.current?.hide();
                                    if (targetApplicationId) {
                                        router.replace(`/application/${targetApplicationId}`);
                                    }
                                }}
                            >
                                <ThemedText style={styles.joinButtonText}>View Application</ThemedText>
                            </Pressable>

                            <Pressable
                                style={[styles.joinButton, { backgroundColor: 'transparent', marginTop: 8 }]}
                                onPress={() => successSheetRef.current?.hide()}
                            >
                                <ThemedText style={[styles.joinButtonText, { color: '#000' }]}>Dismiss</ThemedText>
                            </Pressable>
                        </View>
                    </ActionSheet>

                    {/* Bottom Padding for Footer */}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>

            {/* Sticky Footer */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <Pressable
                    style={[styles.joinButton, isJoining && styles.joinButtonDisabled]}
                    onPress={handleJoin}
                    disabled={isJoining || isLoading}
                >
                    {isJoining ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <ThemedText style={styles.joinButtonText}>
                            {hasExistingNonEarningApplication ? "View Application" : "Join"}
                        </ThemedText>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F0F0', // Light gray bg behind cover
    },
    coverContainer: {
        height: '30%',
        width: '100%',
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        position: 'absolute',
        width: '100%',
        zIndex: 10,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sheetContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        marginTop: -80,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    scrollContent: {
        paddingTop: 32,
        paddingHorizontal: 24,
    },
    campaignHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
    },
    logoContainer: {

    },
    logoPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#EEEEEE',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    logo: {
        width: 64,
        height: 64,
        borderRadius: 32,
        resizeMode: 'cover' as const,
    },
    headerText: {
        gap: 4,
    },
    campaignName: {
        fontSize: 20,
        fontFamily: 'GoogleSans_700Bold',
    },
    companyName: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
    },
    section: {
        marginBottom: 24,
    },
    categoryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    categoryChipText: {
        fontSize: 13,
        fontFamily: 'GoogleSans_500Medium',
        color: '#374151',
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
        marginBottom: 12,
    },
    progressContainer: {
        height: 6,
        backgroundColor: '#EEEEEE',
        borderRadius: 3,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#000000',
        borderRadius: 3,
    },
    payoutStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    payoutText: {
        fontSize: 14,
        fontFamily: 'GoogleSans_400Regular',
    },
    cardsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    infoCard: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
        padding: 16,
        gap: 24,
        minHeight: 140,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    infoIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoIconText: {
        color: '#D32F2F', // Netflix Red-ish
        fontWeight: 'bold',
        fontSize: 16,
    },
    infoTitle: {
        color: '#000000',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    infoSubtitle: {
        color: '#666666',
        fontSize: 12,
        fontFamily: 'GoogleSans_400Regular',
    },
    creatorList: {
        gap: 0,
    },
    sheetContent: {
        padding: 24,
        paddingTop: 24,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 24
    },
    sheetHeader: {
        alignItems: 'center',
        marginBottom: 24,
        gap: 4,
    },
    sheetTitle: {
        fontSize: 24,
        fontFamily: 'GoogleSans_700Bold',
        color: '#000000',
    },
    sheetSubtitle: {
        fontSize: 16,
        maxWidth: 300,
        fontFamily: 'GoogleSans_400Regular',
        color: '#666666',
    },
    requirementsList: {
        backgroundColor: '#F9F9F9',
        borderRadius: 16,
        padding: 24,
        gap: 24,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    requirementText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
        color: '#000000',
    },
    payoutRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    payoutCell: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'GoogleSans_400Regular',
    },
    payoutDivider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 12,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingTop: 16,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    joinButton: {
        backgroundColor: '#000000',
        borderRadius: 30,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    joinButtonDisabled: {
        opacity: 0.7,
    },
    joinButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },

    skeletonBlock: {
        backgroundColor: '#E0E0E0',
    },
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    lottie: {
        width: 150,
        height: 150,
    },
});
