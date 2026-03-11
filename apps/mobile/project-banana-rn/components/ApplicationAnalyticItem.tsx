import { View, StyleSheet, Pressable, Image } from 'react-native';
import { Eye, Heart, MessageCircle, Share, Wallet, Calendar, Video } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ApplicationAnalyticItemProps {
    applicationName: string;
    submittedOn: string;
    thumbnailUrl?: string;
    views: string;
    likes: string;
    comments: string;
    shares: string;
    earnings: string;
    onPress?: () => void;
}

export function ApplicationAnalyticItem({
    applicationName,
    submittedOn,
    thumbnailUrl,
    views,
    likes,
    comments,
    shares,
    earnings,
    onPress,
}: ApplicationAnalyticItemProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const iconColor = theme.icon;
    const cardBackgroundColor = isDark ? '#1A1A1A' : '#F8F8F4';
    const cardBorderColor = isDark ? '#2F2F2F' : '#E7E5DC';
    const cardDividerColor = isDark ? '#2A2A2A' : '#E4E1D7';

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.container,
                {
                    backgroundColor: cardBackgroundColor,
                    borderColor: cardBorderColor,
                },
                pressed && { opacity: 0.7 }
            ]}
        >
            {/* Top Section */}
            <View style={styles.topSection}>
                {/* Thumbnail Image */}
                {thumbnailUrl ? (
                    <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
                ) : (
                    <View style={[styles.thumbnailPlaceholder, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                        <Video size={24} color="#9CA3AF" />
                    </View>
                )}

                <View style={styles.textColumn}>
                    <ThemedText type="defaultSemiBold" style={styles.applicationName} numberOfLines={2}>
                        {applicationName}
                    </ThemedText>
                    <View style={styles.dateRow}>
                        <Calendar size={14} color={isDark ? '#8A8A8A' : '#6B7280'} />
                        <ThemedText style={[styles.dateText, { color: isDark ? '#8A8A8A' : '#6B7280' }]}>
                            {submittedOn}
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
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 14,
        paddingBottom: 16,
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
    },
    topSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    thumbnail: {
        width: 60,
        height: 60,
        borderRadius: 8,
        resizeMode: 'cover',
    },
    thumbnailPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textColumn: {
        flex: 1,
    },
    applicationName: {
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 6,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: 14,
        color: '#6B7280',
        fontFamily: 'GoogleSans_400Regular',
    },
    bottomSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
