import { View, StyleSheet, Image, Pressable, StyleProp, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ApplicationStatus = 'Pending Submission' | 'Under Review' | 'Changes Required' | 'Ready to Post' | 'Posted';

interface ApplicationListItemProps {
    logoUrl?: string;
    campaignName: string;
    submittedOn?: string;
    status: ApplicationStatus;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
}

export const getStatusStyle = (status: ApplicationStatus) => {
    switch (status) {
        case 'Ready to Post':
            return {
                bg: '#E6F4EA', // Light green bg
                text: '#1E8E3E', // Dark green text
                border: '#E6F4EA',
            };
        case 'Pending Submission':
            return {
                bg: '#E3F2FD', // Light blue bg
                text: '#1976D2', // Blue text
                border: '#E3F2FD',
            };
        case 'Under Review':
            return {
                bg: '#FEF7E0', // Light yellow bg
                text: '#B08800', // Dark yellow text
                border: '#FEF7E0',
            };
        case 'Changes Required':
            return {
                bg: '#FCE8E6', // Light red bg
                text: '#D93025', // Dark red text
                border: '#FCE8E6',
            };
        default:
            return {
                bg: '#F3F4F6', // Light grey bg
                text: '#4B5563', // Dark grey text
                border: '#F3F4F6',
            };
    }
};

export function ApplicationListItem({
    logoUrl,
    campaignName,
    status,
    submittedOn,
    onPress,
    style,
}: ApplicationListItemProps) {
    const colorScheme = useColorScheme();
    const { bg, text, border } = getStatusStyle(status);

    return (
        <Pressable
            onPress={onPress}
            style={[styles.container, style]}
        >
            <View style={styles.logoContainer}>
                {logoUrl ? (
                    <Image source={{ uri: logoUrl }} style={styles.logo} />
                ) : (
                    <View style={styles.logoPlaceholder}>
                        <Image
                            source={{ uri: 'https://picsum.photos/200' }}
                            style={styles.logo}
                        />
                    </View>
                )}
            </View>

            <View style={styles.content}>
                <ThemedText style={styles.name}>{campaignName}</ThemedText>
                <View style={styles.metaRow}>
                    <View style={[styles.statusBadge, { backgroundColor: bg, borderColor: border }]}>
                        <ThemedText style={[styles.statusText, { color: text }]}>
                            {status}
                        </ThemedText>
                    </View>

                    {
                        submittedOn && (
                            <ThemedText style={styles.dateText}>
                                submitted on <ThemedText type='title' style={styles.dateText}>{submittedOn}</ThemedText>
                            </ThemedText>
                        )
                    }
                </View>
            </View>

            <ChevronRight size={20} color={Colors[colorScheme ?? 'light'].icon} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12, // Minimal vertical padding as per screenshot
    },
    logoContainer: {
        marginRight: 12,
    },
    logo: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    logoPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF', // White background for logo circle
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    logoText: {
        color: '#000000',
        fontSize: 24,
        fontFamily: 'GoogleSans_700Bold',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold', // Bold title
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusBadge: {
        paddingHorizontal: 12,
        // paddingVertical: 1,
        borderRadius: 100, // Slightly rounded
        borderWidth: 1,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'GoogleSans_700Bold',
        letterSpacing: 0.2, // Make it look like a badge label
    },
    dateText: {
        fontSize: 12,
        color: '#9E9E9E',
        fontFamily: 'GoogleSans_400Regular',
    },
});
