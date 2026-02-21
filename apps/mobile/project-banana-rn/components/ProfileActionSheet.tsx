import { View, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native';
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Landmark, Settings, LogOut, Gift } from 'lucide-react-native';

import { useQuery } from 'convex/react';
import { api } from '../../../../packages/backend/convex/_generated/api';

import { ThemedText } from '@/components/themed-text';
import { authClient } from "@/lib/auth-client";
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ProfileActionSheetProps {
    actionSheetRef: React.RefObject<ActionSheetRef | null>;
}

export function ProfileActionSheet({
    actionSheetRef,
}: ProfileActionSheetProps) {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const iconColor = Colors[colorScheme ?? 'light'].text;
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Dynamic Data
    const { data: session } = authClient.useSession();
    const user = session?.user;

    const convexUser = useQuery(api.users.getUser);
    const campaignsCount = convexUser?.campaigns_count ?? 0;
    const totalEarnings = convexUser?.total_earnings ?? 0;

    const profileData = {
        name: user?.name ?? "User",
        avatar: user?.image ?? "https://i.pravatar.cc/150",
        memberSince: user?.createdAt ? new Date(user.createdAt).getFullYear().toString() : new Date().getFullYear().toString(),
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
                        actionSheetRef.current?.hide();
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
        <ActionSheet ref={actionSheetRef} gestureEnabled>
            <View style={styles.sheetContent}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: profileData.avatar }}
                            style={styles.avatar}
                        />
                    </View>
                    <ThemedText type="subtitle" style={styles.name}>{profileData.name}</ThemedText>
                    <ThemedText style={styles.memberSince}>Member since {profileData.memberSince}</ThemedText>
                </View>

                {/* Stats Row */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <ThemedText type="subtitle">{profileData.stats.campaigns}</ThemedText>
                        <ThemedText style={styles.statLabel}>Earning Campaigns</ThemedText>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.statItem}>
                        <ThemedText type="subtitle">{profileData.stats.earnings}</ThemedText>
                        <ThemedText style={styles.statLabel}>Lifetime Earnings</ThemedText>
                    </View>
                </View>

                {/* Options List */}
                <View style={styles.optionsList}>
                    <Pressable
                        style={styles.optionRow}
                        onPress={() => handleOptionPress('/referral')} // Placeholder route
                    >
                        <View style={styles.iconContainer}>
                            <Gift size={24} color={iconColor} />
                        </View>
                        <ThemedText style={styles.optionLabel}>Referral Program</ThemedText>
                    </Pressable>
                    <View style={styles.divider} />

                    <Pressable
                        style={styles.optionRow}
                        onPress={() => handleOptionPress('/bank-account')} // Placeholder route
                    >
                        <View style={styles.iconContainer}>
                            <Landmark size={24} color={iconColor} />
                        </View>
                        <ThemedText style={styles.optionLabel}>Bank Account</ThemedText>
                    </Pressable>
                    <View style={styles.divider} />

                    <Pressable
                        style={styles.optionRow}
                        onPress={() => handleOptionPress('/settings')} // Placeholder route
                    >
                        <View style={styles.iconContainer}>
                            <Settings size={24} color={iconColor} />
                        </View>
                        <ThemedText style={styles.optionLabel}>Settings</ThemedText>
                    </Pressable>
                    <View style={styles.divider} />

                    <Pressable
                        style={styles.optionRow}
                        onPress={handleLogout}
                        disabled={isLoggingOut}
                    >
                        <View style={styles.iconContainer}>
                            <LogOut size={24} color="#D32F2F" />
                        </View>
                        <ThemedText style={[styles.optionLabel, { color: '#D32F2F' }]}>Logout</ThemedText>
                        {isLoggingOut && (
                            <ActivityIndicator size="small" color="#D32F2F" style={{ marginLeft: 10 }} />
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
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#f0f0f0',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    name: {
        fontSize: 20,
        marginBottom: 4,
    },
    memberSince: {
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
    },
    iconContainer: {
        width: 40,
        alignItems: 'center',
        marginRight: 16,
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
