import { View, StyleSheet, Image, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';

interface PastPayoutListItemProps {
    logoUrl?: string;
    campaignName: string;
    date: string;
    amount: string;
    status?: string;
    onPress?: () => void;
}

export function PastPayoutListItem({
    logoUrl,
    campaignName,
    date,
    amount,
    status,
    onPress,
}: PastPayoutListItemProps) {
    const getStatusColor = (status?: string) => {
        if (status === 'Pending') return '#F57C00'; // Orange
        if (status === 'Paid') return '#2E7D32'; // Green
        return '#666';
    };

    return (
        <Pressable onPress={onPress}>
            <View style={styles.container}>
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

                <View style={styles.content}>
                    <View style={styles.nameRow}>
                        <ThemedText type="defaultSemiBold" style={styles.name}>{campaignName}</ThemedText>
                        {status && (
                            <View style={[styles.statusBadge, { backgroundColor: status === 'Pending' ? '#FFF3E0' : '#E8F5E9' }]}>
                                <ThemedText style={[styles.statusText, { color: getStatusColor(status) }]}>
                                    {status}
                                </ThemedText>
                            </View>
                        )}
                    </View>
                    <ThemedText style={styles.date}>
                        {status === 'Pending' ? 'requested on ' : 'paid on '}{date}
                    </ThemedText>
                </View>

                <ThemedText type="defaultSemiBold" style={styles.amount}>{amount}</ThemedText>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
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
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    name: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'GoogleSans_700Bold',
    },
    date: {
        fontSize: 13,
        color: '#666666',
        fontFamily: 'GoogleSans_400Regular',
    },
    amount: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
        color: '#2E7D32', // Green color
    },
});
