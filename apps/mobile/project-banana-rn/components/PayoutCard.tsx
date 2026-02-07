import { View, StyleSheet, Pressable } from 'react-native';
import { Flower, ArrowRight } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';

interface PayoutCardProps {
    amount: string;
    onWithdraw?: () => void;
}

export function PayoutCard({ amount, onWithdraw, showButton = true, onPress }: { amount: string, onWithdraw?: () => void, showButton?: boolean, onPress?: () => void }) {
    return (
        <Pressable
            style={styles.container}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={styles.iconContainer}>
                <Flower size={24} color="#000" />
            </View>

            <View style={styles.content}>
                <ThemedText style={styles.label}>Available Payouts</ThemedText>

                <View style={styles.row}>
                    <ThemedText style={styles.amount}>{amount}</ThemedText>

                    {showButton ? (
                        <Pressable style={styles.withdrawButton} onPress={onWithdraw}>
                            <ThemedText style={styles.withdrawText}>Withdraw</ThemedText>
                            <ArrowRight size={16} color="#000" />
                        </Pressable>
                    ) : (
                        // If no button and is pressable, maybe show a small indicator or nothing?
                        // Screenshot shows a small arrow in a box possibly.
                        // For now I will just hide the button.
                        null
                    )}
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#2D2D2D', // Dark background as per screenshot
        borderRadius: 8,
        padding: 24,
        minHeight: 240,
        justifyContent: 'space-between',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        gap: 2,
    },
    label: {
        color: '#A0A0A0',
        fontSize: 14,
        fontFamily: 'GoogleSans_400Regular',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    amount: {
        color: '#FFFFFF',
        fontSize: 34,
        lineHeight: 42, // Ensure adequate line height to prevent clipping
        fontFamily: 'GoogleSans_700Bold',
    },
    withdrawButton: {
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
    },
    withdrawText: {
        color: '#000000',
        fontSize: 14,
        fontFamily: 'GoogleSans_700Bold',
    },
});
