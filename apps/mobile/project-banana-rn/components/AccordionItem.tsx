import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withTiming,
    SharedValue,
} from 'react-native-reanimated';

interface AccordionItemProps {
    isExpanded: SharedValue<boolean>;
    children: React.ReactNode;
    style?: ViewStyle;
    duration?: number;
}

export function AccordionItem({
    isExpanded,
    children,
    style,
    duration = 500,
}: AccordionItemProps) {
    const height = useSharedValue(0);

    const derivedHeight = useDerivedValue(() =>
        withTiming(height.value * Number(isExpanded.value), {
            duration,
        })
    );

    const bodyStyle = useAnimatedStyle(() => ({
        height: derivedHeight.value,
        overflow: 'hidden',
    }));

    return (
        <Animated.View
            style={[bodyStyle, style]}
        >
            <View
                onLayout={(e) => {
                    height.value = e.nativeEvent.layout.height;
                }}
                style={styles.wrapper}
            >
                {children}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        position: 'absolute',
    },
});
