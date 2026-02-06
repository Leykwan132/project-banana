import { View, StyleSheet, Image } from 'react-native';

import { ThemedText } from '@/components/themed-text';

interface PastPayoutListItemProps {
    logoUrl?: string;
    campaignName: string;
    date: string;
    amount: string;
}

export function PastPayoutListItem({
    logoUrl,
    campaignName,
    date,
    amount,
}: PastPayoutListItemProps) {
    return (
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
                <ThemedText type="defaultSemiBold" style={styles.name}>{campaignName}</ThemedText>
                <ThemedText style={styles.date}>paid on {date}</ThemedText>
            </View>

            <ThemedText style={styles.amount}>{amount}</ThemedText>
        </View>
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
    name: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
        marginBottom: 2,
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
