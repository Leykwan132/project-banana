import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import LottieView from 'lottie-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '../../../../packages/backend/convex/_generated/api';
import { Id } from '../../../../packages/backend/convex/_generated/dataModel';
import { navigateFromNotification } from '@/lib/notificationRedirect';

interface NotificationItem {
    _id: Id<"notifications">;
    title: string;
    description: string;
    is_read: boolean;
    _creationTime: number;
    data?: Record<string, unknown>;
    redirect_type?: string;
    redirect_id?: string;
}

const NotificationSkeleton = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const skeletonBg = isDark ? '#1A1A1A' : '#FBFAF7';
    const skeletonBorderColor = isDark ? '#2F2F2F' : '#E4DED2';
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 800 }),
                withTiming(0.3, { duration: 800 })
            ),
            -1,
            true
        );
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <View style={styles.skeletonContainer}>
            <Animated.View style={[styles.skeletonIcon, animatedStyle, { backgroundColor: skeletonBg, borderColor: skeletonBorderColor }]} />
            <View style={styles.skeletonContent}>
                <Animated.View style={[styles.skeletonTitle, animatedStyle, { backgroundColor: skeletonBg }]} />
                <Animated.View style={[styles.skeletonDesc, animatedStyle, { backgroundColor: skeletonBg }]} />
            </View>
        </View>
    );
};

export default function NotificationsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const screenBackgroundColor = isDark ? theme.screenBackground : '#F4F3EE';
    const controlBackgroundColor = isDark ? '#141414' : '#F7F4ED';
    const borderColor = isDark ? '#303030' : '#E4DED2';
    const dividerColor = isDark ? '#2A2A2A' : '#E7E2D8';
    const mutedTextColor = isDark ? '#A3A3A3' : '#666666';
    const secondaryTextColor = isDark ? '#8A8A8A' : '#7A7266';
    const unreadIconBackgroundColor = isDark ? '#C28A10' : '#F3C55A';
    const readIconColor = isDark ? '#7D7D7D' : '#A59A8A';
    const unreadIconColor = isDark ? '#FFF7E0' : '#3A2A05';

    const notifications = useQuery(api.notifications.getUserNotifications);
    const markAsRead = useMutation(api.notifications.markAsRead);

    const handlePress = async (notification: NotificationItem) => {
        if (!notification.is_read) {
            await markAsRead({ notificationId: notification._id });
        }

        navigateFromNotification(router, notification);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    const renderItem = ({ item }: { item: any }) => (
        <Pressable
            style={[
                styles.notificationItem,
                !item.is_read && styles.unreadItem,
            ]}
            onPress={() => handlePress(item)}
        >
            <View
                style={[
                    styles.iconContainer,
                    {
                        backgroundColor: item.is_read ? controlBackgroundColor : unreadIconBackgroundColor,
                        borderColor: item.is_read ? borderColor : 'transparent',
                    },
                ]}
            >
                <Bell size={20} color={item.is_read ? readIconColor : unreadIconColor} />
            </View>
            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <ThemedText
                        type={item.is_read ? 'default' : 'defaultSemiBold'}
                        style={[styles.title, { color: item.is_read ? mutedTextColor : theme.text }]}
                    >
                        {item.title}
                    </ThemedText>
                    <ThemedText style={[styles.date, { color: secondaryTextColor }]}>{formatDate(item._creationTime)}</ThemedText>
                </View>
                <ThemedText style={[styles.description, { color: item.is_read ? secondaryTextColor : mutedTextColor }]}>
                    {item.description}
                </ThemedText>
            </View>
        </Pressable>
    );

    if (notifications === undefined) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: screenBackgroundColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.header, { borderBottomColor: dividerColor }]}>
                    <Pressable onPress={() => router.back()} style={[styles.backButton, { borderColor, backgroundColor: controlBackgroundColor }]}>
                        <ArrowLeft size={24} color={theme.text} />
                    </Pressable>
                    <ThemedText type="title" style={[styles.headerTitle, { color: theme.text }]}>
                        Notifications
                    </ThemedText>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.listContent}>
                    {[...Array(6)].map((_, i) => (
                        <NotificationSkeleton key={i} />
                    ))}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: screenBackgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, { borderBottomColor: dividerColor }]}>
                <Pressable onPress={() => router.back()} style={[styles.backButton, { borderColor, backgroundColor: controlBackgroundColor }]}>
                    <ArrowLeft size={24} color={theme.text} />
                </Pressable>
                <ThemedText type="title" style={[styles.headerTitle, { color: theme.text }]}>
                    Notifications
                </ThemedText>
                <View style={styles.placeholder} />
            </View>

            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={notifications.length === 0 ? styles.emptyListContent : styles.listContent}
                ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: dividerColor }]} />}
                ListEmptyComponent={
                    <View style={styles.emptyStateContainer}>
                        <LottieView
                            source={require('@/assets/lotties/not-found.json')}
                            autoPlay
                            loop
                            style={styles.lottie}
                        />
                        <ThemedText style={[styles.emptyStateText, { color: mutedTextColor }]}>
                            No notifications yet
                        </ThemedText>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
    },
    placeholder: {
        width: 40,
    },
    listContent: {
        paddingTop: 12,
        paddingBottom: 24,
    },
    emptyListContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationItem: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    unreadItem: {
        backgroundColor: 'transparent',
    },
    iconContainer: {
        marginRight: 16,
        width: 40,
        height: 40,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    date: {
        fontSize: 12,
        color: '#6B7280',
        fontFamily: 'GoogleSans_400Regular',
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        fontFamily: 'GoogleSans_400Regular',
    },
    separator: {
        height: 1,
        marginHorizontal: 16,
    },
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ translateY: -50 }],
        paddingVertical: 24,
        gap: 8,
    },
    emptyStateText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_500Medium',
        color: '#4B5563',
    },
    lottie: {
        width: 150,
        height: 150,
    },
    skeletonContainer: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    skeletonIcon: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        marginRight: 16,
        borderWidth: 1,
    },
    skeletonContent: {
        flex: 1,
        gap: 8,
    },
    skeletonTitle: {
        width: '60%',
        height: 20,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
    },
    skeletonDesc: {
        width: '90%',
        height: 16,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
    },
});
