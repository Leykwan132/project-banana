import React, { useState, useCallback, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl, Dimensions, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wallet, ChevronDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LineChart, useLineChart } from 'react-native-wagmi-charts';
import Animated, { useAnimatedProps, useSharedValue } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActionSheetRef } from 'react-native-actions-sheet';

import { Header } from '@/components/Header';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { CampaignsAnalyticItem } from '@/components/CampaignsAnalyticItem';
import { SelectionSheet } from '@/components/SelectionSheet';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);



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

// Campaign data (same as home page)
const mockCampaigns = [
    { id: '2', name: 'Shopee 9.9 Super Sale', companyName: 'Shopee Malaysia', views: '98K', likes: '60K', comments: '320', shares: '1.2K', earnings: 'RM 600', logoUrl: 'https://static.vecteezy.com/system/resources/thumbnails/028/766/353/small/shopee-icon-symbol-free-png.png' },
    { id: '3', name: 'Merdeka Special: Makan Lokal', companyName: 'GrabFood', views: '45K', likes: '24', comments: '150', shares: '890', earnings: 'RM 180', logoUrl: 'https://images.seeklogo.com/logo-png/62/2/grab-logo-png_seeklogo-622162.png' },
    { id: '1', name: 'Zus Coffee: New Frappe Launch', companyName: 'Zus Coffee', views: '125K', likes: '12K', comments: '850', shares: '4.2K', earnings: 'RM 450', logoUrl: 'https://zuscoffee.com/wp-content/uploads/2025/07/app-logo-resize-256x256-1.png' },
    { id: '4', name: 'Watsons K-Beauty Review', companyName: 'Watsons', views: '78K', likes: '9.2K', comments: '540', shares: '9.1K', earnings: 'RM 380', logoUrl: 'https://www.watsonsasia.com/assets/images/logo_watsons_mobile.png' },
];

// Mock Overview Data
const mockOverviewAnalytics = {
    metrics: {
        earnings: {
            value: 'RM 1,250',
            total: 1250,
            data: generateDailyData(45)
        }
    } as Record<string, MetricData>,
    topCampaigns: mockCampaigns
};

const TERMS_MAPPING = {
    earnings: 'Earnings',
};

const ICON_MAPPING = {
    earnings: Wallet,
};

const COLOR_MAPPING = {
    earnings: '#FFD700',
};

const GRAPH_HEIGHT = 120;
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRAPH_WIDTH = SCREEN_WIDTH - 64; // (16 * 2 wrapper) + (16 * 2 container) = 64

export default function AnalyticsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();

    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState<string>('shares');
    const sortSheetRef = useRef<ActionSheetRef>(null);

    const sortOptions = [
        { label: 'Views', value: 'views' },
        { label: 'Likes', value: 'likes' },
        { label: 'Comments', value: 'comments' },
        { label: 'Shares', value: 'shares' },
        { label: 'Earnings', value: 'earnings' },
    ];

    const overview = mockOverviewAnalytics;

    // Sort campaigns based on selected option
    const sortedCampaigns = useMemo(() => {
        const campaigns = [...overview.topCampaigns];

        const parseValue = (value: string): number => {
            // Remove 'K', 'RM', and any spaces, then convert to number
            const cleanValue = value.replace(/[KRM\s]/g, '');
            const numValue = parseFloat(cleanValue);
            // If value had 'K', multiply by 1000
            return value.includes('K') ? numValue * 1000 : numValue;
        };

        campaigns.sort((a, b) => {
            let aValue: number, bValue: number;

            switch (sortBy) {
                case 'views':
                    aValue = parseValue(a.views);
                    bValue = parseValue(b.views);
                    break;
                case 'likes':
                    aValue = parseValue(a.likes);
                    bValue = parseValue(b.likes);
                    break;
                case 'comments':
                    aValue = parseValue(a.comments);
                    bValue = parseValue(b.comments);
                    break;
                case 'shares':
                    aValue = parseValue(a.shares);
                    bValue = parseValue(b.shares);
                    break;
                case 'earnings':
                    aValue = parseValue(a.earnings);
                    bValue = parseValue(b.earnings);
                    break;
                default:
                    return 0;
            }

            // Sort in descending order (highest first)
            return bValue - aValue;
        });

        return campaigns;
    }, [overview.topCampaigns, sortBy]);

    // Hardcode to earnings
    const currentMetricData = overview.metrics.earnings;
    const graphColor = '#FF4500'; // Gold for earnings
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
                                        <Wallet size={16} color="#666" />
                                        <ThemedText style={{ fontSize: 14, color: '#666', fontFamily: 'GoogleSans_500Medium' }}>
                                            Earnings
                                        </ThemedText>
                                    </View>
                                    <InteractiveGraphValue
                                        key="earnings"
                                        totalValue={currentMetricData.value}
                                        showCurrency={true}
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
                                <ChevronDown size={16} color={Colors[colorScheme ?? 'light'].text} />
                            </Pressable>
                        </View>

                        <View style={styles.campaignList}>
                            {sortedCampaigns.map((campaign) => (
                                <Pressable
                                    key={campaign.id}
                                    onPress={() => router.push(`/campaign-analytics/${campaign.id}`)}
                                >
                                    <CampaignsAnalyticItem
                                        name={campaign.name}
                                        companyName={campaign.companyName}
                                        logoUrl={campaign.logoUrl}
                                        views={campaign.views}
                                        likes={campaign.likes}
                                        comments={campaign.comments}
                                        shares={campaign.shares}
                                        earnings={campaign.earnings}
                                    />
                                </Pressable>
                            ))}
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
