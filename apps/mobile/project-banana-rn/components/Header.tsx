import { useRef } from 'react';
import { View, StyleSheet, Image as RNImage, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bell, User as UserIcon } from 'lucide-react-native';
import { ActionSheetRef } from "react-native-actions-sheet";
import { useQuery } from 'convex/react';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ProfileActionSheet } from '@/components/ProfileActionSheet';
import { authClient } from "@/lib/auth-client";
import { api } from '../../../../packages/backend/convex/_generated/api';

interface HeaderProps {
    title?: string;
}

export function Header({ title }: HeaderProps) {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const actionSheetRef = useRef<ActionSheetRef>(null);

    const { data: session } = authClient.useSession();
    const user = session?.user;

    // Fetch unread notifications count
    const unreadCount = useQuery(api.notifications.getUnreadNotificationCount) ?? 0;

    return (
        <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
            <View style={styles.leftSection}>
                {title ? (
                    <ThemedText type="title" style={styles.headerTitle}>{title}</ThemedText>
                ) : (
                    <>
                        <Image
                            source={require('@/assets/images/icon.svg')}
                            style={styles.logoContainer}
                            contentFit="contain"
                        />
                        <ThemedText type="defaultSemiBold" style={styles.appName}>Lumina</ThemedText>
                    </>
                )}
            </View>
            <View style={styles.rightSection}>
                <Pressable onPress={() => router.push('/notifications')}>
                    <View style={[
                        styles.iconButton,
                        { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F0F0F0' }
                    ]}>
                        <Bell size={20} color={colorScheme === 'dark' ? '#ECEDEE' : '#000'} />
                        {unreadCount > 0 && (
                            <View style={[
                                styles.badgeContainer,
                                { borderColor: colorScheme === 'dark' ? '#1A1A1A' : '#F0F0F0' }
                            ]}>
                                <ThemedText style={styles.badgeText}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </ThemedText>
                            </View>
                        )}
                    </View>
                </Pressable>
                <Pressable onPress={() => actionSheetRef.current?.show()}>
                    {user?.image ? (
                        <RNImage
                            source={{ uri: user.image }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[
                            styles.avatar,
                            styles.fallbackAvatar,
                            {
                                backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F0F0F0',
                                borderColor: colorScheme === 'dark' ? '#333' : '#E5E5E5'
                            }
                        ]}>
                            <UserIcon size={24} color={colorScheme === 'dark' ? '#999' : '#999'} />
                        </View>
                    )}
                </Pressable>
            </View>

            <ProfileActionSheet actionSheetRef={actionSheetRef} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        zIndex: 100, // Ensure header is above other content if necessary
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
    },
    logoText: {
        color: '#fff',
        fontSize: 18,
        lineHeight: 22,
    },
    appName: {
        fontSize: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'GoogleSans_700Bold',
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F0F0', // Overridden in JSX
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
    },
    fallbackAvatar: {
        backgroundColor: '#F0F0F0', // Overridden in JSX
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E5', // Overridden in JSX
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    badgeContainer: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: '#F0F0F0', // Overridden in JSX
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
        lineHeight: 12,
    },
});
