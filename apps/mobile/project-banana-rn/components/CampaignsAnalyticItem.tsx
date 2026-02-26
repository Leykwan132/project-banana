import { View, StyleSheet, Image } from 'react-native';
import { Eye, Heart, MessageCircle, Share, Wallet } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useAction } from 'convex/react';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '../../../../packages/backend/convex/_generated/api';

interface CampaignsAnalyticListProps {
    logoUrl?: string;
    logoS3Key?: string;
    name: string;
    companyName?: string;
    views: string;
    likes: string;
    comments: string;
    shares: string;
    earnings: string;
}

export function CampaignsAnalyticItem({
    logoUrl,
    logoS3Key,
    name,
    companyName = 'Company Name',
    views,
    likes,
    comments,
    shares,
    earnings,
}: CampaignsAnalyticListProps) {
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
        <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
            {/* Top Section */}
            <View style={styles.topSection}>
                <View style={styles.logoContainer}>
                    {finalLogoUrl ? (
                        <Image source={{ uri: finalLogoUrl }} style={styles.logo} />
                    ) : (
                        <View style={[styles.logoPlaceholder, { backgroundColor: '#FF9900' }]}>
                            <ThemedText style={styles.logoText}>
                                {name.charAt(0).toUpperCase()}
                            </ThemedText>
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
                </View>
            </View>

            {/* Bottom Section - Metrics */}
            <View style={styles.bottomSection}>
                <View style={styles.statItem}>
                    <Eye size={16} color={iconColor} style={styles.icon} />
                    <ThemedText style={styles.statText}>{views}</ThemedText>
                </View>

                <View style={styles.statItem}>
                    <Heart size={16} color={iconColor} style={styles.icon} />
                    <ThemedText style={styles.statText}>{likes}</ThemedText>
                </View>

                <View style={styles.statItem}>
                    <MessageCircle size={16} color={iconColor} style={styles.icon} />
                    <ThemedText style={styles.statText}>{comments}</ThemedText>
                </View>

                <View style={styles.statItem}>
                    <Share size={16} color={iconColor} style={styles.icon} />
                    <ThemedText style={styles.statText}>{shares}</ThemedText>
                </View>

                <View style={styles.statItem}>
                    <Wallet size={16} color={iconColor} style={styles.icon} />
                    <ThemedText style={styles.statText}>{earnings}</ThemedText>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 16,
        // paddingHorizontal: 16, // Added padding to match card look inside
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        // Optional: Add shadow if desired to match CampaignListItem exactly, assuming it had one in context
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
        borderRadius: 100,
        resizeMode: 'contain',
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
    bottomSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // Distribute evenly
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    icon: {
        opacity: 0.7,
    },
    statText: {
        fontSize: 12,
        color: '#4B5563',
        fontFamily: 'GoogleSans_500Medium',
    },
});
