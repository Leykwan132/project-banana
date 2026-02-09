import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Bell } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface NotificationItem {
    id: string;
    title: string;
    description: string;
    date: string;
    read: boolean;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
    {
        id: '1',
        title: 'Changes Requested!',
        description: 'The owner has requested changes on your video for campaign A',
        date: '17/11/25',
        read: false,
    },
    {
        id: '2',
        title: 'Application Approved',
        description: 'Your application for campaign B has been approved',
        date: '16/11/25',
        read: true,
    },
];

export default function NotificationsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const renderItem = ({ item }: { item: NotificationItem }) => (
        <View style={[styles.notificationItem, !item.read && styles.unreadItem]}>
            <View style={styles.iconContainer}>
                {/* Yellow background only for unread, or different color for read */}
                {!item.read && <View style={styles.iconBackground} />}
                <Bell size={24} color={item.read ? '#9CA3AF' : '#000'} />
            </View>
            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <ThemedText type={item.read ? 'default' : 'defaultSemiBold'} style={[styles.title, item.read && styles.readTitle]}>
                        {item.title}
                    </ThemedText>
                    <ThemedText style={styles.date}>{item.date}</ThemedText>
                </View>
                <ThemedText style={[styles.description, item.read && styles.readDescription]}>{item.description}</ThemedText>
            </View>
        </View>
    );

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
                data={MOCK_NOTIFICATIONS}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
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
});
