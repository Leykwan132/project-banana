import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    LayoutChangeEvent,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';

type BillboardMarqueeBannerProps = {
    message: string;
    backgroundColor: string;
    textColor: string;
    fontFamily?: string;
    style?: StyleProp<ViewStyle>;
};

const TRACK_REPEAT_COUNT = 8;

export function BillboardMarqueeBanner({
    message,
    backgroundColor,
    textColor,
    fontFamily = 'GoogleSans_700Bold',
    style,
}: BillboardMarqueeBannerProps) {
    const translateX = useRef(new Animated.Value(0)).current;
    const [trackWidth, setTrackWidth] = useState(0);

    const trackItems = useMemo(
        () => Array.from({ length: TRACK_REPEAT_COUNT }, (_, index) => ({
            key: `${message}-${index}`,
            label: `${message}   •`,
        })),
        [message]
    );

    useEffect(() => {
        if (trackWidth <= 0) return;

        translateX.setValue(0);

        const duration = Math.max(9000, trackWidth * 18);
        const animation = Animated.loop(
            Animated.timing(translateX, {
                toValue: -trackWidth,
                duration,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );

        animation.start();

        return () => {
            animation.stop();
        };
    }, [trackWidth, translateX]);

    const handleTrackLayout = (event: LayoutChangeEvent) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth > 0 && nextWidth !== trackWidth) {
            setTrackWidth(nextWidth);
        }
    };

    const renderTrack = (withLayout: boolean) => (
            <View onLayout={withLayout ? handleTrackLayout : undefined} style={styles.track}>
            {trackItems.map((item) => (
                <ThemedText
                    key={item.key}
                    numberOfLines={1}
                    style={[
                        styles.message,
                        {
                            color: textColor,
                            fontFamily,
                        },
                    ]}
                >
                    {item.label}
                </ThemedText>
            ))}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor }, style]}>
            <Animated.View
                style={[
                    styles.marquee,
                    {
                        transform: [{ translateX }],
                    },
                ]}
            >
                {renderTrack(true)}
                {renderTrack(false)}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        overflow: 'hidden',
        justifyContent: 'center',
        minHeight: 52,
    },
    marquee: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    track: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        paddingVertical: 16,
        paddingRight: 28,
    },
});
