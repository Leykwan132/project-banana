import { View, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Bell } from 'lucide-react-native';
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

interface NotificationItem {
    _id: Id<"notifications">;
    title: string;
    description: string;
    is_read: boolean;
    created_at: number;
    redirect_url?: string;
}

const NotificationSkeleton = () => {
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
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <View style={styles.skeletonContainer}>
            <Animated.View style={[styles.skeletonIcon, animatedStyle]} />
            <View style={styles.skeletonContent}>
                <Animated.View style={[styles.skeletonTitle, animatedStyle]} />
                <Animated.View style={[styles.skeletonDesc, animatedStyle]} />
            </View>
        </View>
    );
};

export default function NotificationsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const notifications = useQuery(api.notifications.getUserNotifications);
    const markAsRead = useMutation(api.notifications.markAsRead);

    const handlePress = async (notification: any) => {
        // Mark as read
        if (!notification.is_read) {
            await markAsRead({ notificationId: notification._id });
        }

        // Navigate if there is a redirect URL
        if (notification.redirect_url) {
            router.push(notification.redirect_url as any);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
        });
    };

    const renderItem = ({ item }: { item: any }) => (
        <Pressable
            style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
            onPress={() => handlePress(item)}
        >
            <View style={styles.iconContainer}>
                {/* Yellow background only for unread */}
                {!item.is_read && <View style={styles.iconBackground} />}
                <Bell size={24} color={item.is_read ? '#9CA3AF' : '#000'} />
            </View>
            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <ThemedText type={item.is_read ? 'default' : 'defaultSemiBold'} style={[styles.title, item.is_read && styles.readTitle]}>
                        {item.title}
                    </ThemedText>
                    <ThemedText style={styles.date}>{formatDate(item.created_at)}</ThemedText>
                </View>
                <ThemedText style={[styles.description, item.is_read && styles.readDescription]}>{item.description}</ThemedText>
            </View>
        </Pressable>
    );

    if (notifications === undefined) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }]}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={24} color={theme.text} />
                    </Pressable>
                    <ThemedText type="title" style={styles.headerTitle}>
                        Notifications
                    </ThemedText>
                    <View style={styles.placeholder} />
                </View>
                <View style={[styles.listContent, { paddingHorizontal: 16 }]}>
                    {[...Array(6)].map((_, i) => (
                        <NotificationSkeleton key={i} />
                    ))}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.text} />
                </Pressable>
                <ThemedText type="title" style={styles.headerTitle}>
                    Notifications
                </ThemedText>
                <View style={styles.placeholder} />
            </View>

            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={notifications.length === 0 ? styles.emptyListContent : styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.emptyStateContainer}>
                        <LottieView
                            source={require('@/assets/lotties/not-found.json')}
                            autoPlay
                            loop
                            style={styles.lottie}
                        />
                        <ThemedText style={styles.emptyStateText}>
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
        paddingTop: 10,
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
        backgroundColor: '#FEFCE8', // Very light yellow/cream
    },
    readItem: {
        backgroundColor: 'transparent',
    },
    iconContainer: {
        marginRight: 16,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBackground: {
        position: 'absolute',
        width: 32,
        height: 32,
        backgroundColor: '#FDE047', // Slightly darker yellow for icon to stand out on cream bg
        borderRadius: 8,
        // Center the background
        top: 4,
        left: 4,
        zIndex: -1,
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
    readTitle: {
        fontFamily: 'GoogleSans_400Regular',
        color: '#6B7280',
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
    readDescription: {
        color: '#9CA3AF',
    },
    separator: {
        height: 1,
        backgroundColor: '#E5E7EB',
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
    },
    skeletonIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginRight: 16,
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
