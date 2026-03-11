import { View, StyleSheet, Pressable, Image } from 'react-native';
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Landmark, Settings, LogOut, Gift, User as UserIcon } from 'lucide-react-native';

import { useQuery } from 'convex/react';
import { api } from '../../../../packages/backend/convex/_generated/api';

import { ThemedText } from '@/components/themed-text';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { authClient } from "@/lib/auth-client";
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePostHog } from 'posthog-react-native';

interface ProfileActionSheetProps {
    actionSheetRef: React.RefObject<ActionSheetRef | null>;
}

export function ProfileActionSheet({
    actionSheetRef,
}: ProfileActionSheetProps) {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const iconColor = theme.text;
    const screenBackgroundColor = isDark ? theme.screenBackground : '#F4F3EE';
    const controlBackgroundColor = isDark ? '#141414' : '#F7F4ED';
    const borderColor = isDark ? '#303030' : '#E4DED2';
    const dividerColor = isDark ? '#2A2A2A' : '#E7E2D8';
    const mutedTextColor = isDark ? '#A0A0A0' : '#666666';
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const posthog = usePostHog();

    // Dynamic Data
    const { data: session } = authClient.useSession();
    const user = session?.user;

    const convexUser = useQuery(api.users.getUser);
    const campaignsCount = convexUser?.campaigns_count ?? 0;
    const totalEarnings = convexUser?.total_earnings ?? 0;

    const profileData = {
        name: user?.name ?? "User",
        avatar: user?.image,
        email: user?.email ?? "",
        stats: {
            campaigns: campaignsCount,
            earnings: `RM ${totalEarnings.toLocaleString()}`,
        },
    };

    const handleOptionPress = (route: string) => {
        actionSheetRef.current?.hide();
        setTimeout(() => {
            router.push(route as any);
        }, 300);
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await authClient.signOut({
                fetchOptions: {
                    onSuccess: () => {
                        posthog.reset();
                        router.replace('/welcome');
                        setIsLoggingOut(false);
                        // No manual redirect needed — _layout.tsx auth guard
                        // detects session === null and redirects to /welcome automatically
                    },
                    onError: () => {
                        setIsLoggingOut(false);
                    }
                },
            });
        } catch (error) {
            console.error("Logout error:", error);
            setIsLoggingOut(false);
        }
    };

    return (
        <ActionSheet
            ref={actionSheetRef}
            gestureEnabled
            containerStyle={{ backgroundColor: screenBackgroundColor }}
            indicatorStyle={{ backgroundColor: dividerColor }}
        >
            <View style={[styles.sheetContent, { backgroundColor: screenBackgroundColor }]}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={[styles.avatarContainer, { backgroundColor: controlBackgroundColor, borderColor }]}>
                        {profileData.avatar ? (
                            <Image
                                source={{ uri: profileData.avatar }}
                                style={styles.avatar}
                            />
                        ) : (
                            <UserIcon size={40} color={isDark ? '#ccc' : "#999"} />
                        )}
                    </View>
                    <ThemedText type="subtitle" style={styles.name}>{profileData.name}</ThemedText>
                    <ThemedText style={[styles.email, { color: mutedTextColor }]}>{profileData.email}</ThemedText>
                </View>

                {/* Stats Row */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <ThemedText type="subtitle">{profileData.stats.campaigns}</ThemedText>
                        <ThemedText style={[styles.statLabel, { color: mutedTextColor }]}>Earning Campaigns</ThemedText>
                    </View>
                    <View style={[styles.verticalDivider, { backgroundColor: dividerColor }]} />
                    <View style={styles.statItem}>
                        <ThemedText type="subtitle">{profileData.stats.earnings}</ThemedText>
                        <ThemedText style={[styles.statLabel, { color: mutedTextColor }]}>Lifetime Earnings</ThemedText>
                    </View>
                </View>

                {/* Options List */}
                <View style={styles.optionsList}>
                    <Pressable
                        style={styles.optionRow}
                        onPress={() => handleOptionPress('/referral')} // Placeholder route
                    >
                        <View style={[styles.iconContainer, { backgroundColor: controlBackgroundColor, borderColor }]}>
                            <Gift size={24} color={iconColor} />
                        </View>
                        <ThemedText style={styles.optionLabel}>Referral Program</ThemedText>
                    </Pressable>
                    <View style={[styles.divider, { backgroundColor: dividerColor }]} />

                    <Pressable
                        style={styles.optionRow}
                        onPress={() => handleOptionPress('/bank-account')} // Placeholder route
                    >
                        <View style={[styles.iconContainer, { backgroundColor: controlBackgroundColor, borderColor }]}>
                            <Landmark size={24} color={iconColor} />
                        </View>
                        <ThemedText style={styles.optionLabel}>Bank Account</ThemedText>
                    </Pressable>
                    <View style={[styles.divider, { backgroundColor: dividerColor }]} />

                    <Pressable
                        style={styles.optionRow}
                        onPress={() => handleOptionPress('/settings')} // Placeholder route
                    >
                        <View style={[styles.iconContainer, { backgroundColor: controlBackgroundColor, borderColor }]}>
                            <Settings size={24} color={iconColor} />
                        </View>
                        <ThemedText style={styles.optionLabel}>Settings</ThemedText>
                    </Pressable>
                    <View style={[styles.divider, { backgroundColor: dividerColor }]} />

                    <Pressable
                        style={styles.optionRow}
                        onPress={handleLogout}
                        disabled={isLoggingOut}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: controlBackgroundColor, borderColor }]}>
                            <LogOut size={24} color="#D32F2F" />
                        </View>
                        <ThemedText style={[styles.optionLabel, { color: '#D32F2F' }]}>Logout</ThemedText>
                        {isLoggingOut && (
                            <LoadingIndicator size="small" color="#D32F2F" style={{ marginLeft: 10 }} />
                        )}
                    </Pressable>
                </View>

                {/* Optional Cancel/Dismiss Button explicitly requested? No, but good for UX */}
                {/* User said "just put every in the list", so maybe keep it simple. */}
            </View>
        </ActionSheet>
    );
}

const styles = StyleSheet.create({
    sheetContent: {
        padding: 24,
        paddingBottom: 40,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    name: {
        fontSize: 20,
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        width: '100%',
        paddingHorizontal: 24,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
        fontFamily: 'GoogleSans_400Regular',
    },
    verticalDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 16,
    },
    optionsList: {
        width: '100%',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    optionLabel: {
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginLeft: 56, // Align with text
    },
});
