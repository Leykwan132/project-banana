import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
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

export default function SubmissionDetailScreen() {
    const { id } = useLocalSearchParams(); // submission id
    const submissionId = id as Id<"submissions">;
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const submission = useQuery(api.submissions.getSubmission, { submissionId });
    const latestFeedback = useQuery(api.submissions.getLatestSubmissionFeedback, { submissionId });
    const generateVideoAccessUrl = useAction(api.submissions.generateVideoAccessUrl);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loadingUrl, setLoadingUrl] = useState(false);

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
        player.loop = true;
        player.play();
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
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Feedback</ThemedText>
                    {latestFeedback ? (
                        <View style={styles.feedbackBox}>
                            <ThemedText style={styles.feedbackText}>{latestFeedback}</ThemedText>
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

                {/* Status */}
                <View style={styles.section}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Status</ThemedText>
                    <ApplicationStatusBadge
                        status={mapSubmissionStatus(submission?.status)}
                        style={{ alignSelf: 'flex-start' }}
                    />
                </View>

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
        marginBottom: 12,
        color: '#000',
    },
    feedbackBox: {
        backgroundColor: '#F9F9F9', // Very light grey
        padding: 16,
        borderRadius: 12,
    },
    feedbackText: {
        fontSize: 16,
        lineHeight: 24,
        fontFamily: 'GoogleSans_400Regular',
        color: '#000',
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
