import React, { useState, useCallback, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl, Pressable, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wallet, ArrowDownWideNarrow, Eye, ThumbsUp, MessageCircle, Share2 } from 'lucide-react-native';
import { LineChart } from 'react-native-wagmi-charts';
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

interface GraphDataPoint {
    timestamp: number;
    value: number;
    label: string;
    [key: string]: unknown;
}

const GRAPH_HEIGHT = 120;

export default function AnalyticsScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();
    const { width: viewportWidth } = useWindowDimensions();
    const screenBackgroundColor = isDark ? theme.screenBackground : '#F4F3EE';
    const panelBackgroundColor = isDark ? '#171717' : '#FBFAF7';
    const panelBorderColor = isDark ? '#303030' : '#E4DED2';
    const dividerColor = isDark ? '#2A2A2A' : '#E7E2D8';
    const filterBackgroundColor = isDark ? '#141414' : '#F7F4ED';

    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState<string>('earnings');
    const [activeGraphIndex, setActiveGraphIndex] = useState(-1);
    const sortSheetRef = useRef<ActionSheetRef>(null);

    const sortOptions = [
        { label: 'Views', value: 'views' },
        { label: 'Likes', value: 'likes' },
        { label: 'Comments', value: 'comments' },
        { label: 'Shares', value: 'shares' },
        { label: 'Earnings', value: 'earnings' },
    ];

    const liveDailyStats = useQuery((api as any).analytics.getCreatorDailyStatsLast30Days) as
        | { timestamp: number; views: number; likes: number; comments: number; shares: number; earnings: number }[]
        | undefined;
    const dailyStats = liveDailyStats;

    type MetricConfig = {
        color: string;
        icon: React.ReactNode;
        showCurrency: boolean;
        getTotal: () => string;
    };

    const metricConfig: Record<string, MetricConfig> = {
        views: {
            color: '#FF4500',
            icon: <Eye size={16} color={isDark ? '#A3A3A3' : '#666'} />,
            showCurrency: false,
            getTotal: () => (dailyStats ?? []).reduce((sum, d) => sum + d.views, 0).toLocaleString(),
        },
        likes: {
            color: '#FF4500',
            icon: <ThumbsUp size={16} color={isDark ? '#A3A3A3' : '#666'} />,
            showCurrency: false,
            getTotal: () => (dailyStats ?? []).reduce((sum, d) => sum + d.likes, 0).toLocaleString(),
        },
        comments: {
            color: '#FF4500',
            icon: <MessageCircle size={16} color={isDark ? '#A3A3A3' : '#666'} />,
            showCurrency: false,
            getTotal: () => (dailyStats ?? []).reduce((sum, d) => sum + d.comments, 0).toLocaleString(),
        },
        shares: {
            color: '#FF4500',
            icon: <Share2 size={16} color={isDark ? '#A3A3A3' : '#666'} />,
            showCurrency: false,
            getTotal: () => (dailyStats ?? []).reduce((sum, d) => sum + d.shares, 0).toLocaleString(),
        },
        earnings: {
            color: '#FF4500',
            icon: <Wallet size={16} color={isDark ? '#A3A3A3' : '#666'} />,
            showCurrency: true,
            getTotal: () => `RM ${(dailyStats ?? []).reduce((sum, d) => sum + d.earnings, 0).toLocaleString()}`,
        },
    };

    const activeMetric = metricConfig[sortBy] ?? metricConfig['earnings'];
    const graphColor = activeMetric.color;
    const selectedMetricLabel = sortOptions.find((opt) => opt.value === sortBy)?.label ?? 'Earnings';
    const graphHeaderLabel = `Total ${selectedMetricLabel}`;
    const graphWidth = Math.max(viewportWidth - 64, 0);

    const graphData = useMemo<GraphDataPoint[]>(() => {
        const mappedGraphData = (dailyStats ?? []).map((point) => ({
            timestamp: point.timestamp,
            value: point[sortBy as keyof typeof point] as number,
            label: '',
        }));

        return mappedGraphData.length > 0
            ? mappedGraphData
            : [{
                timestamp: Date.now(),
                value: 0,
                label: '',
            }];
    }, [dailyStats, sortBy]);
    const graphYRange = useMemo(() => {
        if (Platform.OS !== 'android') {
            return undefined;
        }

        const maxValue = graphData.reduce((highest, point) => Math.max(highest, Number(point.value) || 0), 0);
        return {
            min: 0,
            max: maxValue > 0 ? maxValue * 1.5 : 1,
        };
    }, [graphData]);
    const totalLabel = activeMetric.getTotal();
    const activeGraphValueLabel = useMemo(() => {
        if (activeGraphIndex < 0 || activeGraphIndex >= graphData.length) {
            return totalLabel;
        }

        const currentValue = Math.round(Number(graphData[activeGraphIndex]?.value ?? 0));
        return activeMetric.showCurrency ? `RM ${currentValue}` : `${currentValue}`;
    }, [activeGraphIndex, activeMetric.showCurrency, graphData, totalLabel]);
    const activeGraphDateLabel = useMemo(() => {
        if (activeGraphIndex < 0 || activeGraphIndex >= graphData.length) {
            return 'Last 30 Days';
        }

        const item = graphData[activeGraphIndex];
        if (!item) {
            return 'Last 30 Days';
        }

        const date = new Date(item.timestamp);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${dayNames[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
    }, [activeGraphIndex, graphData]);

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
                        backgroundColor: screenBackgroundColor,
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
                        <View style={[styles.graphContainer, { backgroundColor: panelBackgroundColor, borderColor: panelBorderColor }]}>
                            <LineChart.Provider
                                data={graphData}
                                yRange={graphYRange}
                                onCurrentIndexChange={setActiveGraphIndex}
                            >
                                <View >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                        {activeMetric.icon}
                                        <ThemedText type='defaultSemiBold' style={{ fontSize: 14, color: isDark ? '#A3A3A3' : '#666', fontFamily: 'GoogleSans_500Medium' }}>
                                            {graphHeaderLabel}
                                        </ThemedText>
                                    </View>
                                    <View>
                                        <ThemedText
                                            style={{
                                                fontSize: 32,
                                                lineHeight: 40,
                                                fontFamily: 'GoogleSans_700Bold',
                                                color: theme.text,
                                                includeFontPadding: Platform.OS === 'android',
                                            }}
                                        >
                                            {activeGraphValueLabel}
                                        </ThemedText>
                                        <ThemedText style={{ fontSize: 14, color: isDark ? '#A3A3A3' : '#666', fontFamily: 'GoogleSans_400Regular', marginTop: 6 }}>
                                            {activeGraphDateLabel}
                                        </ThemedText>
                                    </View>
                                </View>

                                <LineChart height={GRAPH_HEIGHT} width={graphWidth}>
                                    <LineChart.Path color={graphColor} width={1} >
                                        <LineChart.Gradient color={graphColor} />
                                    </LineChart.Path>
                                    <LineChart.CursorCrosshair snapToPoint={true} />
                                    <LineChart.HoverTrap />
                                </LineChart>

                                {/* X-Axis Labels */}
                                <View style={{
                                    width: '100%',
                                    borderTopColor: dividerColor,
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
                                                    borderLeftColor: dividerColor,
                                                    borderLeftWidth: 1,
                                                    marginBottom: 4,
                                                }}></View>
                                                <ThemedText style={{ fontSize: 10, color: isDark ? '#7A7A7A' : '#999', fontFamily: 'GoogleSans_400Regular' }}>{label}</ThemedText>
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
                                style={[
                                    styles.filterButton,
                                    { backgroundColor: filterBackgroundColor, borderColor: panelBorderColor },
                                    sortBy && { backgroundColor: Colors[colorScheme ?? 'light'].text, borderColor: Colors[colorScheme ?? 'light'].text }
                                ]}
                                onPress={() => sortSheetRef.current?.show()}
                            >
                                <ThemedText style={[
                                    styles.filterButtonText,
                                    sortBy && { color: Colors[colorScheme ?? 'light'].background }
                                ]}>
                                    {sortOptions.find((opt) => opt.value === sortBy)?.label}
                                </ThemedText>
                                <ArrowDownWideNarrow size={16} color={sortBy ? Colors[colorScheme ?? 'light'].background : Colors[colorScheme ?? 'light'].text} />
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
        borderWidth: 1,
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
    },
    filterButtonText: {
        fontSize: 14,
        fontFamily: 'GoogleSans_500Medium',
    },
    campaignList: {
        // gap: 16,
    },
});
