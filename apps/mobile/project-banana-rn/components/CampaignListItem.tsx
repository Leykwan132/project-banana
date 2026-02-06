import { View, StyleSheet, Image, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CampaignListItemProps {
    logoUrl?: string;
    name: string;
    claimed: number;
    viewCount: string;
    payout: string;
    onPress?: () => void;
}

export function CampaignListItem({
    logoUrl,
    name,
    claimed,
    viewCount,
    payout,
    onPress,
}: CampaignListItemProps) {
    const colorScheme = useColorScheme();

    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.container,
                { backgroundColor: Colors[colorScheme ?? 'light'].navBackground },
            ]}
        >
            <View style={styles.logoContainer}>
                {logoUrl ? (
                    <Image source={{ uri: logoUrl }} style={styles.logo} />
                ) : (
                    <View style={[styles.logoPlaceholder, { backgroundColor: '#FF9900' }]}>
                        <ThemedText style={styles.logoText}>a</ThemedText>
                    </View>
                )}
            </View>
            <View style={styles.content}>
                <ThemedText type="defaultSemiBold" style={styles.name}>{name}</ThemedText>
                <ThemedText style={styles.meta}>
                    {claimed} claimed  ·  Rm {payout} / {viewCount} View
                </ThemedText>
            </View>
            <ChevronRight size={20} color={Colors[colorScheme ?? 'light'].icon} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingBottom: 24, // Minimal vertical padding as per screenshot
        borderRadius: 20,
    },
    logoContainer: {
        marginRight: 16,
    },
    logo: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    logoPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        color: '#FFFFFF',
        fontSize: 28,
        fontFamily: 'GoogleSans_700Bold',
    },
    content: {
        flex: 1,
    },
    name: {
        fontSize: 18,
        marginBottom: 4,
    },
    meta: {
        color: '#6B7280',
        fontSize: 14,
        fontFamily: 'GoogleSans_400Regular',
    },
});
