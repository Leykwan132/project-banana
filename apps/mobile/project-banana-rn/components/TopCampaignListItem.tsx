import { View, StyleSheet, Image, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface TopCampaignListItemProps {
    logoUrl?: string;
    name: string;
    value: string;
    progress: number; // 0 to 1
}

export function TopCampaignListItem({
    logoUrl,
    name,
    value,
    progress,
}: TopCampaignListItemProps) {
    const colorScheme = useColorScheme();

    return (
        <View style={styles.container}>
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
                <View style={styles.headerRow}>
                    <ThemedText type="defaultSemiBold" style={styles.name}>{name}</ThemedText>
                    <ThemedText type="defaultSemiBold" style={styles.value}>{value}</ThemedText>
                </View>
                <View style={[styles.progressBarContainer, { backgroundColor: '#F0F0F0' }]}>
                    <View
                        style={[
                            styles.progressBarFill,
                            {
                                width: `${Math.min(Math.max(progress, 0), 1) * 100}%`,
                                backgroundColor: '#000000'
                            }
                        ]}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 12,
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
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    name: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    value: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    progressBarContainer: {
        height: 8,
        borderRadius: 4,
        width: '100%',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
});
