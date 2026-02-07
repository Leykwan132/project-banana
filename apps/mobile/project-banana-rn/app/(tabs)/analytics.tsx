import { useState, useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View, Pressable, RefreshControl, Dimensions, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Share, MessageCircle, Heart, Eye, Wallet } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LineChart, useLineChart } from 'react-native-wagmi-charts';
import Animated, { useAnimatedProps, useSharedValue } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Header } from '@/components/Header';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { TopCampaignListItem } from '@/components/TopCampaignListItem';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// Types
type MetricType = 'views' | 'shares' | 'likes' | 'comments' | 'earnings';

interface GraphDataPoint {
    timestamp: number;
    value: number;
    label: string;
    [key: string]: unknown;
}

interface MetricData {
    value: string;
    total: number;
    data: GraphDataPoint[];
}

// Mock Data Generator
const generateDailyData = (baseValue: number): GraphDataPoint[] => {
    const data: GraphDataPoint[] = [];
    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        const variation = (Math.random() * 0.8) + 0.6;
        data.push({
            timestamp: date.getTime(),
            value: Math.round(baseValue * variation),
            label: dayNames[date.getDay()],
        });
    }
    return data;
};

// Mock Overview Data
const mockOverviewAnalytics = {
    metrics: {
        earnings: {
            value: 'RM 1,250',
            total: 1250,
            data: generateDailyData(45)
        },
        views: {
            value: '850K',
            total: 850000,
            data: generateDailyData(850000)
        },
        shares: {
            value: '1.2K',
            total: 1200,
            data: generateDailyData(40)
        },
        likes: {
            value: '125K',
            total: 125000,
            data: generateDailyData(4200)
        },
        comments: {
            value: '8.5K',
            total: 8500,
            data: generateDailyData(280)
        },
    } as Record<MetricType, MetricData>,
    topCampaigns: [
        { id: '1', name: 'Campaign Name', value: '1.8k', progress: 0.7 },
        { id: '2', name: 'Campaign Name', value: '1.8k', progress: 0.5 },
        { id: '3', name: 'Campaign Name', value: '1.8k', progress: 0.3 },
    ]
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
const GRAPH_WIDTH = SCREEN_WIDTH - 64; // (16 * 2 wrapper) + (16 * 2 container) = 64

export default function AnalyticsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();

    const [selectedMetric, setSelectedMetric] = useState<MetricType>('earnings');
    const [refreshing, setRefreshing] = useState(false);

    const overview = mockOverviewAnalytics;
    const currentMetricData = overview.metrics[selectedMetric];
    const graphColor = '#000';
    const graphData = currentMetricData.data;

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 2000);
    }, []);

    const xLabels = useMemo(() => {
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

    const renderMetricCard = (type: MetricType) => {
        const isSelected = selectedMetric === type;
        const metric = overview.metrics[type];
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
                    {/* Metrics Grid */}
                    <View style={styles.metricsContainer}>
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
                    <View style={styles.graphWrapper}>
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
                                Your top campaigns
                            </ThemedText>
                            <Pressable style={styles.filterButton}>
                                <ThemedText style={styles.filterButtonText}>Share</ThemedText>
                                <ChevronDown size={16} color={Colors[colorScheme ?? 'light'].text} />
                            </Pressable>
                        </View>

                        <View style={styles.campaignList}>
                            {overview.topCampaigns.map((campaign) => (
                                <Pressable
                                    key={campaign.id}
                                    onPress={() => router.push(`/campaign-analytics/${campaign.id}`)}
                                >
                                    <TopCampaignListItem
                                        name={campaign.name}
                                        value={campaign.value}
                                        progress={campaign.progress}
                                    />
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </View>
        </GestureHandlerRootView>
    );
}

// Interactive Components
function InteractiveGraphValue({ totalValue, showCurrency = false }: { totalValue: string, showCurrency?: boolean }) {
    const { currentIndex, isActive, data } = useLineChart();
    const svTotal = useSharedValue(totalValue);

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
    metricsContainer: {
        paddingHorizontal: 16,
        paddingTop: 4,
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
        minHeight: 80,
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
        fontSize: 12,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
        marginBottom: 2,
    },
    cardValue: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
        color: '#000',
    },
    graphWrapper: {
        paddingHorizontal: 16,
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
        gap: 16,
    },
});
