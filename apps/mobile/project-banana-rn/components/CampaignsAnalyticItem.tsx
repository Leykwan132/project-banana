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
    logoR2Key?: string;
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
    logoR2Key,
    name,
    companyName = 'Company Name',
    views,
    likes,
    comments,
    shares,
    earnings,
}: CampaignsAnalyticListProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const iconColor = theme.icon;
    const cardBackgroundColor = isDark ? '#171717' : '#FBFAF7';
    const cardBorderColor = isDark ? '#303030' : '#E4DED2';
    const cardDividerColor = isDark ? '#2A2A2A' : '#E7E2D8';
    const logoChipBorderColor = isDark ? '#2A2A2A' : '#E7E2D8';

    const generateAccessUrl = useAction(api.campaigns.generateCampaignImageAccessUrl);
    const [finalLogoUrl, setFinalLogoUrl] = useState<string | null>(!logoR2Key ? (logoUrl || null) : null);

    useEffect(() => {
        if (!logoR2Key) return;

        let cancelled = false;
        generateAccessUrl({ r2Key: logoR2Key })
            .then((url) => {
                if (!cancelled) setFinalLogoUrl(url || logoUrl || null);
            })
            .catch(() => {
                if (!cancelled) setFinalLogoUrl(logoUrl || null);
            });

        return () => { cancelled = true; };
    }, [logoR2Key, logoUrl, generateAccessUrl]);

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: cardBackgroundColor,
                    borderColor: cardBorderColor,
                }
            ]}
        >
            {/* Top Section */}
            <View style={styles.topSection}>
                <View style={[styles.logoContainer, { borderColor: logoChipBorderColor }]}>
                    {finalLogoUrl ? (
                        <Image source={{ uri: finalLogoUrl }} style={styles.logo} />
                    ) : (
                        <View style={styles.logoPlaceholder}>
                            <ThemedText style={[styles.logoText, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                                {name.charAt(0).toUpperCase()}
                            </ThemedText>
                        </View>
                    )}
                </View>

                <View style={styles.titleContainer}>
                    <View style={styles.textColumn}>
                        <ThemedText style={[styles.companyName, { color: isDark ? '#8A8A8A' : '#6B7280' }]}>
                            {companyName}
                        </ThemedText>
                        <ThemedText
                            type="defaultSemiBold"
                            style={styles.name}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {name}
                        </ThemedText>
                    </View>
                </View>
            </View>

            {/* Bottom Section - Metrics */}
            <View style={[styles.bottomSection, { borderTopColor: cardDividerColor }]}>
                <View style={styles.statItem}>
                    <Eye size={16} color={iconColor} style={styles.icon} />
                    <ThemedText style={[styles.statText, { color: isDark ? '#CFCFCF' : '#4B5563' }]}>{views}</ThemedText>
                </View>

                <View style={styles.statItem}>
                    <Heart size={16} color={iconColor} style={styles.icon} />
                    <ThemedText style={[styles.statText, { color: isDark ? '#CFCFCF' : '#4B5563' }]}>{likes}</ThemedText>
                </View>

                <View style={styles.statItem}>
                    <MessageCircle size={16} color={iconColor} style={styles.icon} />
                    <ThemedText style={[styles.statText, { color: isDark ? '#CFCFCF' : '#4B5563' }]}>{comments}</ThemedText>
                </View>

                <View style={styles.statItem}>
                    <Share size={16} color={iconColor} style={styles.icon} />
                    <ThemedText style={[styles.statText, { color: isDark ? '#CFCFCF' : '#4B5563' }]}>{shares}</ThemedText>
                </View>

                <View style={styles.statItem}>
                    <Wallet size={16} color={iconColor} style={styles.icon} />
                    <ThemedText style={[styles.statText, { color: isDark ? '#CFCFCF' : '#4B5563' }]}>{earnings}</ThemedText>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 14,
        paddingVertical: 16,
        marginBottom: 12,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
    },
    topSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoContainer: {
        marginRight: 12,
        borderWidth: 1,
        borderRadius: 100,
    },
    logo: {
        width: 48,
        height: 48,
        borderRadius: 100,
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
    },
    logoPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    logoText: {
        fontSize: 20,
        fontFamily: 'GoogleSans_700Bold',
    },
    titleContainer: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    textColumn: {
        flex: 1,
        minWidth: 0,
        marginRight: 8,
    },
    name: {
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 2,
    },
    companyName: {
        fontSize: 14,
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
