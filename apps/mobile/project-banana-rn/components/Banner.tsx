import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export type BannerType = 'referral' | 'cashback' | 'promo';

interface BannerProps {
    type: BannerType;
    title?: string;
    subtitle?: string;
    buttonText?: string;
    onPress?: () => void;
}

const bannerConfigs = {
    referral: {
        gradient: ['#E8F5E9', '#C8E6C9'],
        accentColor: '#4CAF50',
        defaultTitle: 'Invite a friend',
        defaultSubtitle: 'to Cashon!',
        defaultButton: 'Refer Now',
    },
    cashback: {
        gradient: ['#FFF8E1', '#FFECB3'],
        accentColor: '#FF9800',
        defaultTitle: 'Get Flat',
        defaultSubtitle: '₹100 Cashback',
        defaultButton: 'Claim Now',
    },
    promo: {
        gradient: ['#E3F2FD', '#BBDEFB'],
        accentColor: '#2196F3',
        defaultTitle: 'Special Offer',
        defaultSubtitle: 'Limited Time!',
        defaultButton: 'View',
    },
};

export function Banner({ type, title, subtitle, buttonText, onPress }: BannerProps) {
    const config = bannerConfigs[type];

    return (
        <View style={styles.container}>
            <View style={[styles.banner, { backgroundColor: config.gradient[0] }]}>
                <View style={styles.content}>
                    <View style={styles.badgeContainer}>
                        <ThemedText style={[styles.badge, { color: config.accentColor }]}>
                            CASH<ThemedText style={styles.badgeHighlight}>ON</ThemedText>
                        </ThemedText>
                    </View>
                    <ThemedText style={styles.title}>{title || config.defaultTitle}</ThemedText>
                    <ThemedText style={styles.subtitle}>{subtitle || config.defaultSubtitle}</ThemedText>
                    <View style={[styles.button, { backgroundColor: config.accentColor }]}>
                        <ThemedText style={styles.buttonText}>{buttonText || config.defaultButton}</ThemedText>
                    </View>
                </View>
                <View style={styles.imageContainer}>
                    <View style={styles.cashbackBadge}>
                        <ThemedText style={styles.cashbackLabel}>GET FLAT</ThemedText>
                        <ThemedText style={styles.cashbackAmount}>₹100</ThemedText>
                        <ThemedText style={styles.cashbackText}>Cashback</ThemedText>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 4,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    banner: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 16,
        overflow: 'hidden',
        minHeight: 140,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    badgeContainer: {
        marginBottom: 8,
    },
    badge: {
        fontSize: 14,
        fontFamily: 'GoogleSans_700Bold',
    },
    badgeHighlight: {
        color: '#FF9800',
    },
    title: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
        color: '#1A1A1A',
    },
    subtitle: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
        color: '#1A1A1A',
        marginBottom: 12,
    },
    button: {
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'GoogleSans_600SemiBold',
    },
    imageContainer: {
        flex: 1,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    cashbackBadge: {
        backgroundColor: '#1B5E20',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        transform: [{ rotate: '5deg' }],
    },
    cashbackLabel: {
        color: '#81C784',
        fontSize: 10,
        fontFamily: 'GoogleSans_600SemiBold',
    },
    cashbackAmount: {
        color: '#FFFFFF',
        fontSize: 28,
        fontFamily: 'GoogleSans_700Bold',
    },
    cashbackText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'GoogleSans_400Regular',
    },
});
