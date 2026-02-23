import { View, StyleSheet, Image, Pressable } from 'react-native';
import { Users, Eye, CircleDollarSign, Flame, Building } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useAction } from 'convex/react';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '../../../../packages/backend/convex/_generated/api';

interface CampaignListItemProps {
    logoUrl?: string | null;
    logoS3Key?: string | null;
    name: string;
    companyName?: string;
    claimed: number;
    viewCount: string;
    payout: string;
    maxPayout?: string;
    isTrending?: boolean;
    onPress?: () => void;
}

export function CampaignListItem({
    logoUrl,
    logoS3Key,
    name,
    companyName = 'Company Name', // Default for now
    claimed,
    viewCount,
    payout,
    maxPayout = '5000', // Default for now
    isTrending,
    onPress,
}: CampaignListItemProps) {
    const colorScheme = useColorScheme();
    const iconColor = Colors[colorScheme ?? 'light'].icon;
    const textColor = Colors[colorScheme ?? 'light'].text;

    const generateAccessUrl = useAction(api.campaigns.generateCampaignImageAccessUrl);
    const [finalLogoUrl, setFinalLogoUrl] = useState<string | null>(!logoS3Key ? (logoUrl || null) : null);

    useEffect(() => {
        if (!logoS3Key) return;

        let cancelled = false;
        generateAccessUrl({ s3Key: logoS3Key })
            .then((url) => {
                if (!cancelled) setFinalLogoUrl(url || logoUrl || null);
            })
            .catch(() => {
                if (!cancelled) setFinalLogoUrl(logoUrl || null);
            });

        return () => { cancelled = true; };
    }, [logoS3Key, logoUrl, generateAccessUrl]);

    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.container,
                { backgroundColor: Colors[colorScheme ?? 'light'].background },
            ]}
        >
            {/* Top Part */}
            <View style={styles.topSection}>
                <View style={styles.logoContainer}>
                    {finalLogoUrl ? (
                        <Image source={{ uri: finalLogoUrl }} style={styles.logo} />
                    ) : (
                        <View style={[styles.logoPlaceholder, { backgroundColor: '#F3F4F6' }]}>
                            <Building size={24} color="#9CA3AF" />
                        </View>
                    )}
                </View>
                <View style={styles.titleContainer}>
                    <View style={styles.textColumn}>
                        <ThemedText style={styles.companyName}>
                            {companyName}
                        </ThemedText>
                        <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={2}>
                            {name}
                        </ThemedText>
                    </View>
                    {isTrending && (
                        <View style={styles.trendingBadge}>
                            <Flame size={12} color="#FF4500" fill="#FF4500" />
                            <ThemedText style={styles.trendingText}>Trending</ThemedText>
                        </View>
                    )}
                </View>
            </View>

            {/* Bottom Part */}
            <View style={styles.bottomSection}>
                <View style={styles.statItem}>
                    <Users size={16} color={iconColor} style={styles.icon} />
                    <ThemedText style={styles.statText}>{claimed} submitted</ThemedText>
                </View>

                <View style={styles.statItem}>
                    <Eye size={16} color={iconColor} style={styles.icon} />
                    <ThemedText style={styles.statText}>
                        RM {payout} / {viewCount} view
                    </ThemedText>
                </View>

                <View style={styles.statItem}>
                    <CircleDollarSign size={16} color={iconColor} style={styles.icon} />
                    <ThemedText style={styles.statText}>RM {maxPayout}</ThemedText>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        paddingVertical: 16,
        marginBottom: 12,
        borderRadius: 12,
        // Add shadow or border if needed, user didn't specify but card look is good.
    },
    topSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoContainer: {
        marginRight: 12,
    },
    logo: {
        width: 48,
        height: 48,
        resizeMode: 'contain',
        borderRadius: 100, // Square with radius looks modern
    },
    logoPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'GoogleSans_700Bold',
    },
    titleContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    textColumn: {
        flex: 1,
        marginRight: 8,
    },
    name: {
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 2,
    },
    companyName: {
        fontSize: 14,
        color: '#6B7280',
        fontFamily: 'GoogleSans_400Regular',
    },
    trendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: '#FFF0E6',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFD6C0',
    },
    trendingText: {
        fontSize: 10,
        color: '#FF4500',
        fontFamily: 'GoogleSans_700Bold',
    },
    bottomSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6', // Light divider
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    icon: {
        opacity: 0.7,
    },
    statText: {
        fontSize: 13,
        color: '#4B5563',
        fontFamily: 'GoogleSans_500Medium',
    },
    divider: {
        width: 1,
        height: 16,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 8,
        display: 'none', // Hiding vertical dividers to correct spacing if use space-between or space-evenly. Let's see. 
        // With "justifyContent: space-between", items will spread. 
        // If we want dividers, we can keep them. But user design description just said "row with...". 
        // I will omit dividers for now to keep it clean, or keep them if it feels too crowded.
        // Let's remove dividers from JSX if I set display none.
        // Actually, I won't render dividers in JSX if I use display none. I'll remove them to be cleaner.
    }
});
