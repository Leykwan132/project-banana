import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useEffect } from 'react';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface PayoutCelebrationModalProps {
    visible: boolean;
    amount: string;
    bankName?: string;
    accountNumber?: string;
    onDismiss: () => void;
    onShowDetails: () => void;
}

const maskAccountNumber = (accountNumber?: string) => {
    if (!accountNumber) return '****';
    if (accountNumber.length <= 4) return accountNumber;
    return `****${accountNumber.slice(-4)}`;
};

export function PayoutCelebrationModal({
    visible,
    amount,
    bankName,
    accountNumber,
    onDismiss,
    onShowDetails,
}: PayoutCelebrationModalProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const progress = useSharedValue(0);
    const sparkle = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            progress.value = withTiming(1, {
                duration: 520,
                easing: Easing.out(Easing.cubic),
            });
            sparkle.value = withDelay(120, withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }));
            return;
        }

        progress.value = 0;
        sparkle.value = 0;
    }, [progress, sparkle, visible]);

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 1], [0, 1]),
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: interpolate(sparkle.value, [0, 1], [0, 0.9]),
        transform: [{ scale: interpolate(sparkle.value, [0, 1], [0.75, 1.05]) }],
    }));

    const cardStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [
            { translateY: interpolate(progress.value, [0, 1], [220, 0]) },
            { scale: interpolate(progress.value, [0, 1], [0.68, 1]) },
        ],
    }));

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
            <Animated.View style={[styles.overlay, overlayStyle]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
                <Animated.View
                    style={[
                        styles.glow,
                        glowStyle,
                        { backgroundColor: isDark ? 'rgba(244, 197, 66, 0.22)' : 'rgba(255, 220, 105, 0.48)' },
                    ]}
                />
                <Animated.View
                    style={[
                        styles.card,
                        cardStyle,
                        {
                            backgroundColor: isDark ? '#161616' : '#FFF8E7',
                            borderColor: isDark ? '#2F2F2F' : '#E5D8B1',
                        },
                    ]}
                >
                    {/* <View style={styles.iconWrap}>
                        <View style={[styles.iconChip, { backgroundColor: isDark ? '#F4C54E' : '#1F2937' }]}>
                            <Landmark size={24} color={isDark ? '#151515' : '#FFF8E7'} />
                        </View>
                    </View> */}

                    <LottieView
                        source={require('@/assets/lotties/coin.json')}
                        autoPlay
                        loop={false}
                        style={styles.lottie}
                    />

                    <ThemedText style={[styles.eyebrow, { color: isDark ? '#F6D879' : '#8A6112' }]}>
                        Payout Completed
                    </ThemedText>
                    <ThemedText style={[styles.title, { color: theme.text }]}>You've received</ThemedText>
                    <ThemedText style={[styles.amount, { color: isDark ? '#FFF7D6' : '#111827' }]}>{amount}</ThemedText>

                    <View style={[styles.bankPanel, { backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF', borderColor: isDark ? '#343434' : '#E9DDC0' }]}>
                        <ThemedText style={[styles.bankLabel, { color: isDark ? '#B5B5B5' : '#8A8170' }]}>Deposited to</ThemedText>
                        <ThemedText style={[styles.bankName, { color: theme.text }]}>{bankName ?? 'Verified bank account'}</ThemedText>
                        <ThemedText style={[styles.bankMeta, { color: isDark ? '#D1D1D1' : '#6B7280' }]}>
                            {maskAccountNumber(accountNumber)}
                        </ThemedText>
                    </View>

                    <Pressable style={[styles.button, { backgroundColor: isDark ? '#F4C54E' : '#111827' }]} onPress={onShowDetails}>
                        <ThemedText style={[styles.buttonText, { color: isDark ? '#111111' : '#FFF8E7' }]}>Show Details</ThemedText>
                    </Pressable>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(10, 10, 10, 0.62)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    glow: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 999,
    },
    card: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 28,
        borderWidth: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 24,
        alignItems: 'center',
        overflow: 'hidden',
    },
    iconWrap: {
        width: '100%',
        alignItems: 'flex-start',
    },
    iconChip: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lottie: {
        width: 150,
        height: 150,
        marginBottom: 4,
    },
    eyebrow: {
        fontSize: 13,
        fontFamily: 'GoogleSans_500Medium',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    title: {
        marginTop: 8,
        textAlign: 'center',
        fontSize: 26,
        lineHeight: 32,
        fontFamily: 'GoogleSans_700Bold',
    },
    amount: {
        marginTop: 12,
        fontSize: 32,
        lineHeight: 38,
        fontFamily: 'GoogleSans_700Bold',
    },
    bankPanel: {
        width: '100%',
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginTop: 20,
    },
    bankLabel: {
        fontSize: 12,
        fontFamily: 'GoogleSans_500Medium',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    bankName: {
        marginTop: 8,
        fontSize: 17,
        fontFamily: 'GoogleSans_700Bold',
    },
    bankMeta: {
        marginTop: 4,
        fontSize: 14,
        fontFamily: 'GoogleSans_400Regular',
    },
    button: {
        marginTop: 22,
        width: '100%',
        borderRadius: 999,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
});
