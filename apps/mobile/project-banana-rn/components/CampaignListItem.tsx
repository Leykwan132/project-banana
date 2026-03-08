import { View, StyleSheet, Image, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Users, Eye, CircleDollarSign, Flame, Building, Tag, Wallet } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useAction } from 'convex/react';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '../../../../packages/backend/convex/_generated/api';

interface CampaignListItemProps {
    logoUrl?: string | null;
    logoR2Key?: string | null;
    name: string;
    companyName?: string;
    claimed: number;
    budgetClaimed: string;
    maxPayout?: string;
    isTrending?: boolean;
    category?: string | string[];
    onPress?: () => void;
}

export function CampaignListItem({
    logoUrl,
    logoR2Key,
    name,
    companyName = 'Company Name', // Default for now
    claimed,
    budgetClaimed,
    maxPayout = '5000', // Default for now
    isTrending,
    category,
    onPress,
}: CampaignListItemProps) {
    const colorScheme = useColorScheme();
    const iconColor = Colors[colorScheme ?? 'light'].icon;
    const textColor = Colors[colorScheme ?? 'light'].text;

    const generateAccessUrl = useAction(api.campaigns.generateCampaignImageAccessUrl);
    const [finalLogoUrl, setFinalLogoUrl] = useState<string | null>(!logoR2Key ? (logoUrl || null) : null);

    useEffect(() => {
        if (!logoR2Key) {
            setFinalLogoUrl(logoUrl || null);
            return;
        }

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

    const displayCategory = Array.isArray(category) ? category[0] : category;
    const formattedCategory = displayCategory
        ? displayCategory.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
        : 'For You';

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
                <View style={styles.topLeft}>
                    <View style={styles.logoContainer}>
                        {finalLogoUrl ? (
                            <Image source={{ uri: finalLogoUrl }} style={styles.logo} />
                        ) : (
                            <View style={[styles.logoPlaceholder, { backgroundColor: '#F3F4F6' }]}>
                                <Building size={24} color="#9CA3AF" />
                            </View>
                        )}
                    </View>
                    <View style={styles.textColumn}>
                        <View style={styles.companyRow}>
                            <ThemedText style={styles.companyName}>
                                {companyName}
                            </ThemedText>
                            {isTrending && (
                                <View style={styles.trendingBadge}>
                                    <Flame size={10} color="#FF4500" fill="#FF4500" />
                                    <ThemedText style={styles.trendingText}>Trending</ThemedText>
                                </View>
                            )}
                        </View>
                        <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={2}>
                            {name}
                        </ThemedText>
                    </View>
                </View>

                <View style={styles.maxPayContainer}>
                    <ExpoImage source={require('@/assets/images/icon-light.svg')} style={{ width: 14, height: 14 }} contentFit="contain" />
                    <ThemedText type="defaultSemiBold" style={styles.maxPayValue}>RM {maxPayout}</ThemedText>
                </View>
            </View>

            {/* Bottom Part */}
            <View style={styles.bottomSection}>
                <View style={styles.statItem}>
                    <Tag size={16} color={iconColor} style={styles.icon} />
                    <ThemedText style={styles.statText}>{formattedCategory}</ThemedText>
                </View>

                <View style={styles.statItem}>
                    <Users size={16} color={iconColor} style={styles.icon} />
                    <ThemedText style={styles.statText}>{claimed} submitted</ThemedText>
                </View>

                <View style={[styles.statItem, styles.statItemRight]}>
                    <Wallet size={16} color={iconColor} style={styles.icon} />
                    <ThemedText style={styles.statText}>
                        RM {budgetClaimed} claimed
                    </ThemedText>
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
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    topLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 12,
    },
    logoContainer: {
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 100,
    },
    logo: {
        width: 44,
        height: 44,
        resizeMode: 'contain',
        borderRadius: 100,
    },
    logoPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'GoogleSans_700Bold',
    },
    textColumn: {
        flex: 1,
        justifyContent: 'center',
    },
    companyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
        flexWrap: 'wrap',
    },
    companyName: {
        fontSize: 13,
        color: '#6B7280',
        fontFamily: 'GoogleSans_400Regular',
    },
    name: {
        fontSize: 15,
        lineHeight: 20,
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
    maxPayContainer: {
        alignItems: 'center',
        backgroundColor: "black",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 30,
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    maxPayValue: {
        fontSize: 14,
        color: 'white',
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
        flex: 1,
    },
    statItemRight: {
        justifyContent: 'flex-end',
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
