import React, { useState, useCallback, useMemo } from 'react';
import Animated, { useAnimatedProps, useDerivedValue, useSharedValue, withTiming, runOnJS, SharedValue, useAnimatedReaction, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Share, MessageCircle, Heart, Eye, Wallet } from 'lucide-react-native';
import { LineChart, useLineChart } from 'react-native-wagmi-charts';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemedText } from '@/components/themed-text';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// Types for our mock data
type MetricType = 'views' | 'shares' | 'likes' | 'comments' | 'earnings';

interface GraphDataPoint {
    timestamp: number; // wagmi-charts expects 'timestamp'
    value: number; // wagmi-charts expects 'value'
    label: string;
    [key: string]: unknown;
}

interface MetricData {
    value: string;
    total: number;
    data: GraphDataPoint[];
}

// Mock Data Generator (30 days daily data)
const generateDailyData = (baseValue: number): GraphDataPoint[] => {
    const data: GraphDataPoint[] = [];
    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // Random walk
        const variation = (Math.random() * 0.8) + 0.6;
        data.push({
            timestamp: date.getTime(),
            value: Math.round(baseValue * variation),
            label: dayNames[date.getDay()],
        });
    }
    return data;
};


const mockApplicationAnalytics = {
    id: '1',
    name: 'Application 1',
    image: 'https://placeholder.com/150',
    startDate: '15/11/2025',
    status: 'Top 20% performer',
    metrics: {
        earnings: {
            value: 'RM 250',
            total: 250,
            data: generateDailyData(12) // Avg ~8-15/day
        },
        views: {
            value: '250K',
            total: 250000,
            data: generateDailyData(250000)
        },
        shares: {
            value: '333',
            total: 333,
            data: generateDailyData(10)
        },
        likes: {
            value: '45K',
            total: 45000,
            data: generateDailyData(1500)
        },
        comments: {
            value: '340K',
            total: 340000,
            data: generateDailyData(11000)
        },
    } as Record<MetricType, MetricData>
};

const TERMS_MAPPING = {
    earnings: 'Earnings',
    views: 'Views',
    shares: 'Shares',
    likes: 'Likes',
    comments: 'Comments'
};

const ICON_MAPPING = {
    earnings: Wallet,
    views: Eye,
    shares: Share,
    likes: Heart,
    comments: MessageCircle
};

const COLOR_MAPPING = {
    earnings: '#FFD700',
    views: '#2196F3',
    shares: '#F44336',
    likes: '#E91E63',
    comments: '#4CAF50'
};

const GRAPH_HEIGHT = 120;
const SCREEN_WIDTH = Dimensions.get('window').width;
// Screen Padding (20 * 2) + Container Padding (16 * 2) = 72
const GRAPH_WIDTH = SCREEN_WIDTH - 72;

export default function ApplicationAnalyticsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';

    // State
    const [selectedMetric, setSelectedMetric] = useState<MetricType>('earnings');

    const application = mockApplicationAnalytics;
    const currentMetricData = application.metrics[selectedMetric];
    const graphColor = '#000'; // IOS System Purple-ish Blue matching reference
    const graphData = currentMetricData.data;

    // Formatting functions for wagmi-charts
    const formatCurrency = (value: string) => {
        'worklet';
        return value; // It already comes as a formatted string in current setup, but PriceText usually expects numbers to format. 
        // Actually PriceText formats raw numbers. Let's just return raw string if we can, or better let PriceText handle it.
        // Wait, PriceText format callback receives { value, formatted }.
        // We will customize via format prop.
    };

    const formatDate = ({ value }: { value: number }) => {
        'worklet';
        const date = new Date(value);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${dayNames[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
    };

    const xLabels = useMemo(() => {
        const count = 3; // Number of labels to generate
        const start = graphData[0].timestamp;
        const end = graphData[graphData.length - 1].timestamp;
        const step = (end - start) / (count - 1);
        const labels = [];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const formatLabel = (value: number) => {
            const d = new Date(value);
            return `${d.getDate()} ${months[d.getMonth()]}`;
        };

        for (let i = 0; i < count - 1; i++) {
            labels.push(formatLabel(start + step * i));
        }

        labels.push(formatLabel(end));
        return labels;
    }, [graphData]);

    const renderMetricCard = (type: MetricType) => {
        const isSelected = selectedMetric === type;
        const metric = application.metrics[type];
        const Icon = ICON_MAPPING[type];
        const color = COLOR_MAPPING[type];

        return (
            <Pressable
                style={[
                    styles.metricCard,
                    isSelected && styles.selectedCard
                ]}
                onPress={() => setSelectedMetric(type)}
            >
                <View style={[styles.iconContainer, { backgroundColor: isSelected ? color + '20' : '#F5F5F5' }]}>
                    <Icon size={16} color={isSelected ? color : '#666'} />
                </View>
                <View>
                    <ThemedText style={styles.cardLabel}>{TERMS_MAPPING[type]}</ThemedText>
                    <ThemedText style={styles.cardValue}>{metric.value}</ThemedText>
                </View>
            </Pressable>
        );
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Stack.Screen options={{ headerShown: false }} />

                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={20} color="#000" />
                    </Pressable>
                    <View style={styles.headerRight}>
                        <FlowerIcon />
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Application Info */}
                    <View style={styles.appInfoContainer}>
                        <View style={styles.appThumbnail} />
                        <View style={styles.appDetails}>
                            <View style={styles.appTitleRow}>
                                <ThemedText style={styles.appName}>{application.name}</ThemedText>
                                <ArrowLeft size={16} color="#000" style={{ transform: [{ rotate: '135deg' }] }} />
                            </View>
                            <ThemedText style={styles.appDate}>Earning since {application.startDate}</ThemedText>
                        </View>
                    </View>

                    {/* Metrics Grid */}
                    <View style={styles.metricsGrid}>
                        <View style={styles.gridRow}>
                            {renderMetricCard('earnings')}
                        </View>
                        <View style={styles.gridRow}>
                            {renderMetricCard('views')}
                            {renderMetricCard('shares')}
                        </View>
                        <View style={styles.gridRow}>
                            {renderMetricCard('likes')}
                            {renderMetricCard('comments')}
                        </View>
                    </View>

                    {/* Graph Section */}
                    <View style={styles.graphContainer}>
                        <LineChart.Provider data={graphData}>
                            <View style={{ marginBottom: 20 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    {(() => {
                                        const Icon = ICON_MAPPING[selectedMetric];
                                        return <Icon size={16} color="#666" />;
                                    })()}
                                    <ThemedText style={{ fontSize: 14, color: '#666', fontFamily: 'GoogleSans_500Medium' }}>
                                        {TERMS_MAPPING[selectedMetric]}
                                    </ThemedText>
                                </View>
                                <InteractiveGraphValue
                                    key={selectedMetric}
                                    totalValue={currentMetricData.value}
                                    showCurrency={selectedMetric === 'earnings'}
                                />
                                <InteractiveGraphDate defaultText="Last 30 Days" />
                            </View>


                            {/* Sticky Header with Date and Price */}
                            {/* <View style={styles.graphHeader}>
                                <View style={localStyles.graphTitleContainer}>
                                    <StickyDateText format={formatDate} />
                                </View>
                                <View style={localStyles.scrubValueContainer}>
                                    <StickyPriceText format={({ value }) => `${Math.round(parseFloat(value))}`} />
                                </View>
                            </View> */}

                            <LineChart height={GRAPH_HEIGHT} width={GRAPH_WIDTH}>
                                <LineChart.Path color={graphColor} width={1} >
                                    <LineChart.Gradient color={graphColor} />
                                </LineChart.Path>
                                {/* <LineChart.Axis position="bottom" ... /> */}
                                <LineChart.CursorCrosshair snapToPoint={true} />
                                {/* <LineChart.CursorLine /> */}
                                <LineChart.HoverTrap />

                                {/* <LineChart.CursorLine /> */}

                                {/* <LineChart.CursorLine /> */}
                                {/* <LineChart.CursorCrosshair snapToPoint={true}>
                                    <LineChart.Tooltip />


                                </LineChart.CursorCrosshair> */}
                                {/* <LineChart.PriceText /> */}
                                {/* <LineChart.DatetimeText /> */}

                            </LineChart>

                            {/* X-Axis Labels */}
                            <View style={{
                                width: '100%',
                                borderTopColor: '#E0E0E0',
                                borderTopWidth: 1,
                                // marginTop: 12,
                                marginBottom: 12,

                            }}>
                                <View style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                }}>
                                    {xLabels.map((label, index) => (
                                        <View key={index} style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: index === 0 ? 'flex-start' : (index === xLabels.length - 1) ? 'flex-end' : 'center',
                                        }}>
                                            <View style={{
                                                width: 1,
                                                height: 4,
                                                borderLeftColor: '#E0E0E0',
                                                borderLeftWidth: 1,
                                                marginBottom: 4,
                                            }}></View>
                                            <ThemedText style={{ fontSize: 10, color: '#999', fontFamily: 'GoogleSans_400Regular' }}>{label}</ThemedText>
                                        </View>
                                    ))}
                                </View>
                            </View>


                        </LineChart.Provider>
                    </View>



                </ScrollView>
            </View >
        </GestureHandlerRootView >
    );
}

// Sticky Components

// Interactive Components
function InteractiveGraphValue({ totalValue, showCurrency = false }: { totalValue: string, showCurrency?: boolean }) {
    const { currentIndex, isActive, data } = useLineChart();
    const svTotal = useSharedValue(totalValue);

    React.useEffect(() => {
        svTotal.value = totalValue;
    }, [totalValue]);

    const animatedProps = useAnimatedProps(() => {
        if (!isActive.value || currentIndex.value === -1) {
            return {
                text: svTotal.value
            };
        }
        // Check if data is available
        if (!data || data.length === 0 || currentIndex.value >= data.length) {
            return { text: svTotal.value };
        }

        const item = data[currentIndex.value];
        // Safely access value
        if (item && item.value != null) {
            const val = Math.round(Number(item.value));
            return {
                text: showCurrency ? `RM ${val}` : `${val}`
            };
        }
        return { text: svTotal.value };
    });

    return (
        <AnimatedTextInput
            editable={false}
            underlineColorAndroid="transparent"
            style={{ fontSize: 32, fontFamily: 'GoogleSans_700Bold', color: '#000' }}
            // @ts-ignore
            animatedProps={animatedProps}
            defaultValue={totalValue}
        />
    );
}

function InteractiveGraphDate({ defaultText }: { defaultText: string }) {
    const { currentIndex, isActive, data } = useLineChart();

    const animatedProps = useAnimatedProps(() => {
        if (!isActive.value || currentIndex.value === -1) {
            return {
                text: defaultText
            };
        }
        // Check if data is available
        if (!data || data.length === 0 || currentIndex.value >= data.length) {
            return { text: defaultText };
        }

        const item = data[currentIndex.value];
        if (!item) return { text: defaultText };

        const date = new Date(item.timestamp);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dateStr = `${dayNames[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;

        return {
            text: dateStr
        };
    });

    return (
        <AnimatedTextInput
            editable={false}
            underlineColorAndroid="transparent"
            style={{ fontSize: 14, color: '#666', fontFamily: 'GoogleSans_400Regular', marginTop: 4 }}
            // @ts-ignore
            animatedProps={animatedProps}
            defaultValue={defaultText}
        />
    );
}

// Simple Flower Icon Component for Header
function FlowerIcon() {
    return (
        <View style={localStyles.flowerIcon}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#000', position: 'absolute' }} />
            {[0, 45, 90, 135].map((deg) => (
                <View key={deg} style={{
                    width: 20, height: 6, borderRadius: 3, borderWidth: 1, borderColor: '#000',
                    position: 'absolute', transform: [{ rotate: `${deg}deg` }]
                }} />
            ))}
        </View>
    );
}

const localStyles = StyleSheet.create({
    graphTitleContainer: {
        height: 20, // fixed height to prevent jumps
        justifyContent: 'center',
    },
    graphTitle: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'GoogleSans_500Medium',
    },
    scrubValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 24, // fixed height
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    scrubValue: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
        color: '#000',
    },
    stickyCursorWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 20,
        height: 20,
        // center via transform
    },
    flowerIcon: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRight: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    appInfoContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 12,
    },
    appThumbnail: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#E0E0E0',
    },
    appDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    appTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    appName: {
        fontSize: 20,
        fontFamily: 'GoogleSans_700Bold',
    },
    appDate: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
        marginBottom: 8,
    },
    statusBadge: {
        backgroundColor: '#FFD700', // Gold/Yellow matches screenshot
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'GoogleSans_500Medium',
        color: '#000',
    },
    metricsGrid: {
        gap: 8,
        marginBottom: 16,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 8,
    },
    metricCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        minHeight: 80, // Reduced from 120
        justifyContent: 'space-between',
    },
    selectedCard: {
        borderColor: '#000000',
        borderWidth: 1.5,
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    cardLabel: {
        fontSize: 12, // Reduced from 14
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
        marginBottom: 2,
    },
    cardValue: {
        fontSize: 18, // Reduced from 24
        fontFamily: 'GoogleSans_700Bold',
        color: '#000',
    },
    graphContainer: {
        // height: GRAPH_HEIGHT + 60, // wagmi specific height management
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 16,
        paddingBottom: 0, // Curve touches bottom often in designs
    },
    graphHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        height: 24,
        paddingHorizontal: 0,
    },
});
