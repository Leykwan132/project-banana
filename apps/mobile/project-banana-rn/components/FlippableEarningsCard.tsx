import React from 'react';
import { StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { ThemedText } from '@/components/themed-text';

interface FlippableEarningsCardProps {
    /**
     * Element to render on the front of the card.
     * Often a text node describing earnings, e.g. "Your post has made Rm 50"
     */
    frontContent: React.ReactNode;

    /**
     * Element to render on the back of the card.
     */
    backContent: React.ReactNode;

    /**
     * Optional style override for the container
     */
    style?: ViewStyle;
}

export function FlippableEarningsCard({ frontContent, backContent, style }: FlippableEarningsCardProps) {
    const flipProgress = useSharedValue(0);

    const toggleCardFlip = () => {
        flipProgress.value = withTiming(flipProgress.value === 0 ? 1 : 0, { duration: 400 });
    };

    const frontCardStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(flipProgress.value, [0, 1], [0, 180], Extrapolation.CLAMP);
        return {
            transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
            backfaceVisibility: 'hidden' as const,
        };
    });

    const backCardStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(flipProgress.value, [0, 1], [180, 360], Extrapolation.CLAMP);
        return {
            transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
            backfaceVisibility: 'hidden' as const,
        };
    });

    return (
        <Pressable onPress={toggleCardFlip} style={[styles.flipCardContainer, style]}>
            {/* Front Side: Winner (White) */}
            <Animated.View style={[styles.cardBase, styles.winnerCard, frontCardStyle]}>
                <LottieView
                    source={require('../assets/lotties/wallet.json')}
                    autoPlay
                    loop
                    style={styles.walletAnimation}
                />
                <ThemedText style={styles.earningsText}>
                    {frontContent}
                </ThemedText>
            </Animated.View>

            {/* Back Side: Earnings (Dark) */}
            <Animated.View style={[styles.cardBase, styles.earningsCard, backCardStyle]}>
                <LottieView
                    source={require('../assets/lotties/winner.json')}
                    autoPlay
                    style={styles.winnerAnimation}
                />
                <ThemedText style={styles.topEarnerText}>{backContent}</ThemedText>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    flipCardContainer: {
        height: 240,
    },
    cardBase: {
        height: 240,
        borderRadius: 20,
        padding: 24,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        backfaceVisibility: 'hidden',
    },
    winnerCard: {
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    earningsCard: {
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    winnerAnimation: {
        width: 120,
        height: 120,
        transform: [{ scale: 1.5 }],
    },
    walletAnimation: {
        width: 120,
        height: 120,
        transform: [{ scale: 1.3 }],
    },
    topEarnerText: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
        textAlign: 'center',
        color: '#FFF',
    },
    topEarnerHighlight: {
        color: '#FFD700', // Gold color
        fontSize: 22,
    },
    earningsText: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
        textAlign: 'center',
        color: '#FFF',
    },
});
