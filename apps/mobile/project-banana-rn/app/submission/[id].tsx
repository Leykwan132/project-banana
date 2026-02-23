import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Building } from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAction, useQuery } from 'convex/react';
import LottieView from 'lottie-react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ApplicationStatus, ApplicationStatusBadge } from '@/components/ApplicationStatusBadge';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { Id } from '../../../../../packages/backend/convex/_generated/dataModel';

const mapSubmissionStatus = (status?: string): ApplicationStatus => {
    switch (status) {
        case "pending_review":
        case "reviewing":
            return "Under Review";
        case "changes_requested":
            return "Changes Required";
        case "ready_to_post":
            return "Ready to Post";
        case "earning":
            return "Posted";
        default:
            return "Pending Submission";
    }
};

const timeAgo = (timestamp?: number) => {
    if (!timestamp) return '';
    const diffInSeconds = Math.floor((Date.now() - timestamp) / 1000);

    if (diffInSeconds < 60) return `Just now`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} mo. ago`;
    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears}y ago`;
};

export default function SubmissionDetailScreen() {
    const { id } = useLocalSearchParams(); // submission id
    const submissionId = id as Id<"submissions">;
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const submission = useQuery(api.submissions.getSubmission, { submissionId });
    const latestFeedback = useQuery(api.submissions.getLatestSubmissionFeedback, { submissionId });
    const generateVideoAccessUrl = useAction(api.submissions.generateVideoAccessUrl);
    const generateCampaignImageAccessUrl = useAction(api.campaigns.generateCampaignImageAccessUrl);

    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loadingUrl, setLoadingUrl] = useState(false);
    const [finalLogoUrl, setFinalLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!latestFeedback) return;
        const s3Key = latestFeedback.authorLogoS3Key;
        const directUrl = latestFeedback.authorLogoUrl ?? null;

        if (!s3Key) {
            setFinalLogoUrl(directUrl);
            return;
        }

        let cancelled = false;
        generateCampaignImageAccessUrl({ s3Key })
            .then((url) => { if (!cancelled) setFinalLogoUrl(url || directUrl); })
            .catch(() => { if (!cancelled) setFinalLogoUrl(directUrl); });

        return () => { cancelled = true; };
    }, [latestFeedback?.authorLogoS3Key, latestFeedback?.authorLogoUrl]);

    useEffect(() => {
        let isMounted = true;

        const loadVideoUrl = async () => {
            if (!submission) return;
            if (submission.s3_key) {
                setLoadingUrl(true);
                try {
                    const signedUrl = await generateVideoAccessUrl({ submissionId });
                    if (isMounted) setVideoUrl(signedUrl);
                } catch (error) {
                    console.error("Failed to generate video access URL:", error);
                    if (isMounted) setVideoUrl(submission.video_url ?? null);
                } finally {
                    if (isMounted) setLoadingUrl(false);
                }
                return;
            }
            setVideoUrl(submission.video_url ?? null);
        };

        void loadVideoUrl();

        return () => {
            isMounted = false;
        };
    }, [submission?._id, submission?.s3_key, submission?.video_url, submissionId]);

    const videoPlayer = useVideoPlayer(videoUrl ?? "", (player) => {
        player.loop = false;
        player.muted = true;
    });

    const skeletonOpacity = useSharedValue(0.3);

    useEffect(() => {
        skeletonOpacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 800 }),
                withTiming(0.3, { duration: 800 })
            ),
            -1,
            true
        );
    }, []);

    const skeletonAnimatedStyle = useAnimatedStyle(() => ({
        opacity: skeletonOpacity.value,
    }));

    if (submission === null) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <ThemedText>Submission not found</ThemedText>
                <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <ThemedText style={{ color: 'blue' }}>Go Back</ThemedText>
                </Pressable>
            </View>
        );
    }

    const submittedDate = submission?.created_at
        ? new Date(submission.created_at).toLocaleString("en-MY", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        })
        : "-";

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Video Preview */}
                <View style={styles.videoContainer}>
                    {submission === undefined || loadingUrl ? (
                        <Animated.View style={[styles.videoSkeleton, skeletonAnimatedStyle]} />
                    ) : videoUrl ? (
                        <VideoView
                            player={videoPlayer}
                            style={styles.video}
                            contentFit="cover"
                            nativeControls
                        />
                    ) : (
                        <View style={styles.videoLoadingContainer}>
                            <ThemedText style={{ color: "#FFF" }}>No video available</ThemedText>
                        </View>
                    )}
                </View>

                {/* Date */}
                <ThemedText style={styles.dateText}>Submitted on {submittedDate}</ThemedText>

                {/* Feedback */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Feedback</ThemedText>
                        <ApplicationStatusBadge
                            status={mapSubmissionStatus(submission?.status)}
                        />
                    </View>
                    {latestFeedback === undefined ? (
                        <View style={styles.feedbackBox}>
                            <Animated.View style={[{ height: 16, backgroundColor: '#E5E5E5', borderRadius: 8, marginBottom: 8, width: '100%' }, skeletonAnimatedStyle]} />
                            <Animated.View style={[{ height: 16, backgroundColor: '#E5E5E5', borderRadius: 8, marginBottom: 8, width: '80%' }, skeletonAnimatedStyle]} />
                            <Animated.View style={[{ height: 16, backgroundColor: '#E5E5E5', borderRadius: 8, marginBottom: 0, width: '60%' }, skeletonAnimatedStyle]} />
                        </View>
                    ) : latestFeedback ? (
                        <View style={styles.feedbackBox}>
                            <View style={styles.commentContainer}>
                                <View style={styles.commentAvatar}>
                                    {finalLogoUrl ? (
                                        <Image source={{ uri: finalLogoUrl }} style={styles.commentAvatarImage} />
                                    ) : (
                                        <Building size={16} color="#A0A0A0" />
                                    )}
                                </View>
                                <View style={styles.commentContent}>
                                    <ThemedText style={styles.commentAuthor}>
                                        {latestFeedback.authorName}
                                        <ThemedText style={styles.commentTime}>  {timeAgo(latestFeedback.createdAt)}</ThemedText>
                                    </ThemedText>
                                    <ThemedText style={styles.feedbackText}>{latestFeedback.text}</ThemedText>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.emptyStateContainer}>
                            <LottieView
                                source={require('@/assets/lotties/not-found.json')}
                                autoPlay
                                loop
                                style={styles.lottie}
                            />
                            <ThemedText style={{ color: '#666', marginTop: 8 }}>
                                No feedback given yet
                            </ThemedText>
                        </View>
                    )}
                </View>

                {/* Content ending */}

            </ScrollView>
        </View>
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
    content: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 40,
    },
    videoContainer: {
        width: '60%',
        aspectRatio: 9 / 16,
        alignSelf: 'center',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        backgroundColor: '#000',
        position: 'relative',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    videoLoadingContainer: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoSkeleton: {
        width: '100%',
        height: '100%',
        backgroundColor: '#2a2a2a',
    },
    videoStatusBadgeContainer: {
        position: 'absolute',
        top: 12,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    videoStatusBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    videoStatusText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'GoogleSans_700Bold',
    },
    dateText: {
        textAlign: 'center',
        color: '#666666',
        fontSize: 14,
        fontFamily: 'GoogleSans_400Regular',
        marginBottom: 32,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
        color: '#000',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    feedbackBox: {
        padding: 0,
    },
    commentContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        overflow: 'hidden',
    },
    commentAvatarImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    commentContent: {
        flex: 1,
        marginTop: -2, // pull name slightly up to better align with circular avatar top
    },
    commentAuthor: {
        color: '#111111',
        fontSize: 15,
        fontFamily: 'GoogleSans_700Bold',
        marginBottom: 2, // very tight gap between name and text
    },
    commentTime: {
        color: '#999999',
        fontSize: 13,
        fontFamily: 'GoogleSans_400Regular',
    },
    feedbackText: {
        fontSize: 14,
        lineHeight: 20,
        fontFamily: 'GoogleSans_400Regular',
        color: '#111111',
    },
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    lottie: {
        width: 120,
        height: 120,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#FEF7E0', // Light yellow
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FEF7E0',
    },
    statusText: {
        color: '#B08800', // Darker yellow/gold
        fontSize: 14,
        fontFamily: 'GoogleSans_700Bold',
    },
});
