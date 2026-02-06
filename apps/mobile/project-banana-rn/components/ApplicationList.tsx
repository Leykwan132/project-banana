import { View, StyleSheet, Pressable } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { ApplicationListItem, ApplicationStatus } from '@/components/ApplicationListItem';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Application {
    id: string;
    campaignName: string;
    status: ApplicationStatus;
    submittedOn: string;
    logoUrl?: string;
}

// Demo data matching screenshot
const applicationList: Application[] = [
    { id: '1', campaignName: 'Campaign Name', status: 'Ready to Post', submittedOn: '14/2/26' },
    { id: '2', campaignName: 'Campaign Name', status: 'Under Review', submittedOn: '14/2/26' },
    { id: '3', campaignName: 'Campaign Name', status: 'Changes Required', submittedOn: '14/2/26' },
];

export function ApplicationList() {
    const router = useRouter();
    const colorScheme = useColorScheme();

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <View style={styles.headerSection}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                    Your Applications
                </ThemedText>
                <Pressable style={styles.filterButton}>
                    <ThemedText style={styles.filterButtonText}>Filter</ThemedText>
                    <ChevronDown size={16} color={Colors[colorScheme ?? 'light'].text} />
                </Pressable>
            </View>

            {/* Application List */}
            <View style={styles.listSection}>
                {applicationList.map((app) => (
                    <ApplicationListItem
                        key={app.id}
                        campaignName={app.campaignName}
                        status={app.status}
                        submittedOn={app.submittedOn}
                        logoUrl={app.logoUrl} // Will fallback to placeholder
                        onPress={() => router.push(`/application/${app.id}`)}
                    />
                ))}
            </View>
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
        gap: 12, // Gap between items
    },
});
