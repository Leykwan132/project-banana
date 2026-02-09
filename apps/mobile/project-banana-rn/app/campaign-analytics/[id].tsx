import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { View, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Flower } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ApplicationAnalyticItem } from '@/components/ApplicationAnalyticItem';
import { FlippableEarningsCard } from '@/components/FlippableEarningsCard';

// Mock Data for the campaign analytics
const mockCampaignAnalytics = {
    id: '1',
    name: 'Campaign A',
    company: 'by xxx company',
    logoLetter: 'a',
    earnings: 'Rm 453',
    topEarnerPercent: 5,
    postMetrics: {
        totalEarned: 'Rm 453',
        topEarnerPercent: 5,
    },
    applications: [
        {
            id: '1',
            name: 'Application 1',
            submittedOn: '15/11/2025',
            thumbnailUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400',
            views: '12K',
            likes: '1.2K',
            comments: '85',
            shares: '420',
            earnings: 'RM 45'
        },
        {
            id: '2',
            name: 'Application 2',
            submittedOn: '15/11/2025',
            thumbnailUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400',
            views: '8.5K',
            likes: '890',
            comments: '52',
            shares: '310',
            earnings: 'RM 32'
        }
    ]
};

export default function CampaignAnalyticsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const campaign = mockCampaignAnalytics; // In real app, fetch by id



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
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Campaign Info */}
                <View style={styles.campaignInfo}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoPlaceholder}>
                            <ThemedText style={styles.logoText}>{campaign.logoLetter}</ThemedText>
                        </View>
                        <View style={styles.amazonLogoBadge}>
                            {/* Placeholder for small icon if needed, or just part of the logo design */}
                        </View>
                    </View>
                    <ThemedText style={styles.campaignName}>{campaign.name}</ThemedText>
                    <ThemedText style={styles.companyName}>{campaign.company}</ThemedText>
                </View>

                {/* Flippable Earnings Card */}
                <FlippableEarningsCard
                    style={{ marginBottom: 24 }}
                    topEarnerPercent={campaign.postMetrics.topEarnerPercent}
                    frontContent={
                        <>
                            You’re <ThemedText style={{ color: '#4CAF50', fontSize: 22 }}>{campaign.postMetrics.totalEarned}</ThemedText> up from your posts
                        </>
                    }
                />

                {/* Applications List */}
                <View style={styles.applicationsSection}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                        Your approved applications
                    </ThemedText>

                    <View style={styles.list}>
                        {campaign.applications.map((app) => (
                            <ApplicationAnalyticItem
                                key={app.id}
                                applicationName={app.name}
                                submittedOn={app.submittedOn}
                                thumbnailUrl={app.thumbnailUrl}
                                views={app.views}
                                likes={app.likes}
                                comments={app.comments}
                                shares={app.shares}
                                earnings={app.earnings}
                                onPress={() => router.push(`/application-analytics/${app.id}`)}
                            />
                        ))}
                    </View>
                </View>
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
        paddingHorizontal: 20,
        paddingVertical: 10,
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
        position: 'relative',
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#EEEEEE',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    logoText: {
        fontSize: 40,
        fontFamily: 'GoogleSans_700Bold', // Using the font from usage in other files
    },
    amazonLogoBadge: {
        // Implementation for the small Amazon logo if needed
    },
    campaignName: {
        fontSize: 24,
        fontFamily: 'GoogleSans_700Bold',
        marginBottom: 4,
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
        marginBottom: 8,
    },
    list: {
        // gap: 12,
    },
    listItem: {
        // Override styles if needed
    },

});
