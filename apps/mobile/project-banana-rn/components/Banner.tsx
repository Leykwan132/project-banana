import { View, StyleSheet } from 'react-native';
import { Info } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';

export type BannerType = 'referral' | 'cashback' | 'promo' | 'how_it_works';

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
    how_it_works: {
        gradient: ['#E1F5FE', '#B3E5FC'],
        accentColor: '#0288D1',
        defaultTitle: 'New to Youniq?',
        defaultSubtitle: 'See how it works',
        defaultButton: 'Learn More',
    },
};

export function Banner({ type, title, subtitle, buttonText, onPress }: BannerProps) {
    const config = bannerConfigs[type];

    return (
        <View style={styles.container}>
            <View style={[styles.banner, { backgroundColor: config.gradient[0] }]}>
                <View style={styles.content}>
                    <View>
                        <ThemedText style={styles.title}>{title || config.defaultTitle}</ThemedText>
                        <ThemedText style={styles.subtitle}>{subtitle || config.defaultSubtitle}</ThemedText>
                    </View>
                    <View style={[styles.button, { backgroundColor: config.accentColor }]}>
                        <ThemedText style={styles.buttonText}>{buttonText || config.defaultButton}</ThemedText>
                    </View>
                </View>
                <View style={styles.imageContainer}>
                    {type === 'how_it_works' ? (
                        <View style={[styles.iconBadge, { backgroundColor: config.accentColor }]}>
                            <Info size={32} color="#FFFFFF" />
                        </View>
                    ) : (
                        <View style={styles.cashbackBadge}>
                            <ThemedText style={styles.cashbackLabel}>GET FLAT</ThemedText>
                            <ThemedText style={styles.cashbackAmount}>₹100</ThemedText>
                            <ThemedText style={styles.cashbackText}>Cashback</ThemedText>
                        </View>
                    )}
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
    },
    content: {
        flex: 1,
        gap: 8,
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
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
        color: '#1A1A1A',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
        color: '#1A1A1A',
    },
    button: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
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
    iconBadge: {
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '5deg' }],
    },
});
