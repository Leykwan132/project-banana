import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { ThemedText } from '@/components/themed-text';
import { ApplicationStatus, ApplicationStatusBadge } from '@/components/ApplicationStatusBadge';

// Mock Data for a single submission
const mockSubmission = {
    id: '1',
    status: 'Changes Required' as ApplicationStatus,
    videoStatus: 'Earning', // The badge on the video
    submittedDate: '11/5/2025 6pm',
    feedback: '2 things to change, 1 is the xxx has to be xxx. 2 is the xxx has to be xxx.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', // Mock URL
};

export default function SubmissionDetailScreen() {
    const { id } = useLocalSearchParams(); // submission id
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const videoPlayer = useVideoPlayer(mockSubmission.videoUrl, player => {
        player.loop = true;
        player.play();
    });

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
                    <VideoView
                        player={videoPlayer}
                        style={styles.video}
                        contentFit="cover"
                        nativeControls
                    />
                </View>

                {/* Date */}
                <ThemedText style={styles.dateText}>Submitted on {mockSubmission.submittedDate}</ThemedText>

                {/* Feedback */}
                <View style={styles.section}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Feedback</ThemedText>
                    <View style={styles.feedbackBox}>
                        <ThemedText style={styles.feedbackText}>{mockSubmission.feedback}</ThemedText>
                    </View>
                </View>

                {/* Status */}
                <View style={styles.section}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Status</ThemedText>
                    <ApplicationStatusBadge status={mockSubmission.status} style={{ alignSelf: 'flex-start' }} />
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
