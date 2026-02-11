import { useRef, useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    useSharedValue
} from 'react-native-reanimated';
import { ChevronDown, Filter } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ActionSheetRef } from 'react-native-actions-sheet';
import LottieView from 'lottie-react-native';
import { usePaginatedQuery } from 'convex/react';

import { ApplicationListItem } from '@/components/ApplicationListItem';
import { ApplicationStatus } from '@/components/ApplicationStatusBadge';
import { SelectionSheet } from '@/components/SelectionSheet';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '../../../../packages/backend/convex/_generated/api';

const FILTER_OPTIONS = [
    { label: 'Pending Submission', value: 'pending_submission' },
    { label: 'Under Review', value: 'reviewing' },
    { label: 'Changes Required', value: 'changes_requested' },
    { label: 'Ready to Post', value: 'ready_to_post' },
    { label: 'Posted', value: 'earning' },
];

const ApplicationSkeleton = () => {
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

export function ApplicationList() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const filterSheetRef = useRef<ActionSheetRef>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

    // Fetch applications from Convex
    const { results, status, loadMore } = usePaginatedQuery(
        api.applications.getMyApplications,
        {},
        { initialNumItems: 20 }
    );

    const isLoading = status === 'LoadingFirstPage';

    const handleStatusSelect = (value: string) => {
        setSelectedStatus(value);
    };

    // Map Convex status to display status
    const mapStatus = (convexStatus: string): ApplicationStatus => {
        const statusMap: Record<string, ApplicationStatus> = {
            'pending_submission': 'Pending Submission',
            'reviewing': 'Under Review',
            'changes_requested': 'Changes Required',
            'ready_to_post': 'Ready to Post',
            'earning': 'Posted',
        };
        return statusMap[convexStatus] || 'Pending Submission';
    };

    // Process applications data
    const processedApplications = useMemo(() => {
        if (!results) return [];

        return results.map((app) => {
            // Format date from timestamp
            const date = new Date(app.created_at);
            const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;

            return {
                id: app._id,
                campaignId: app.campaign_id,
                campaignName: app.campaignName,
                businessName: app.businessName,
                status: mapStatus(app.status),
                createdOn: formattedDate,
                logoUrl: app.campaignCoverPhotoUrl || 'https://picsum.photos/200',
            };
        });
    }, [results]);

    const filteredApplications = useMemo(() => {
        return processedApplications.filter((app) => {
            if (!selectedStatus) return true;
            return app.status === FILTER_OPTIONS.find(o => o.value === selectedStatus)?.label;
        });
    }, [processedApplications, selectedStatus]);

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <View style={styles.headerSection}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                    Your Applications
                </ThemedText>
                <Pressable
                    style={[
                        styles.filterButton,
                        selectedStatus && { backgroundColor: '#F0F0F0', borderColor: '#1A1A1A' }
                    ]}
                    onPress={() => filterSheetRef.current?.show()}
                >
                    <ThemedText style={styles.filterButtonText}>
                        {FILTER_OPTIONS.find(o => o.value === selectedStatus)?.label || 'Filter'}
                    </ThemedText>
                    {selectedStatus ? (
                        <Filter size={14} color={Colors[colorScheme ?? 'light'].text} />
                    ) : (
                        <ChevronDown size={16} color={Colors[colorScheme ?? 'light'].text} />
                    )}
                </Pressable>
            </View>

            {/* Application List */}
            <View style={styles.listSection}>
                {isLoading ? (
                    <View>
                        {[...Array(4)].map((_, i) => (
                            <ApplicationSkeleton key={i} />
                        ))}
                    </View>
                ) : filteredApplications.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        <LottieView
                            source={require('@/assets/lotties/not-found.json')}
                            autoPlay
                            loop
                            style={styles.lottie}
                        />
                        <ThemedText style={styles.emptyStateText}>
                            No applications found
                        </ThemedText>
                        <ThemedText style={styles.emptyStateSubtext}>
                            Join campaigns to start applying
                        </ThemedText>
                    </View>
                ) : (
                    filteredApplications.map((app) => (
                        <ApplicationListItem
                            status={app.status}
                            key={app.id}
                            campaignName={app.campaignName || 'Campaign Name'}
                            businessName={app.businessName || 'Company Name'}
                            createdOn={app.createdOn}
                            logoUrl={app.logoUrl}
                            onPress={() => router.push({
                                pathname: '/application/[id]',
                                params: { id: app.id, campaignId: app.campaignId }
                            })}
                        />
                    ))
                )}
            </View>

            <SelectionSheet
                actionSheetRef={filterSheetRef}
                title="Status"
                options={FILTER_OPTIONS}
                selectedOption={selectedStatus}
                onSelect={handleStatusSelect}
                onReset={() => setSelectedStatus(null)}
                type="sort"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 8, // Little space after banner
    },
    headerSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
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
        fontSize: 14,
        fontFamily: 'GoogleSans_500Medium',
        color: '#000000',
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
    skeletonItem: {
        width: '100%',
        height: 90,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        marginBottom: 12,
    },
});
