import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Check, Copy, Play } from 'lucide-react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { TextInput, ActivityIndicator, Alert } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    SharedValue,
    SlideInRight,
    SlideOutLeft,
    FadeIn,
    withTiming,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ActionSheetRef } from "react-native-actions-sheet";
import ActionSheet from "react-native-actions-sheet";
import { Timeline, Text, Assets, Checkbox } from 'react-native-ui-lib';
import { ApplicationListItem, ApplicationStatus, getStatusStyle } from '@/components/ApplicationListItem';
import { CreatorListItem } from '@/components/CreatorListItem';
import { AccordionItem } from '@/components/AccordionItem';

// Reuse mock data structure for now
const mockCampaign = {
    id: '1',
    name: 'Campaign Name',
    company: 'by xxx company',
    logoLetter: 'a',
    status: 'Ready to Post' as ApplicationStatus,
    mySubmissions: [
        { id: '1', status: 'Under Review' as ApplicationStatus, date: '17/11/2025 5.46pm' },
        { id: '2', status: 'Changes Required' as ApplicationStatus, date: '17/11/2025 5.46pm' },
    ],
    requirements: [
        'No AI generated',
        'Submit for approval before posting',
        'Follow Script',
        'Use provided assets in video',
        'Speak Mandarin'
    ],
    payouts: [
        { views: '10k', amount: 'Rm 50' },
        { views: '500k', amount: 'Rm 50' },
        { views: '3M', amount: 'Rm 50' },
    ],
    maxPayout: 'Rm 2000',
    creators: [
        { id: '1', name: 'Creator name', views: '1.5M', amount: 'Rm 3,400' },
        { id: '2', name: 'Creator name', views: '1.5M', amount: 'Rm 3,400' },
        { id: '3', name: 'Creator name', views: '1.5M', amount: 'Rm 3,400' },
    ],
    // Optional Scripts
    scripts: [
        { title: 'Start of video', description: '2 things to change, 1 is the xxx has to be xxx. 2 is the xxx has to be xxx.' },
        { title: 'Product', description: '2 things to change, 1 is the xxx has to be xxx. 2 is the xxx has to be xxx.' },
        { title: 'End of video', description: '2 things to change, 1 is the xxx has to be xxx. 2 is the xxx has to be xxx.' },
    ],
    // Optional Assets Link
    assets: 'https://example.com/assets',
    // Post metrics (shown when status is 'Posted')
    postMetrics: {
        totalEarned: 'Rm 453',
        views: '1.2M',
        likes: '45.2K',
        comments: '2.3K',
        shares: '1.1K',
        avgWatchTime: '12s',
        engagementRate: '4.2%',
        topEarnerPercent: 5,
    },
};

export default function ApplicationDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();

    const scriptsSheetRef = useRef<ActionSheetRef>(null);
    const submissionSheetRef = useRef<ActionSheetRef>(null);
    const reviewSheetRef = useRef<ActionSheetRef>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [instagramLink, setInstagramLink] = useState('');
    const [tiktokLink, setTikTokLink] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isReviewed, setIsReviewed] = useState(false);

    // Video upload state - single sheet with steps
    const [selectedVideoUri, setSelectedVideoUri] = useState<string | null>(null);
    const [reviewStep, setReviewStep] = useState<'requirements' | 'preview' | 'uploading' | 'done'>('requirements');

    // Flip card animation
    const flipProgress = useSharedValue(0);

    // Video player for preview - autoplay
    const videoPlayer = useVideoPlayer(selectedVideoUri || '', player => {
        player.loop = true;
        player.play();
    });

    const handleSelectVideo = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission required', 'Please allow access to your media library.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["videos"],
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                setSelectedVideoUri(result.assets[0].uri);
                setReviewStep('preview');
            }
        } catch (error) {
            console.error('Error picking video:', error);
            Alert.alert('Error', 'Failed to open video picker');
        }
    };

    const handleUpload = async () => {
        if (!selectedVideoUri) return;

        videoPlayer.pause();
        setReviewStep('uploading');

        // Simulate upload with FormData
        // In production, you would:
        // const formData = new FormData();
        // formData.append('video', { uri: selectedVideoUri, name: 'video.mp4', type: 'video/mp4' });
        // await fetch('YOUR_API_ENDPOINT', { method: 'POST', body: formData });

        setTimeout(() => {
            setReviewStep('done');
        }, 2500);
    };

    const handleSubmit = () => {
        setError('');
        if (!instagramLink || !tiktokLink) {
            setError('Please provide both Instagram and TikTok post URLs.');
            return;
        }

        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            setShowSuccess(true);
        }, 1500);
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // Simulate refresh - normally would refetch data here
        setTimeout(() => {
            setRefreshing(false);
        }, 2000);
    }, []);

    // Accordion State
    const requirementsOpen = useSharedValue(false);
    const payoutsOpen = useSharedValue(false);

    const toggleRequirements = () => {
        requirementsOpen.value = !requirementsOpen.value;
    };

    const togglePayouts = () => {
        payoutsOpen.value = !payoutsOpen.value;
    };


    const Chevron = ({ progress }: { progress: SharedValue<boolean> }) => {
        const animatedStyle = useAnimatedStyle(() => ({
            transform: [{ rotate: `${progress.value ? 180 : 0}deg` }],
        }));
        return (
            <Animated.View style={animatedStyle}>
                <ChevronDown size={20} color="#000" />
            </Animated.View>
        );
    };

    // Flip card animation
    const toggleCardFlip = () => {
        flipProgress.value = withTiming(flipProgress.value === 0 ? 1 : 0, { duration: 400 });
    };

    const frontCardStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(flipProgress.value, [0, 1], [0, 180], Extrapolation.CLAMP);
        return {
            transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
            backfaceVisibility: 'hidden' as const,
        };
    });

    const backCardStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(flipProgress.value, [0, 1], [180, 360], Extrapolation.CLAMP);
        return {
            transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
            backfaceVisibility: 'hidden' as const,
        };
    });

    const statusStyle = getStatusStyle(mockCampaign.status);

    const getTimelineStep = (status: ApplicationStatus) => {
        switch (status) {
            case 'Pending Submission':
                return 1;
            case 'Under Review':
                return 2;
            case 'Changes Required':
                return 1;
            case 'Ready to Post':
                return 3;
            case 'Posted':
                return 4;
            default:
                return 1;
        }
    };
    const currentStep = getTimelineStep(mockCampaign.status);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={20} color="#000" />
                </Pressable>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Campaign Info */}
                <View style={styles.campaignInfo}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoPlaceholder}>
                            <ThemedText style={styles.logoText}>{mockCampaign.logoLetter}</ThemedText>
                        </View>
                    </View>
                    <View style={styles.campaignText}>
                        <ThemedText style={styles.campaignName}>{mockCampaign.name}</ThemedText>
                        <ThemedText style={styles.companyName}>{mockCampaign.company}</ThemedText>
                    </View>
                </View>

                {/* Flippable Earnings Card - only shown when Posted */}
                {mockCampaign.status === 'Posted' && mockCampaign.postMetrics && (
                    <Pressable onPress={toggleCardFlip} style={styles.flipCardContainer}>
                        {/* Front Side: Winner (White) */}
                        <Animated.View style={[styles.cardBase, styles.winnerCard, frontCardStyle]}>
                            <LottieView
                                source={require('../../assets/lotties/wallet.json')}
                                autoPlay
                                loop
                                style={styles.walletAnimation}
                            />
                            <ThemedText style={styles.earningsText}>
                                Your post has made <ThemedText style={styles.earningsHighlight}>{mockCampaign.postMetrics.totalEarned}</ThemedText>
                            </ThemedText>
                        </Animated.View>

                        {/* Back Side: Earnings (Dark) */}
                        <Animated.View style={[styles.cardBase, styles.earningsCard, backCardStyle]}>
                            <LottieView
                                source={require('../../assets/lotties/winner.json')}
                                autoPlay
                                style={styles.winnerAnimation}
                            />
                            <ThemedText style={styles.topEarnerText}>
                                You are the top <ThemedText style={styles.topEarnerHighlight}>{mockCampaign.postMetrics.topEarnerPercent}%</ThemedText> earners!
                            </ThemedText>
                        </Animated.View>
                    </Pressable>
                )}

                <View style={styles.timelineSection}>
                    <View style={styles.sectionHeaderRow}>
                        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Application Status</ThemedText>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border, transform: [{ translateY: -4 }] }]}>
                            <ThemedText style={[styles.statusText, { color: statusStyle.text }]}>{mockCampaign.status}</ThemedText>
                        </View>
                    </View>

                    {/* Step 1: Application Created - Always Success */}
                    <Timeline
                        bottomLine={{
                            type: Timeline.lineTypes.DASHED,
                            color: currentStep >= 1 ? Colors[colorScheme ?? 'light'].tint : '#E0E0E0'
                        }}
                        point={{
                            icon: Assets.internal.icons.checkSmall,
                            state: Timeline.states.SUCCESS,
                        }}
                    >
                        <View style={styles.timelineItem}>
                            <Text text70BO>Application Created</Text>
                        </View>
                    </Timeline>

                    {/* Step 2: Submit Video */}
                    <Timeline
                        topLine={{
                            type: Timeline.lineTypes.DASHED,
                            color: currentStep >= 1 ? Colors[colorScheme ?? 'light'].tint : '#E0E0E0'
                        }}
                        bottomLine={{
                            type: Timeline.lineTypes.DASHED,
                            color: currentStep >= 2 ? Colors[colorScheme ?? 'light'].tint : '#E0E0E0'
                        }}
                        point={
                            currentStep > 1
                                ? { icon: Assets.internal.icons.checkSmall, state: Timeline.states.SUCCESS }
                                : currentStep === 1
                                    ? { type: Timeline.pointTypes.OUTLINE, color: '#FFB300' } // Amber/Orange for current
                                    : { type: Timeline.pointTypes.CIRCLE, color: '#E0E0E0' }
                        }
                    >
                        <View style={styles.timelineItem}>
                            <Text text70BO color={currentStep >= 1 ? '#000' : '#666'}>Submit Video</Text>
                        </View>
                    </Timeline>

                    {/* Step 3: Business Approval */}
                    <Timeline
                        topLine={{
                            type: Timeline.lineTypes.DASHED,
                            color: currentStep >= 2 ? Colors[colorScheme ?? 'light'].tint : '#E0E0E0'
                        }}
                        bottomLine={{
                            type: Timeline.lineTypes.DASHED,
                            color: currentStep >= 3 ? Colors[colorScheme ?? 'light'].tint : '#E0E0E0'
                        }}
                        point={
                            currentStep > 2
                                ? { icon: Assets.internal.icons.checkSmall, state: Timeline.states.SUCCESS }
                                : currentStep === 2
                                    ? { type: Timeline.pointTypes.OUTLINE, color: '#FFB300' }
                                    : { type: Timeline.pointTypes.CIRCLE, color: '#E0E0E0' }
                        }
                    >
                        <View style={styles.timelineItem}>
                            <Text text70BO color={currentStep >= 2 ? '#000' : '#666'}>Business Approval</Text>
                        </View>
                    </Timeline>

                    {/* Step 4: Post and Start Earning */}
                    <Timeline
                        topLine={{
                            type: Timeline.lineTypes.DASHED,
                            color: currentStep >= 3 ? Colors[colorScheme ?? 'light'].tint : '#E0E0E0'
                        }}
                        point={
                            currentStep >= 4
                                ? { icon: Assets.internal.icons.checkSmall, state: Timeline.states.SUCCESS }
                                : currentStep === 3
                                    ? { type: Timeline.pointTypes.OUTLINE, color: '#FFB300' }
                                    : { type: Timeline.pointTypes.CIRCLE, color: '#E0E0E0' }
                        }
                    >
                        <View style={styles.timelineItem}>
                            <Text text70BO color={currentStep >= 3 ? '#000' : '#666'}>Post and Start Earning!</Text>
                        </View>
                    </Timeline>
                </View>

                <View style={styles.divider} />

                {/* My Submissions */}
                <View style={styles.section}>
                    <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { marginBottom: 24 }]}>My submissions</ThemedText>
                    <View style={styles.submissionsList}>
                        {mockCampaign.mySubmissions.map((sub, index) => (
                            <ApplicationListItem
                                key={sub.id}
                                campaignName={sub.date}
                                status={sub.status}
                                onPress={() => router.push(`/submission/${sub.id}`)}
                            />
                        ))}
                    </View>
                </View>

                <View style={[styles.divider]} />

                {/* Requirements Accordion */}
                <View style={styles.accordionSection}>
                    <Pressable style={styles.accordionHeader} onPress={toggleRequirements}>
                        <View>
                            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Requirements</ThemedText>
                            <ThemedText style={styles.accordionSubtitle}>How does my post get approved?</ThemedText>
                        </View>
                        <Chevron progress={requirementsOpen} />
                    </Pressable>
                    <AccordionItem isExpanded={requirementsOpen}>
                        <View style={styles.requirementsList}>
                            {mockCampaign.requirements.map((req, index) => (
                                <View key={index} style={styles.requirementItem}>
                                    <Check size={20} color="#000" strokeWidth={3} />
                                    <ThemedText style={styles.requirementText}>{req}</ThemedText>
                                </View>
                            ))}
                        </View>

                        {/* Scripts & Assets Cards */}
                        {(mockCampaign.scripts || mockCampaign.assets) && (
                            <View style={styles.cardsGrid}>
                                {mockCampaign.scripts && (
                                    <Pressable style={styles.infoCard} onPress={() => scriptsSheetRef.current?.show()}>
                                        <View style={styles.infoIconContainer}>
                                            <ThemedText style={styles.infoIconText}>S</ThemedText>
                                        </View>
                                        <View>
                                            <ThemedText style={styles.infoTitle}>Scripts</ThemedText>
                                            <ThemedText style={styles.infoSubtitle}>Things to say in video</ThemedText>
                                        </View>
                                    </Pressable>
                                )}

                                {mockCampaign.assets && (
                                    <Pressable style={styles.infoCard} onPress={() => { }}>
                                        <View style={styles.infoIconContainer}>
                                            <ThemedText style={styles.infoIconText}>A</ThemedText>
                                        </View>
                                        <View>
                                            <ThemedText style={styles.infoTitle}>Assets</ThemedText>
                                            <ThemedText style={styles.infoSubtitle}>Things to show in video</ThemedText>
                                        </View>
                                    </Pressable>
                                )}
                            </View>
                        )}
                    </AccordionItem>
                </View>

                <View style={styles.divider} />

                {/* Payouts Accordion (simulating the design request to put payouts essentially as another section if needed, or just reusing pattern) */}
                {/* User said "insert payout under requirements as well. Ensure them follow the similar design like the payout in campaign detail" */}
                {/* I'll add Payouts as an accordion too for consistency */}
                <View style={styles.accordionSection}>
                    <Pressable style={styles.accordionHeader} onPress={togglePayouts}>
                        <View>
                            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Payouts</ThemedText>
                            <ThemedText style={styles.accordionSubtitle}>How much do i get paid?</ThemedText>
                        </View>
                        <Chevron progress={payoutsOpen} />
                    </Pressable>
                    <AccordionItem isExpanded={payoutsOpen}>
                        <View style={styles.payoutsList}>
                            <View style={styles.payoutRow}>
                                <ThemedText type="defaultSemiBold" style={{ textAlign: 'left' }}>Views</ThemedText>
                                <ThemedText type="defaultSemiBold" style={{ textAlign: 'right' }}>Amount</ThemedText>
                            </View>
                            {mockCampaign.payouts.map((payout, index) => (
                                <View key={index} style={styles.payoutRow}>
                                    <ThemedText style={styles.payoutCell}>{payout.views}</ThemedText>
                                    <ThemedText style={[styles.payoutCell, { textAlign: 'right' }]}>{payout.amount}</ThemedText>
                                </View>
                            ))}
                            <View style={styles.payoutDivider} />
                            <View style={styles.payoutRow}>
                                <ThemedText style={styles.payoutCell}>You can earn maximum</ThemedText>
                                <ThemedText style={[styles.payoutCell, { textAlign: 'right' }]}>{mockCampaign.maxPayout}</ThemedText>
                            </View>
                        </View>
                    </AccordionItem>
                </View>

                <View style={styles.divider} />

                {/* Inspirations */}
                <View style={styles.section}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Inspirations</ThemedText>
                    <ThemedText style={styles.sectionSubtitle}>Learn from how others get more views</ThemedText>

                    <View style={styles.creatorList}>
                        {mockCampaign.creators.map((creator) => (
                            <CreatorListItem
                                key={creator.id}
                                name={creator.name}
                                views={creator.views}
                                amount={creator.amount}
                            />
                        ))}
                    </View>
                </View>

                {/* Scripts Action Sheet */}
                <ActionSheet gestureEnabled ref={scriptsSheetRef}>
                    <View style={styles.sheetContent}>
                        {/* Title Header */}
                        <View style={styles.sheetHeader}>
                            <ThemedText style={styles.sheetTitle}>Scripts</ThemedText>
                            <ThemedText style={styles.sheetSubtitle}>These line must appear in the video</ThemedText>
                        </View>

                        {/* Script Sections */}
                        <View style={{ gap: 24, marginBottom: 32 }}>
                            {mockCampaign.scripts?.map((script, index) => (
                                <View key={index}>
                                    <ThemedText type="defaultSemiBold" style={{ marginBottom: 8, fontSize: 16 }}>{script.title}</ThemedText>
                                    <View style={styles.scriptBox}>
                                        <ThemedText style={styles.scriptText}>{script.description}</ThemedText>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Dismiss Button */}
                        <Pressable
                            style={styles.actionButton}
                            onPress={() => scriptsSheetRef.current?.hide()}
                        >
                            <ThemedText style={styles.actionButtonText}>Dismiss</ThemedText>
                        </Pressable>
                    </View>
                </ActionSheet>

                {/* Submission Sheet */}
                <ActionSheet gestureEnabled ref={submissionSheetRef}>
                    <View style={styles.sheetContent}>
                        {!showSuccess ? (
                            <Animated.View exiting={SlideOutLeft}>
                                <View style={styles.sheetHeader}>
                                    <ThemedText style={styles.sheetTitle}>Congratulations!</ThemedText>
                                    <ThemedText style={styles.sheetSubtitle}>you are 2 steps away from earning!</ThemedText>
                                </View>

                                {/* 1. Tracking tag */}
                                <View style={styles.inputSection}>
                                    <ThemedText type="defaultSemiBold" style={styles.inputLabel}>1. Tracking tag</ThemedText>
                                    <ThemedText style={styles.inputDescription}>Paste this tracking tag to your post description for ownership.</ThemedText>
                                    <View style={styles.tagContainer}>
                                        <ThemedText style={styles.tagText}>#youniq2222</ThemedText>
                                        <Pressable hitSlop={10} onPress={() => console.log('Copied')}>
                                            <Copy size={20} color="#000" />
                                        </Pressable>
                                    </View>
                                </View>

                                {/* 2. Post url */}
                                <View style={styles.inputSection}>
                                    <ThemedText type="defaultSemiBold" style={styles.inputLabel}>2. Post url</ThemedText>
                                    <ThemedText style={styles.inputDescription}>
                                        Paste the post url here. YOU <ThemedText type="defaultSemiBold">CANNOT</ThemedText> EDIT AFTER THIS.
                                    </ThemedText>

                                    {/* Instagram */}
                                    <View style={styles.urlInputContainer}>
                                        <FontAwesome5 name="instagram" size={24} color="#000" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.urlInput}
                                            placeholder="https://www.instagram.com/..."
                                            placeholderTextColor="#999"
                                            value={instagramLink}
                                            onChangeText={(text) => {
                                                setInstagramLink(text);
                                                setError('');
                                            }}
                                            autoCapitalize="none"
                                        />
                                    </View>

                                    {/* TikTok */}
                                    <View style={styles.urlInputContainer}>
                                        <FontAwesome5 name="tiktok" size={24} color="#000" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.urlInput}
                                            placeholder="https://www.tiktok.com/..."
                                            placeholderTextColor="#999"
                                            value={tiktokLink}
                                            onChangeText={(text) => {
                                                setTikTokLink(text);
                                                setError('');
                                            }}
                                            autoCapitalize="none"
                                        />
                                    </View>

                                    {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
                                </View>

                                <Pressable
                                    style={[styles.actionButton, { marginTop: 8 }]}
                                    onPress={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <ThemedText style={styles.actionButtonText}>Submit</ThemedText>
                                    )}
                                </Pressable>
                            </Animated.View>
                        ) : (
                            <Animated.View entering={SlideInRight} style={styles.successContent}>
                                <LottieView
                                    source={require('../../assets/lotties/success.json')}
                                    autoPlay
                                    loop={false}
                                    style={{ width: 120, height: 120, marginBottom: 16 }}
                                />
                                <ThemedText style={styles.successTitle}>You're earning for this post!</ThemedText>
                                <ThemedText style={styles.successSubtitle}>and your analytics will update on a daily basis</ThemedText>

                                <Pressable
                                    style={[styles.actionButton, { marginTop: 32, width: '100%' }]}
                                    onPress={() => submissionSheetRef.current?.hide()}
                                >
                                    <ThemedText style={styles.actionButtonText}>Done</ThemedText>
                                </Pressable>
                            </Animated.View>
                        )}
                    </View>
                </ActionSheet>

                {/* Review & Upload Sheet */}
                <ActionSheet gestureEnabled ref={reviewSheetRef}>
                    <View style={styles.sheetContent}>
                        {/* Requirements Step */}
                        {reviewStep === 'requirements' && (
                            <Animated.View exiting={SlideOutLeft}>
                                <View style={styles.sheetHeader}>
                                    <ThemedText style={styles.sheetTitle}>Review Requirements</ThemedText>
                                    <ThemedText style={styles.sheetSubtitle}>Ensure you meet all criteria before uploading</ThemedText>
                                </View>

                                <View style={styles.requirementsList}>
                                    {mockCampaign.requirements.map((req, index) => (
                                        <View key={index} style={styles.requirementItem}>
                                            <Check size={20} color="#000" strokeWidth={3} />
                                            <ThemedText style={styles.requirementText}>{req}</ThemedText>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.checkboxContainer}>
                                    <Checkbox
                                        value={isReviewed}
                                        onValueChange={setIsReviewed}
                                        color={Colors[colorScheme ?? 'light'].tint}
                                        label="I have reviewed the requirements and am ready to submit for review."
                                        labelStyle={styles.checkboxLabel}
                                    />
                                </View>

                                <Pressable
                                    style={[
                                        styles.actionButton,
                                        { marginTop: 24, opacity: isReviewed ? 1 : 0.5 }
                                    ]}
                                    onPress={handleSelectVideo}
                                    disabled={!isReviewed}
                                >
                                    <ThemedText style={styles.actionButtonText}>Select Video</ThemedText>
                                </Pressable>
                            </Animated.View>
                        )}

                        {/* Preview Step */}
                        {reviewStep === 'preview' && (
                            <Animated.View entering={SlideInRight} exiting={SlideOutLeft}>
                                <View style={styles.sheetHeader}>
                                    <ThemedText style={styles.sheetTitle}>Review Video</ThemedText>
                                    <ThemedText style={styles.sheetSubtitle}>Preview your video before uploading</ThemedText>
                                </View>

                                {selectedVideoUri && (
                                    <View style={styles.videoPreviewContainer}>
                                        <VideoView
                                            player={videoPlayer}
                                            style={styles.videoPreview}
                                            contentFit="cover"
                                            nativeControls
                                        />
                                    </View>
                                )}

                                <Pressable
                                    style={[styles.actionButton, { marginTop: 8 }]}
                                    onPress={handleUpload}
                                >
                                    <ThemedText style={styles.actionButtonText}>Upload</ThemedText>
                                </Pressable>
                            </Animated.View>
                        )}

                        {/* Uploading Step */}
                        {reviewStep === 'uploading' && (
                            <Animated.View entering={SlideInRight} style={styles.successContent}>
                                <LottieView
                                    source={require('../../assets/lotties/uploading.json')}
                                    autoPlay
                                    loop
                                    style={{
                                        width: 140, height: 140, marginBottom: 16, transform: [{ scale: 2.5 }],
                                    }}
                                />
                                <ThemedText style={styles.successTitle}>Uploading...</ThemedText>
                                <ThemedText style={styles.successSubtitle}>Please wait while we upload your video</ThemedText>
                            </Animated.View>
                        )}

                        {/* Done Step */}
                        {reviewStep === 'done' && (
                            <Animated.View entering={FadeIn} style={styles.successContent}>
                                <LottieView
                                    source={require('../../assets/lotties/success.json')}
                                    autoPlay
                                    loop={false}
                                    style={{ width: 120, height: 120, marginBottom: 16 }}
                                />
                                <ThemedText style={styles.successTitle}>Video Uploaded!</ThemedText>
                                <ThemedText style={styles.successSubtitle}>Your submission is now under review</ThemedText>

                                <Pressable
                                    style={[styles.actionButton, { marginTop: 32, width: '100%' }]}
                                    onPress={() => {
                                        reviewSheetRef.current?.hide();
                                        setSelectedVideoUri(null);
                                        setReviewStep('requirements');
                                        setIsReviewed(false);
                                    }}
                                >
                                    <ThemedText style={styles.actionButtonText}>Done</ThemedText>
                                </Pressable>
                            </Animated.View>
                        )}
                    </View>
                </ActionSheet>


            </ScrollView>

            {mockCampaign.status !== 'Posted' && (
                <View style={[styles.footer, { paddingBottom: 30 }]}>
                    <Pressable
                        style={[
                            styles.actionButton,
                            mockCampaign.status === 'Under Review' && { backgroundColor: '#E0E0E0', opacity: 1 }
                        ]}
                        disabled={mockCampaign.status === 'Under Review'}
                        onPress={() => {
                            if (mockCampaign.status === 'Ready to Post') {
                                setShowSuccess(false);
                                setInstagramLink('');
                                setTikTokLink('');
                                setError('');
                                submissionSheetRef.current?.show();
                            } else {
                                setIsReviewed(false);
                                setReviewStep('requirements');
                                reviewSheetRef.current?.show();
                            }
                        }}
                    >
                        <ThemedText style={[
                            styles.actionButtonText,
                            mockCampaign.status === 'Under Review' && { color: '#666' }
                        ]}>
                            {mockCampaign.status === 'Ready to Post'
                                ? 'Start Earning'
                                : mockCampaign.status === 'Under Review'
                                    ? 'Under Review'
                                    : 'Review & Upload'}
                        </ThemedText>
                    </Pressable>
                </View>
            )}
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 0,
        height: 48,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    campaignInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    logoContainer: {
        marginRight: 16,
    },
    logoPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    logoText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
    },
    campaignText: {
        flex: 1,
    },
    campaignName: {
        fontSize: 20,
        fontFamily: 'GoogleSans_700Bold',
        marginBottom: 4,
    },
    companyName: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'GoogleSans_700Bold',
    },
    section: {
        // marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
        marginBottom: 2,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
        marginBottom: 16,
    },
    submissionsList: {
        gap: 24,
    },
    divider: {
        height: 1,
        backgroundColor: '#EEEEEE',
        marginVertical: 24,
    },
    accordionSection: {
        // marginBottom: 24,
    },
    accordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    accordionSubtitle: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
    },
    requirementsList: {
        marginTop: 8,
        padding: 16,
        gap: 16,
        backgroundColor: '#F9F9F9',
        borderRadius: 16,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    requirementText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
        color: '#000',
    },
    payoutsList: {
        marginTop: 8,
        padding: 16,
        gap: 12,
        backgroundColor: '#F9F9F9',
        borderRadius: 16,
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
        marginVertical: 4,
    },
    creatorList: {
        gap: 0,
        paddingBottom: 24,
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
    timelineSection: {
        width: '100%',
    },
    sectionHeader: {
        width: '100%',
        paddingHorizontal: 8,
    },
    sectionHeaderRow: {
        width: '100%',
        paddingHorizontal: 8,
        flexDirection: 'row',
        // justifyContent: 'space-between',
        gap: 16,
        alignItems: 'center',
        marginBottom: 8,
    },
    timelineItem: {
        padding: 16,
        backgroundColor: '#F9F9F9',
        borderRadius: 16,
        marginBottom: 0, // Timeline component handles spacing
    },
    actionButton: {
        backgroundColor: '#000000',
        borderRadius: 30,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    cardsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
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
        color: '#D32F2F',
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
    sheetContent: {
        padding: 24,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    sheetHeader: {
        alignItems: 'center',
        marginBottom: 32,
    },
    sheetTitle: {
        fontSize: 24,
        fontFamily: 'GoogleSans_700Bold',
        color: '#000000',
    },
    sheetSubtitle: {
        fontSize: 14,
        fontFamily: 'GoogleSans_400Regular',
        color: '#666666',
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scriptBox: {
        backgroundColor: '#F9F9F9',
        padding: 16,
        borderRadius: 12,
    },
    scriptText: {
        fontFamily: 'GoogleSans_400Regular',
        fontSize: 14,
        color: '#000',
        lineHeight: 20,
    },
    inputSection: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 16,
        marginBottom: 8,
    },
    inputDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
        fontFamily: 'GoogleSans_400Regular',
    },
    tagContainer: {
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tagText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
        color: '#000',
    },
    urlInputContainer: {
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        height: 56,
    },
    inputIcon: {
        marginRight: 16,
        width: 24,
        textAlign: 'center',
    },
    urlInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
        color: '#000',
        height: '100%',
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 12,
        fontFamily: 'GoogleSans_400Regular',
        marginTop: -4,
        marginBottom: 8,
    },
    successContent: {
        alignItems: 'center',
        // paddingVertical: 32,
    },
    successTitle: {
        fontSize: 24,
        fontFamily: 'GoogleSans_700Bold',
        color: '#000',
        textAlign: 'center',
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 14,
        fontFamily: 'GoogleSans_400Regular',
        color: '#666',
        textAlign: 'center',
    },
    checkboxContainer: {
        marginTop: 24,
        // paddingHorizontal: 4,
    },
    checkboxLabel: {
        fontSize: 14,
        fontFamily: 'GoogleSans_400Regular',
        color: '#000',
        marginLeft: 12,
        lineHeight: 20,
        flex: 1, // Ensure label wraps if needed
    },
    videoPreviewContainer: {
        width: '60%',
        aspectRatio: 9 / 16,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
        backgroundColor: '#000',
        alignSelf: 'center',
    },
    videoPreview: {
        width: '100%',
        height: '100%',
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
    },
    playButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 4,
    },
    // Flippable Earnings Card Styles
    flipCardContainer: {
        marginBottom: 24,
        height: 240,
    },
    cardBase: {
        height: 240,
        borderRadius: 20,
        padding: 24,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        backfaceVisibility: 'hidden',
    },
    winnerCard: {
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    earningsCard: {
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    winnerAnimation: {
        width: 120,
        height: 120,
        transform: [{ scale: 1.5 }],
    },
    walletAnimation: {
        width: 120,
        height: 120,
        transform: [{ scale: 1.3 }],
    },
    topEarnerText: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
        textAlign: 'center',
        color: '#FFF',
    },
    topEarnerHighlight: {
        color: '#FFD700', // Gold color
        fontSize: 22,
    },
    earningsText: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
        textAlign: 'center',
        color: '#FFF',
    },
    earningsHighlight: {
        color: '#4CAF50', // Green for earnings? Or Gold? I'll stick to a nice Green or mimic Gold. User didn't specify. I'll use Gold for consistency or Green. Typical pattern: Money = Green.
        // Actually, user said "same thing like front". Front uses Gold. I'll use Green #4CAF50 to differentiate "Earned" from "Winner".
        fontSize: 22,
    },
});
