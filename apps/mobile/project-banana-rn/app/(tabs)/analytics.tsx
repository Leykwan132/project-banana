import React, { useState, useCallback, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl, Dimensions, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wallet, ArrowDownWideNarrow, Eye, ThumbsUp, MessageCircle, Share2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LineChart, useLineChart } from 'react-native-wagmi-charts';
import Animated, { useAnimatedProps, useSharedValue } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActionSheetRef } from 'react-native-actions-sheet';
import { useQuery } from 'convex/react';

import { Header } from '@/components/Header';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { CampaignsAnalyticList } from '@/components/CampaignsAnalyticList';
import { SelectionSheet } from '@/components/SelectionSheet';
import { api } from '../../../../../packages/backend/convex/_generated/api';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);



interface GraphDataPoint {
    timestamp: number;
    value: number;
    label: string;
    [key: string]: unknown;
}

const GRAPH_HEIGHT = 120;
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRAPH_WIDTH = SCREEN_WIDTH - 64; // (16 * 2 wrapper) + (16 * 2 container) = 64

export default function AnalyticsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();

    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState<string>('earnings');
    const sortSheetRef = useRef<ActionSheetRef>(null);

    const sortOptions = [
        { label: 'Views', value: 'views' },
        { label: 'Likes', value: 'likes' },
        { label: 'Comments', value: 'comments' },
        { label: 'Shares', value: 'shares' },
        { label: 'Earnings', value: 'earnings' },
    ];

    const dailyStats = useQuery((api as any).analytics.getCreatorDailyStatsLast30Days) as
        | Array<{ timestamp: number; views: number; likes: number; comments: number; shares: number; earnings: number }>
        | undefined;

    type MetricConfig = {
        color: string;
        icon: React.ReactNode;
        showCurrency: boolean;
        getTotal: () => string;
    };

    const metricConfig: Record<string, MetricConfig> = {
        views: {
            color: '#FF4500',
            icon: <Eye size={16} color="#666" />,
            showCurrency: false,
            getTotal: () => (dailyStats ?? []).reduce((sum, d) => sum + d.views, 0).toLocaleString(),
        },
        likes: {
            color: '#FF4500',
            icon: <ThumbsUp size={16} color="#666" />,
            showCurrency: false,
            getTotal: () => (dailyStats ?? []).reduce((sum, d) => sum + d.likes, 0).toLocaleString(),
        },
        comments: {
            color: '#FF4500',
            icon: <MessageCircle size={16} color="#666" />,
            showCurrency: false,
            getTotal: () => (dailyStats ?? []).reduce((sum, d) => sum + d.comments, 0).toLocaleString(),
        },
        shares: {
            color: '#FF4500',
            icon: <Share2 size={16} color="#666" />,
            showCurrency: false,
            getTotal: () => (dailyStats ?? []).reduce((sum, d) => sum + d.shares, 0).toLocaleString(),
        },
        earnings: {
            color: '#FF4500',
            icon: <Wallet size={16} color="#666" />,
            showCurrency: true,
            getTotal: () => `RM ${(dailyStats ?? []).reduce((sum, d) => sum + d.earnings, 0).toLocaleString()}`,
        },
    };

    const activeMetric = metricConfig[sortBy] ?? metricConfig['earnings'];
    const graphColor = activeMetric.color;
    const selectedMetricLabel = sortOptions.find((opt) => opt.value === sortBy)?.label ?? 'Earnings';
    const graphHeaderLabel = `Total ${selectedMetricLabel}`;

    const mappedGraphData: GraphDataPoint[] = (dailyStats ?? []).map((point) => ({
        timestamp: point.timestamp,
        value: point[sortBy as keyof typeof point] as number,
        label: '',
    }));
    const graphData = mappedGraphData.length > 0 ? mappedGraphData : [{
        timestamp: Date.now(),
        value: 0,
        label: '',
    }];
    const totalLabel = activeMetric.getTotal();

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 2000);
    }, []);

    const xLabels = useMemo(() => {
        if (!graphData.length) return [];

        const count = 3;
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

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View
                style={[
                    styles.container,
                    {
                        backgroundColor: Colors[colorScheme ?? 'light'].screenBackground,
                        paddingTop: insets.top,
                    },
                ]}
            >
                <Header title="Analytics" />
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.contentContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {/* Graph Section */}
                    <View style={styles.graphWrapper}>
                        <View style={styles.graphContainer}>
                            <LineChart.Provider data={graphData}>
                                <View >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                        {activeMetric.icon}
                                        <ThemedText style={{ fontSize: 14, color: '#666', fontFamily: 'GoogleSans_500Medium' }}>
                                            {graphHeaderLabel}
                                        </ThemedText>
                                    </View>
                                    <InteractiveGraphValue
                                        key={sortBy}
                                        totalValue={totalLabel}
                                        showCurrency={activeMetric.showCurrency}
                                    />
                                    <InteractiveGraphDate defaultText="Last 30 Days" />
                                </View>

                                <LineChart height={GRAPH_HEIGHT} width={GRAPH_WIDTH}>
                                    <LineChart.Path color={graphColor} width={1} >
                                        <LineChart.Gradient color={graphColor} />
                                    </LineChart.Path>
                                    <LineChart.CursorCrosshair snapToPoint={true} />
                                    <LineChart.HoverTrap />
                                </LineChart>

                                {/* X-Axis Labels */}
                                <View style={{
                                    width: '100%',
                                    borderTopColor: '#E0E0E0',
                                    borderTopWidth: 1,
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
                    </View>

                    {/* Top Campaigns Section */}
                    <View style={styles.campaignsSection}>
                        <View style={styles.sectionHeader}>
                            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                                My campaigns
                            </ThemedText>
                            <Pressable
                                style={styles.filterButton}
                                onPress={() => sortSheetRef.current?.show()}
                            >
                                <ThemedText style={styles.filterButtonText}>
                                    {sortOptions.find(opt => opt.value === sortBy)?.label}
                                </ThemedText>
                                <ArrowDownWideNarrow size={16} color={Colors[colorScheme ?? 'light'].text} />
                            </Pressable>
                        </View>

                        <View style={styles.campaignList}>
                            <CampaignsAnalyticList sortBy={sortBy} />
                        </View>
                    </View>
                </ScrollView>

                <SelectionSheet
                    actionSheetRef={sortSheetRef}
                    title="Sort by"
                    options={sortOptions}
                    selectedOption={sortBy}
                    onSelect={setSortBy}
                    type="sort"
                />
            </View>
        </GestureHandlerRootView>
    );
}

// Interactive Components
function InteractiveGraphValue({ totalValue, showCurrency = false }: { totalValue: string, showCurrency?: boolean }) {
    const { currentIndex, isActive, data } = useLineChart();
    const svTotal = useSharedValue(totalValue);
    React.useEffect(() => {
        svTotal.value = totalValue;
    }, [svTotal, totalValue]);

    const animatedProps = useAnimatedProps(() => {
        if (!isActive.value || currentIndex.value === -1) {
            return {
                text: svTotal.value
            };
        }
        if (!data || data.length === 0 || currentIndex.value >= data.length) {
            return { text: svTotal.value };
        }

        const item = data[currentIndex.value];
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 24,
    },
    graphWrapper: {
        paddingHorizontal: 16,
        // paddingTop: 16, // Added padding top since metrics are gone
        marginBottom: 24,
    },
    graphContainer: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 16,
        paddingBottom: 0,
    },
    // Campaigns Section
    campaignsSection: {
        paddingHorizontal: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
    },
    filterButtonText: {
        fontSize: 14,
        fontFamily: 'GoogleSans_500Medium',
    },
    campaignList: {
        // gap: 16,
    },
});
