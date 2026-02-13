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


    return (
        <Pressable onPress={onPress}>
            <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
                {/* Top Section */}
                <View style={styles.topSection}>
                    <View style={styles.logoContainer}>
                        {logoUrl ? (
                            <Image source={{ uri: logoUrl }} style={styles.logo} />
                        ) : (
                            <View style={styles.logoPlaceholder}>
                                <Image
                                    source={{ uri: 'https://picsum.photos/200' }}
                                    style={styles.logo}
                                />
                            </View>
                        )}
                    </View>

                    <View style={styles.titleContainer}>
                        <View style={styles.textColumn}>
                            {accountNumber && (
                                <ThemedText style={styles.subText}>
                                    {accountNumber}
                                </ThemedText>
                            )}
                            <ThemedText type="defaultSemiBold" style={styles.name}>{campaignName}</ThemedText>
                        </View>
                        <ThemedText type="defaultSemiBold" style={styles.amount}>{amount}</ThemedText>
                    </View>
                </View>

                {/* Bottom Section */}
                <View style={styles.bottomSection}>
                    <View>
                        {status && (
                            <ApplicationStatusBadge status={status} />
                        )}
                    </View>
                    <View style={styles.dateContainer}>
                        <Calendar size={16} color={Colors[colorScheme ?? 'light'].icon} style={styles.icon} />
                        <ThemedText style={styles.date}>
                            {['Pending', 'Processing'].includes(status || '') ? 'Requested on ' : 'Paid on '}{date}
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
        marginBottom: 24,
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
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F0F0F0',
    },
    logoPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#EEEEEE',
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
