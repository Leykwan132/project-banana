import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Linking, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ArrowLeft, ChevronRight, Shield, FileText, Bell, Moon, Bug, MessageCircle, Mail } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from 'convex/react';
import { Switch as UISwitch } from 'react-native-ui-lib';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { REPORT_ISSUE_FORM_URL } from '@/constants/support';
import { useColorScheme, useThemePreference } from '@/hooks/use-color-scheme';
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
    const isDark = colorScheme === 'dark';
    const screenBackgroundColor = isDark ? theme.screenBackground : '#F4F3EE';
    const surfaceColor = isDark ? '#171717' : '#FBFAF7';
    const controlBackgroundColor = isDark ? '#141414' : '#F7F4ED';
    const borderColor = isDark ? '#303030' : '#E4DED2';
    const dividerColor = isDark ? '#2A2A2A' : '#E7E2D8';
    const { toggleColorScheme } = useThemePreference();
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
        router.push('/privacy-policy');
    };

    const handleTermsPress = () => {
        router.push('/terms-and-conditions');
    };

    const handleReportIssuePress = () => {
        Linking.openURL(REPORT_ISSUE_FORM_URL);
    };

    const handleChatWithUsPress = () => {
        Linking.openURL('https://wa.me/60129499394');
    };

    const handleEmailUsPress = () => {
        Linking.openURL('mailto:admin@lumina-app.my');
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

    const handleToggleTheme = useCallback(async () => {
        await toggleColorScheme();
    }, [toggleColorScheme]);

    const settingsOptions: SettingsOption[] = [
        {
            id: 'report-issue',
            title: 'Report an issue',
            icon: <Bug size={24} color={theme.text} />,
            onPress: handleReportIssuePress,
        },
        {
            id: 'chat-with-us',
            title: 'Chat Support',
            icon: <MessageCircle size={24} color={theme.text} />,
            onPress: handleChatWithUsPress,
        },
        {
            id: 'email-us',
            title: 'Email Us',
            icon: <Mail size={24} color={theme.text} />,
            onPress: handleEmailUsPress,
        },
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
        <SafeAreaView style={[styles.container, { backgroundColor: screenBackgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={[styles.backButton, { borderColor, backgroundColor: controlBackgroundColor }]}
                >
                    <ArrowLeft size={24} color={theme.text} />
                </Pressable>
                <ThemedText type="title" style={styles.headerTitle}>
                    Settings
                </ThemedText>
                <View style={styles.placeholder} />
            </View>

            {/* Settings Options */}
            <View style={styles.content}>
                <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor }]}>
                    <View style={styles.optionRow}>
                        <View style={[styles.iconContainer, { backgroundColor: controlBackgroundColor, borderColor }]}>
                            <Moon size={24} color={theme.text} />
                        </View>
                        <ThemedText style={styles.optionLabel}>Dark mode</ThemedText>
                        <UISwitch
                            value={colorScheme === 'dark'}
                            onValueChange={handleToggleTheme}
                            onColor="#FC4C02"
                            offColor="#D1D5DB"
                            thumbColor="#FFFFFF"
                            thumbStyle={styles.switchThumb}
                        />
                    </View>
                    <View style={[styles.divider, { backgroundColor: dividerColor }]} />
                    <View style={styles.optionRow}>
                        <View style={[styles.iconContainer, { backgroundColor: controlBackgroundColor, borderColor }]}>
                            <Bell size={24} color={theme.text} />
                        </View>
                        <ThemedText style={styles.optionLabel}>Allow notifications</ThemedText>
                        <UISwitch
                            value={notificationsEnabled}
                            onValueChange={handleToggleNotifications}
                            disabled={isUpdatingNotifications}
                            onColor="#FC4C02"
                            offColor="#D1D5DB"
                            disabledColor="#D1D5DB"
                            thumbColor="#FFFFFF"
                            thumbStyle={styles.switchThumb}
                        />
                    </View>
                </View>

                <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor }]}>
                    {settingsOptions.map((option, index) => (
                        <View key={option.id}>
                            <Pressable
                                style={styles.optionRow}
                                onPress={option.onPress}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: controlBackgroundColor, borderColor }]}>
                                    {option.icon}
                                </View>
                                <ThemedText style={styles.optionLabel}>{option.title}</ThemedText>
                                <ChevronRight size={20} color={theme.icon} />
                            </Pressable>
                            {index < settingsOptions.length - 1 && (
                                <View style={[styles.divider, { backgroundColor: dividerColor }]} />
                            )}
                        </View>
                    ))}
                </View>
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
        gap: 16,
    },
    sectionCard: {
        borderWidth: 1,
        borderRadius: 24,
        overflow: 'hidden',
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
        marginRight: 16,
        borderWidth: 1,
    },
    optionLabel: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
    },
    switchThumb: {
        backgroundColor: '#FFFFFF',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginLeft: 72,
    },
});
