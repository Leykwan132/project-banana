import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Linking, Switch, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, ChevronRight, Shield, FileText, Bell } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from 'convex/react';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { registerForPushNotificationsAsync } from '@/utils/registerForPushNotificationsAsync';
import { api } from '../../../../../packages/backend/convex/_generated/api';

interface SettingsOption {
    id: string;
    title: string;
    icon: React.ReactNode;
    onPress: () => void;
}

export default function SettingsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);

    const recordPushNotificationToken = useMutation(api.notifications.recordPushNotificationToken);
    const pausePushNotifications = useMutation(api.notifications.pausePushNotifications);
    const unpausePushNotifications = useMutation(api.notifications.unpausePushNotifications);
    const pushNotificationPreference = useQuery(api.notifications.getPushNotificationPreference);

    useEffect(() => {
        if (pushNotificationPreference) {
            setNotificationsEnabled(pushNotificationPreference.enabled);
        }
    }, [pushNotificationPreference]);

    const handlePrivacyPress = () => {
        // Could navigate to a privacy page or open a URL
        Linking.openURL('https://example.com/privacy');
    };

    const handleTermsPress = () => {
        // Could navigate to a terms page or open a URL
        Linking.openURL('https://example.com/terms');
    };

    const handleToggleNotifications = useCallback(async (nextValue: boolean) => {
        if (isUpdatingNotifications) return;

        setIsUpdatingNotifications(true);
        try {
            if (nextValue) {
                if (pushNotificationPreference?.hasToken) {
                    await unpausePushNotifications({});
                    setNotificationsEnabled(true);
                    return;
                }

                const token = await registerForPushNotificationsAsync({
                    requestPermissions: true,
                });

                if (!token) {
                    setNotificationsEnabled(false);
                    Alert.alert(
                        'Notifications disabled',
                        'Permission was not granted, so notifications will stay off for now.',
                    );
                    return;
                }

                await recordPushNotificationToken({ token });
                setNotificationsEnabled(true);
                return;
            }

            await pausePushNotifications({});
            setNotificationsEnabled(false);
        } catch {
            Alert.alert('Error', 'Unable to update notification preferences right now.');
        } finally {
            setIsUpdatingNotifications(false);
        }
    }, [
        isUpdatingNotifications,
        pausePushNotifications,
        pushNotificationPreference?.hasToken,
        recordPushNotificationToken,
        unpausePushNotifications,
    ]);

    const settingsOptions: SettingsOption[] = [
        {
            id: 'privacy',
            title: 'Privacy',
            icon: <Shield size={24} color={theme.text} />,
            onPress: handlePrivacyPress,
        },
        {
            id: 'terms',
            title: 'Terms and Conditions',
            icon: <FileText size={24} color={theme.text} />,
            onPress: handleTermsPress,
        },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.text} />
                </Pressable>
                <ThemedText type="title" style={styles.headerTitle}>
                    Settings
                </ThemedText>
                <View style={styles.placeholder} />
            </View>

            {/* Settings Options */}
            <View style={styles.content}>
                <View>
                    <View style={styles.optionRow}>
                        <View style={styles.iconContainer}>
                            <Bell size={24} color={theme.text} />
                        </View>
                        <ThemedText style={styles.optionLabel}>Allow notifications</ThemedText>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={handleToggleNotifications}
                            disabled={isUpdatingNotifications}
                            trackColor={{ false: '#D1D5DB', true: '#FC4C02' }}
                            thumbColor={notificationsEnabled ? '#FC4C02' : '#FFFFFF'}
                            ios_backgroundColor="#D1D5DB"
                        />
                    </View>
                    <View style={styles.divider} />
                </View>
                {settingsOptions.map((option, index) => (
                    <View key={option.id}>
                        <Pressable
                            style={styles.optionRow}
                            onPress={option.onPress}
                        >
                            <View style={styles.iconContainer}>
                                {option.icon}
                            </View>
                            <ThemedText style={styles.optionLabel}>{option.title}</ThemedText>
                            <ChevronRight size={20} color="#999" />
                        </Pressable>
                        {index < settingsOptions.length - 1 && (
                            <View style={styles.divider} />
                        )}
                    </View>
                ))}
            </View>
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
    content: {
        paddingHorizontal: 24,
        paddingTop: 16,
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
        flex: 1,
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginLeft: 56,
    },
});
