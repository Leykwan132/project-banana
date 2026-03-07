import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Canvas, Path, Skia, Group } from '@shopify/react-native-skia';
import {
    useSharedValue,
    useDerivedValue,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';

export interface LoadingIndicatorProps {
    size?: number | 'small' | 'large';
    color?: string;
    style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
}

export const LoadingIndicator = ({
    size = 'small',
    color = '#8E919B',
    style,
}: LoadingIndicatorProps) => {
    const numericSize = size === 'small' ? 20 : size === 'large' ? 36 : typeof size === 'number' ? size : 24;
    const strokeWidth = numericSize * 0.15;
    const radius = (numericSize - strokeWidth) / 2;
    const cx = numericSize / 2;
    const cy = numericSize / 2;

    const path = Skia.Path.Make();
    path.addCircle(cx, cy, radius);

    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(
            withTiming(1, { duration: 1000, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const transform = useDerivedValue(() => {
        return [{ rotate: progress.value * 2 * Math.PI }];
    });

    const getTrackColor = (baseColor: string) => {
        if (baseColor.toUpperCase() === '#FFFFFF' || baseColor.toUpperCase() === '#FFF') {
            return 'rgba(255, 255, 255, 0.3)';
        }
        if (baseColor.toUpperCase() === '#000000' || baseColor.toUpperCase() === '#000') {
            return 'rgba(0, 0, 0, 0.1)';
        }
        return baseColor + '40'; // Simple alpha append for hex colors as fallback
    };

    const trackColor = getTrackColor(color);

    return (
        <View style={[{ width: numericSize, height: numericSize, justifyContent: 'center', alignItems: 'center' }, style]}>
            <Canvas style={{ width: numericSize, height: numericSize }}>
                <Path
                    path={path}
                    color={trackColor}
                    style="stroke"
                    strokeWidth={strokeWidth}
                />
                <Group origin={{ x: cx, y: cy }} transform={transform}>
                    <Path
                        path={path}
                        color={color}
                        style="stroke"
                        strokeWidth={strokeWidth}
                        strokeCap="round"
                        start={0}
                        end={0.25}
                    />
                </Group>
            </Canvas>
        </View>
    );
};
