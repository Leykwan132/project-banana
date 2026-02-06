import React, { useEffect } from 'react';
import { StyleSheet, Image, Pressable, Platform, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    runOnJS
} from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { Timeline, View, Text, Assets } from 'react-native-ui-lib';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SuccessCardProps {
    visible: boolean;
    onViewApplication: () => void;
    onDismiss: () => void;
    imageSource?: any;
    title?: string;
    description?: string;
}

export function SuccessCard({
    visible,
    onViewApplication,
    onDismiss,
    imageSource,
    title = "Book Your Spot Today!",
    description,
}: SuccessCardProps) {
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            opacity.value = withTiming(1, { duration: 400 });
            translateY.value = withTiming(0, {
                duration: 400,
                easing: Easing.out(Easing.cubic),
            });
        } else {
            opacity.value = withTiming(0, { duration: 300 });
            translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    const backdropStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
        };
    });

    if (!visible && opacity.value === 0) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, backdropStyle]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
            </Animated.View>

            {/* Card */}
            <View style={styles.cardContainer}>
                <Animated.View style={[styles.card, animatedStyle]}>
                    <View style={styles.topContent}>
                        <ThemedText style={styles.title}>{title}</ThemedText>
                        {description && (
                            <ThemedText style={styles.description}>{description}</ThemedText>
                        )}
                    </View>

                    <View style={styles.timelineContainer}>
                        <Timeline
                            bottomLine={{ type: Timeline.lineTypes.DASHED, color: '#E0E0E0' }}
                            point={{
                                icon: Assets.internal.icons.checkSmall,
                                state: Timeline.states.SUCCESS,
                            }}
                        >
                            <View padding-16 br30 style={{ backgroundColor: '#F9F9F9' }}>
                                <Text text70BO>Application Created</Text>
                            </View>
                        </Timeline>
                        <Timeline
                            topLine={{ type: Timeline.lineTypes.DASHED, color: '#E0E0E0' }}
                            bottomLine={{ type: Timeline.lineTypes.DASHED, color: '#E0E0E0' }}
                            point={{ type: Timeline.pointTypes.CIRCLE, color: '#E0E0E0' }}
                        >
                            <View padding-16 br30 style={{ backgroundColor: '#F9F9F9' }}>
                                <Text text70BO color="#666">Submit Video</Text>
                            </View>
                        </Timeline>
                        <Timeline
                            topLine={{ type: Timeline.lineTypes.DASHED, color: '#E0E0E0' }}
                            bottomLine={{ type: Timeline.lineTypes.DASHED, color: '#E0E0E0' }}
                            point={{ type: Timeline.pointTypes.CIRCLE, color: '#E0E0E0' }}
                        >
                            <View padding-16 br30 style={{ backgroundColor: '#F9F9F9' }}>
                                <Text text70BO color="#666">Business Approval</Text>
                            </View>
                        </Timeline>
                        <Timeline
                            topLine={{ type: Timeline.lineTypes.DASHED, color: '#E0E0E0' }}
                            point={{ type: Timeline.pointTypes.CIRCLE, color: '#E0E0E0' }}
                        >
                            <View padding-16 br30 style={{ backgroundColor: '#F9F9F9' }}>
                                <Text text70BO color="#666">Post and Start Earning!</Text>
                            </View>
                        </Timeline>
                    </View>

                    <View style={styles.bottomActions}>
                        <Pressable style={styles.viewButton} onPress={onViewApplication}>
                            <ThemedText style={styles.viewButtonText}>View Application</ThemedText>
                        </Pressable>

                        <Pressable style={styles.dismissButton} onPress={onDismiss}>
                            <ThemedText style={styles.dismissText}>Dismiss</ThemedText>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 999,
    },
    cardContainer: {
        flex: 1,
        justifyContent: 'flex-end', // Align to bottom
        alignItems: 'center',
        zIndex: 1000,
        paddingBottom: 34, // Add some bottom spacing
        pointerEvents: 'box-none',
    },
    card: {
        width: "90%",
        gap: 32,
        marginHorizontal: 40,
        // height: '90%', // Top gap like Apple sheets
        paddingTop: 32,
        backgroundColor: '#fff',
        borderRadius: 32, // Larger radius
        overflow: 'hidden',
        shadowColor: "#000",
        justifyContent: 'center',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    imageContainer: {
        height: '50%',
        width: '100%',
        backgroundColor: '#f0f0f0',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    topContent: {
        padding: 24,
        paddingBottom: 0,
        alignItems: 'center',
    },
    timelineContainer: {
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    bottomActions: {
        padding: 24,
        paddingTop: 0,
        width: '100%',
        alignItems: 'center',
        gap: 12,
    },
    title: {
        fontSize: 24,
        fontFamily: 'GoogleSans_700Bold',
        textAlign: 'center',
        color: '#000',
        marginBottom: 8,
    },
    description: {
        textAlign: 'center',
        color: '#666',
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
        lineHeight: 22,
    },
    viewButton: {
        backgroundColor: '#000000', // Black as per requirement
        paddingVertical: 16,
        width: '100%',
        borderRadius: 30, // Pill shape
        alignItems: 'center',
    },
    viewButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    dismissButton: {
        paddingVertical: 8,
    },
    dismissText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_500Medium',
    },
});
