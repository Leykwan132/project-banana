
import { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Pressable, StyleProp, ViewStyle } from 'react-native';
import {
    Calendar,
    Building,
} from 'lucide-react-native';
import { useAction } from 'convex/react';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ApplicationStatus, ApplicationStatusBadge } from '@/components/ApplicationStatusBadge';
import { api } from '../../../../packages/backend/convex/_generated/api';

interface ApplicationListItemProps {
    logoUrl?: string | null;
    logoR2Key?: string | null;
    campaignName: string;
    businessName?: string;
    createdOn?: string;
    status?: ApplicationStatus;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
}

export function ApplicationListItem({
    logoUrl,
    logoR2Key,
    campaignName,
    businessName = 'Company Name',
    status,
    createdOn,
    onPress,
    style,
}: ApplicationListItemProps) {
    const colorScheme = useColorScheme();

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

    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.container,
                { backgroundColor: Colors[colorScheme ?? 'light'].screenBackground },
                style
            ]}
        >
            {/* Top Part */}
            <View style={styles.topSection}>
                <View style={styles.logoContainer}>
                    {finalLogoUrl ? (
                        <Image source={{ uri: finalLogoUrl }} style={styles.logo} />
                    ) : (
                        <View style={[styles.logoPlaceholder, { backgroundColor: colorScheme === 'dark' ? '#333' : '#F3F4F6' }]}>
                            <Building size={24} color={colorScheme === 'dark' ? '#6B7280' : '#9CA3AF'} />
                        </View>
                    )}
                </View>
                <View style={styles.titleContainer}>
                    <View style={styles.textColumn}>
                        <ThemedText style={[styles.companyName, { color: colorScheme === 'dark' ? '#9CA3AF' : '#6B7280' }]}>
                            {businessName}
                        </ThemedText>
                        <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={2}>
                            {campaignName}
                        </ThemedText>
                    </View>
                </View>
            </View>

            {/* Bottom Part */}
            <View style={[styles.bottomSection, { borderTopColor: colorScheme === 'dark' ? '#333' : '#F3F4F6' }]}>
                <ApplicationStatusBadge status={status} />

                {createdOn && (
                    <View style={styles.statItem}>
                        <Calendar size={16} color={Colors[colorScheme ?? 'light'].icon} style={styles.icon} />
                        <ThemedText style={[styles.statText, { color: colorScheme === 'dark' ? '#9CA3AF' : '#4B5563' }]}>
                            Created on {createdOn}
                        </ThemedText>
                    </View>
                )}
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
        fontFamily: 'GoogleSans_400Regular',
    },
    bottomSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
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
        fontFamily: 'GoogleSans_500Medium',
    },
});
