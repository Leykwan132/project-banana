import { View, StyleSheet, Image, Pressable } from 'react-native';
import { Calendar } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ApplicationStatusBadge, ApplicationStatus } from './ApplicationStatusBadge';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface PastPayoutListItemProps {
    logoUrl?: string;
    campaignName: string;
    accountNumber?: string;
    date: string;
    amount: string;
    status?: ApplicationStatus;
    onPress?: () => void;
}

export function PastPayoutListItem({
    logoUrl,
    campaignName,
    accountNumber,
    date,
    amount,
    status,
    onPress,
}: PastPayoutListItemProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const cardBackgroundColor = isDark ? '#171717' : '#FBFAF7';
    const cardBorderColor = isDark ? '#303030' : '#E4DED2';
    const cardDividerColor = isDark ? '#2A2A2A' : '#E7E2D8';
    const logoChipBorderColor = isDark ? '#2A2A2A' : '#E7E2D8';


    return (
        <Pressable onPress={onPress}>
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
                        <Image
                            source={{ uri: logoUrl || 'https://picsum.photos/200' }}
                            style={styles.logo}
                        />
                    </View>

                    <View style={styles.titleContainer}>
                        <View style={styles.textColumn}>
                            {accountNumber && (
                                <ThemedText style={[styles.subText, { color: isDark ? '#8A8A8A' : '#6B7280' }]}>
                                    {accountNumber}
                                </ThemedText>
                            )}
                            <ThemedText type="defaultSemiBold" style={styles.name}>{campaignName}</ThemedText>
                        </View>
                        <ThemedText
                            type="defaultSemiBold"
                            style={[
                                styles.amount,
                                amount.startsWith('-') && { color: '#D32F2F' }
                            ]}
                        >
                            {amount}
                        </ThemedText>
                    </View>
                </View>

                {/* Bottom Section */}
                <View style={[styles.bottomSection, { borderTopColor: cardDividerColor }]}>
                    <View>
                        {status && (
                            <ApplicationStatusBadge status={status} />
                        )}
                    </View>
                    <View style={styles.dateContainer}>
                        <Calendar size={16} color={Colors[colorScheme ?? 'light'].icon} style={styles.icon} />
                        <ThemedText style={[styles.date, { color: isDark ? '#8A8A8A' : '#666666' }]}>
                            {['Pending', 'Processing'].includes(status || '') ? 'Requested on ' : status ? 'Withdraw on ' : 'Paid on '}{date}
                        </ThemedText>
                    </View>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        marginBottom: 4,
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    topSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoContainer: {
        marginRight: 12,
        width: 48,
        height: 48,
        borderWidth: 1,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    logo: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
    },
    titleContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    textColumn: {
        flex: 1,
        marginRight: 8,
    },
    subText: {
        fontSize: 14,
        color: '#6B7280',
        fontFamily: 'GoogleSans_400Regular',
    },
    name: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
        lineHeight: 22,
        marginBottom: 2,
    },
    amount: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
        color: '#2E7D32', // Green color
    },
    bottomSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    icon: {
        opacity: 0.7,
    },
    date: {
        fontSize: 13,
        color: '#666666',
        fontFamily: 'GoogleSans_400Regular',
    },
});
