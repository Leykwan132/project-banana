import { useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ChevronDown, Filter } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ActionSheetRef } from 'react-native-actions-sheet';
import LottieView from 'lottie-react-native';

import { ApplicationListItem } from '@/components/ApplicationListItem';
import { ApplicationStatus } from '@/components/ApplicationStatusBadge';
import { SelectionSheet } from '@/components/SelectionSheet';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Application {
    id: string;
    campaignName: string;
    companyName: string;
    status: ApplicationStatus;
    createdOn: string;
    logoUrl?: string;
}

// Demo data matching screenshot
const applicationList: Application[] = [
    { id: '1', campaignName: 'Summer Launch', companyName: 'Zalora', status: 'Pending Submission', createdOn: '12/2/26', logoUrl: undefined },
    { id: '2', campaignName: '9.9 Super Sale', companyName: 'Shopee Malaysia', status: 'Under Review', createdOn: '14/2/26', logoUrl: 'https://static.vecteezy.com/system/resources/thumbnails/028/766/353/small/shopee-icon-symbol-free-png.png' },
    { id: '3', campaignName: 'K-Beauty Review', companyName: 'Watsons', status: 'Changes Required', createdOn: '13/2/26', logoUrl: 'https://www.watsonsasia.com/assets/images/logo_watsons_mobile.png' },
    { id: '4', campaignName: 'Merdeka Special', companyName: 'GrabFood', status: 'Ready to Post', createdOn: '10/2/26', logoUrl: 'https://images.seeklogo.com/logo-png/62/2/grab-logo-png_seeklogo-622162.png' },
    { id: '5', campaignName: 'Chinese New Year 2026', companyName: 'Coca-Cola', status: 'Posted', createdOn: '01/2/26', logoUrl: undefined },
];

const FILTER_OPTIONS = [
    { label: 'Pending Submission', value: 'Pending Submission' },
    { label: 'Under Review', value: 'Under Review' },
    { label: 'Changes Required', value: 'Changes Required' },
    { label: 'Ready to Post', value: 'Ready to Post' },
    { label: 'Posted', value: 'Posted' },
];

export function ApplicationList() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const filterSheetRef = useRef<ActionSheetRef>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

    const handleStatusSelect = (value: string) => {
        setSelectedStatus(value);
    };

    const filteredApplications = applicationList.filter((app) => {
        if (!selectedStatus) return true;
        return app.status === selectedStatus;
    });

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
                        {selectedStatus || 'Filter'}
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
                {filteredApplications.length === 0 ? (
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
                            campaignName={app.campaignName}
                            companyName={app.companyName}
                            createdOn={app.createdOn}
                            logoUrl={app.logoUrl} // Will fallback to placeholder
                            onPress={() => router.push(`/application/${app.id}`)}
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
});
