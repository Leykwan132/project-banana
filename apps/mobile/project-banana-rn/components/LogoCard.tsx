import { View, StyleSheet, Image, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';

interface LogoCardProps {
    logoUrl?: string;
    name: string;
    claimed: number;
    viewCount: string;
    payout: string;
    onPress?: () => void;
}

export function LogoCard({
    logoUrl,
    name,
    claimed,
    viewCount,
    payout,
    onPress,
}: LogoCardProps) {
    return (
        <Pressable onPress={onPress} style={styles.container}>
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    {logoUrl ? (
                        <Image source={{ uri: logoUrl }} style={styles.logo} />
                    ) : (
                        <View style={styles.logoPlaceholder}>
                            <ThemedText style={styles.logoText}>{name.charAt(0)}</ThemedText>
                        </View>
                    )}
                </View>
                <View style={styles.claimedBadge}>
                    <ThemedText style={styles.claimedText}>{claimed} claimed</ThemedText>
                </View>
            </View>
            <ThemedText style={styles.name}>{name}</ThemedText>
            <ThemedText style={styles.reward}>Rm {payout} / {viewCount} View</ThemedText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1A1A1A',
        borderRadius: 20,
        padding: 20,
        width: 200,
        marginRight: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 42,
    },
    logoContainer: {
        // Margin bottom moved to header
    },
    logo: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    logoPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontFamily: 'GoogleSans_700Bold',
    },
    claimedBadge: {
        backgroundColor: '#333333',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    claimedText: {
        color: '#D1D5DB', // Light grey
        fontSize: 12,
        fontFamily: 'GoogleSans_500Medium',
    },
    name: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'GoogleSans_600SemiBold',
    },
    reward: {
        color: '#9CA3AF',
        fontSize: 13,
        fontFamily: 'GoogleSans_400Regular',
    },
    action: {
        color: '#6B7280',
        fontSize: 13,
        fontFamily: 'GoogleSans_500Medium',
    },
});
