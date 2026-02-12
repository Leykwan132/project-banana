import React, { useMemo, useState } from 'react';
import Animated, { useAnimatedProps, useSharedValue } from 'react-native-reanimated';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, TextInput, Image, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Share, MessageCircle, Heart, Eye, Wallet, Calendar } from 'lucide-react-native';
import { LineChart, useLineChart } from 'react-native-wagmi-charts';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useQuery } from 'convex/react';
import { FontAwesome5 } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { Id } from '../../../../../packages/backend/convex/_generated/dataModel';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type MetricType = 'views' | 'shares' | 'likes' | 'comments' | 'earnings';

type DailyPoint = {
    date: string;
    timestamp: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    earnings: number;
};

const TERMS_MAPPING: Record<MetricType, string> = {
    earnings: 'Earnings',
    views: 'Views',
    shares: 'Shares',
    likes: 'Likes',
    comments: 'Comments',
};

const ICON_MAPPING = {
    earnings: Wallet,
    views: Eye,
    shares: Share,
    likes: Heart,
    comments: MessageCircle,
};

const COLOR_MAPPING: Record<MetricType, string> = {
    earnings: '#FFD700',
    views: '#2196F3',
    shares: '#F44336',
    likes: '#E91E63',
    comments: '#4CAF50',
};

const GRAPH_HEIGHT = 120;
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRAPH_WIDTH = SCREEN_WIDTH - 72;

const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return `${Math.round(value)}`;
};

const formatMetricValue = (metric: MetricType, value: number) =>
    metric === 'earnings' ? `RM ${Math.round(value).toLocaleString()}` : formatNumber(value);

const formatCreatedAt = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString('en-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

export default function ApplicationAnalyticsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [selectedMetric, setSelectedMetric] = useState<MetricType>('earnings');

    const applicationId = (id as Id<'applications'>) || undefined;

    const application = useQuery(
        api.applications.getApplication,
        applicationId ? { applicationId } : 'skip'
    );
    const dailyStats = useQuery(
        api.analytics.getApplicationDailyStatsLast30Days,
        applicationId ? { applicationId } : 'skip'
    ) as DailyPoint[] | undefined;

    const isLoading = application === undefined || dailyStats === undefined;

    if (application === null) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <ThemedText>Application not found</ThemedText>
                <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <ThemedText style={{ color: 'blue' }}>Go Back</ThemedText>
                </Pressable>
            </View>
        );
    }

    const highLevelMetrics: Record<MetricType, number> = {
        earnings: application?.earnings ?? 0,
        views: application?.views ?? 0,
        shares: application?.shares ?? 0,
        likes: application?.likes ?? 0,
        comments: application?.comments ?? 0,
    };

    const graphData = useMemo(() => {
        if (!dailyStats || dailyStats.length === 0) {
            return [{ timestamp: Date.now(), value: 0 }];
        }

        return dailyStats.map((point) => ({
            timestamp: point.timestamp,
            value: point[selectedMetric],
        }));
    }, [dailyStats, selectedMetric]);

    const xLabels = useMemo(() => {
        if (!graphData.length) return [];

        const count = 3;
        const start = graphData[0].timestamp;
        const end = graphData[graphData.length - 1].timestamp;
        const step = (end - start) / (count - 1);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const formatLabel = (value: number) => {
            const date = new Date(value);
            return `${date.getDate()} ${months[date.getMonth()]}`;
        };

        return [
            formatLabel(start),
            formatLabel(start + step),
            formatLabel(end),
        ];
    }, [graphData]);

    const renderMetricCard = (type: MetricType) => {
        const isSelected = selectedMetric === type;
        const Icon = ICON_MAPPING[type];
        const color = COLOR_MAPPING[type];
        const value = formatMetricValue(type, highLevelMetrics[type]);

        return (
            <Pressable
                style={[
                    styles.metricCard,
                    isSelected && styles.selectedCard,
                ]}
                onPress={() => setSelectedMetric(type)}
            >
                <View style={[styles.iconContainer, { backgroundColor: isSelected ? `${color}20` : '#F5F5F5' }]}>
                    <Icon size={16} color={isSelected ? color : '#666'} />
                </View>
                <View>
                    <ThemedText style={styles.cardLabel}>{TERMS_MAPPING[type]}</ThemedText>
                    <ThemedText style={styles.cardValue}>{value}</ThemedText>
                </View>
            </Pressable>
        );
    };

    const handleOpenPostLink = async (url?: string) => {
        if (!url) {
            Alert.alert('Link not available', 'This post link is not available yet.');
            return;
        }

        try {
            await Linking.openURL(url);
        } catch {
            Alert.alert('Unable to open link', 'Please try again later.');
        }
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Stack.Screen options={{ headerShown: false }} />

                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={20} color="#000" />
                    </Pressable>
                    <View style={styles.headerRight}>
                        <Pressable
                            style={[
                                styles.urlIconButton,
                                !application?.ig_post_url && styles.urlIconButtonDisabled,
                            ]}
                            onPress={() => handleOpenPostLink(application?.ig_post_url)}
                        >
                            <FontAwesome5 name="instagram" size={20} color="#000" style={styles.inputIcon} />
                        </Pressable>
                        <Pressable
                            style={[
                                styles.urlIconButton,
                                !application?.tiktok_post_url && styles.urlIconButtonDisabled,
                            ]}
                            onPress={() => handleOpenPostLink(application?.tiktok_post_url)}
                        >
                            <FontAwesome5 name="tiktok" size={20} color="#000" style={styles.inputIcon} />
                        </Pressable>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                    {isLoading ? (
                        <>
                            <View style={styles.skeletonHeader} />
                            <View style={styles.skeletonGraph} />
                            <View style={styles.skeletonRow} />
                            <View style={styles.skeletonRow} />
                        </>
                    ) : (
                        <>
                            <View style={styles.appInfoContainer}>
                                <Image source={require('@/assets/images/bg-onboard.webp')} style={styles.appThumbnail} />
                                <View style={styles.appDetails}>
                                    <ThemedText type="defaultSemiBold" style={styles.appName}>
                                        Application
                                    </ThemedText>
                                    <View style={styles.dateRow}>
                                        <Calendar size={14} color="#6B7280" />
                                        <ThemedText style={styles.appDate}>
                                            {application ? formatCreatedAt(application.created_at) : '-'}
                                        </ThemedText>
                                    </View>
                                </View>
                            </View>

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
                                            totalValue={formatMetricValue(selectedMetric, highLevelMetrics[selectedMetric])}
                                            showCurrency={selectedMetric === 'earnings'}
                                        />
                                        <InteractiveGraphDate defaultText="Last 30 Days" />
                                    </View>

                                    <LineChart height={GRAPH_HEIGHT} width={GRAPH_WIDTH}>
                                        <LineChart.Path color="#FF4500" width={1}>
                                            <LineChart.Gradient color="#FF4500" />
                                        </LineChart.Path>
                                        <LineChart.CursorCrosshair snapToPoint={true} />
                                        <LineChart.HoverTrap />
                                    </LineChart>

                                    <View style={styles.xAxisContainer}>
                                        <View style={styles.xAxisLabels}>
                                            {xLabels.map((label, index) => (
                                                <View
                                                    key={`${label}-${index}`}
                                                    style={[
                                                        styles.xAxisLabelItem,
                                                        index === 0
                                                            ? { alignItems: 'flex-start' }
                                                            : index === xLabels.length - 1
                                                                ? { alignItems: 'flex-end' }
                                                                : { alignItems: 'center' },
                                                    ]}
                                                >
                                                    <View style={styles.xAxisTick} />
                                                    <ThemedText style={styles.xAxisText}>{label}</ThemedText>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                </LineChart.Provider>
                            </View>

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
                        </>
                    )}
                </ScrollView>
            </View>
        </GestureHandlerRootView>
    );
}

function InteractiveGraphValue({ totalValue, showCurrency = false }: { totalValue: string; showCurrency?: boolean }) {
    const { currentIndex, isActive, data } = useLineChart();
    const fallback = useSharedValue(totalValue);

    React.useEffect(() => {
        fallback.value = totalValue;
    }, [fallback, totalValue]);

    const animatedProps = useAnimatedProps(() => {
        if (!isActive.value || currentIndex.value === -1) {
            return { text: fallback.value };
        }

        if (!data || data.length === 0 || currentIndex.value >= data.length) {
            return { text: fallback.value };
        }

        const item = data[currentIndex.value];
        if (!item || item.value == null) {
            return { text: fallback.value };
        }

        const value = Math.round(Number(item.value));
        return { text: showCurrency ? `RM ${value}` : `${value}` };
    });

    return (
        <AnimatedTextInput
            editable={false}
            underlineColorAndroid="transparent"
            style={styles.graphValue}
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
            return { text: defaultText };
        }

        if (!data || data.length === 0 || currentIndex.value >= data.length) {
            return { text: defaultText };
        }

        const item = data[currentIndex.value];
        if (!item) {
            return { text: defaultText };
        }

        const date = new Date(item.timestamp);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return {
            text: `${dayNames[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`,
        };
    });

    return (
        <AnimatedTextInput
            editable={false}
            underlineColorAndroid="transparent"
            style={styles.graphDate}
            // @ts-ignore
            animatedProps={animatedProps}
            defaultValue={defaultText}
        />
    );
}

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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    urlIconButton: {
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    urlIconButtonDisabled: {
        opacity: 0.5,
    },
    inputIcon: {
        width: 24,
        textAlign: 'center',
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    appInfoContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 12,
        alignItems: 'center',
    },
    appThumbnail: {
        width: 60,
        height: 60,
        borderRadius: 8,
        resizeMode: 'cover',
    },
    appDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    appName: {
        fontSize: 20,
        fontFamily: 'GoogleSans_700Bold',
        marginBottom: 6,
    },
    appDate: {
        fontSize: 14,
        color: '#6B7280',
        fontFamily: 'GoogleSans_400Regular',
    },
    graphContainer: {
        backgroundColor: '#F5F5F5',
        marginBottom: 18,
        borderRadius: 12,
        padding: 16,
        paddingBottom: 0,
    },
    graphValue: {
        fontSize: 32,
        fontFamily: 'GoogleSans_700Bold',
        color: '#000',
    },
    graphDate: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
        marginTop: 4,
    },
    xAxisContainer: {
        width: '100%',
        borderTopColor: '#E0E0E0',
        borderTopWidth: 1,
        marginBottom: 12,
    },
    xAxisLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    xAxisLabelItem: {
        flexDirection: 'column',
    },
    xAxisTick: {
        width: 1,
        height: 4,
        borderLeftColor: '#E0E0E0',
        borderLeftWidth: 1,
        marginBottom: 4,
    },
    xAxisText: {
        fontSize: 10,
        color: '#999',
        fontFamily: 'GoogleSans_400Regular',
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
    skeletonHeader: {
        width: '100%',
        height: 60,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        marginBottom: 16,
    },
    skeletonGraph: {
        width: '100%',
        height: 240,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        marginBottom: 16,
    },
    skeletonRow: {
        width: '100%',
        height: 88,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        marginBottom: 8,
    },
});
