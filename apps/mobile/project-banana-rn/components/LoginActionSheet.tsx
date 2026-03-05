import { View, StyleSheet, Pressable, Alert, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { AntDesign } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState, useRef } from 'react';
import { useConvex } from 'convex/react';
import LottieView from 'lottie-react-native';
import { usePostHog } from 'posthog-react-native'
import Constants from 'expo-constants';

import { ThemedText } from '@/components/themed-text';
import { authClient } from "@/lib/auth-client";
import { router } from 'expo-router';
import { api } from '../../../../packages/backend/convex/_generated/api';
import { ErrorType } from '../../../../packages/backend/convex/errors';
import { ConvexError } from "convex/values";
interface LoginActionSheetProps {
    actionSheetRef: React.RefObject<ActionSheetRef | null>;
}

export function LoginActionSheet({
    actionSheetRef,
}: LoginActionSheetProps) {
    const colorScheme = useColorScheme();
    const { data: session } = authClient.useSession();
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isAppleLoading, setIsAppleLoading] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const convex = useConvex();
    const posthog = usePostHog();
    const signupMethodRef = useRef<'google' | 'apple'>('google');

    /** Returns true only when the creator record doesn't exist yet (new user). Re-throws any other error. */
    const checkIsNewUser = async (): Promise<boolean> => {
        try {
            await convex.query(api.creators.getCreator, {});
            return false; // Creator exists — returning user
        } catch (error) {
            if (
                error instanceof ConvexError &&
                (error.data as { code: number }).code === ErrorType.CREATOR_NOT_FOUND.code
            ) {
                return true; // No creator record yet — new user
            }
            throw error; // Unexpected error — don't silently swallow it
        }
    };

    /** Shows the lottie overlay for 1.5 s (backend propagation buffer), then routes. */
    const handleLoginSuccess = async () => {
        setIsLoggingIn(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        try {
            const isNew = await checkIsNewUser();

            // Identify user in PostHog
            const currentSession = await authClient.getSession();
            if (currentSession.data?.user) {
                posthog.identify(currentSession.data.user.id, {
                    email: currentSession.data.user.email,
                    name: currentSession.data.user.name,
                    device_type: Platform.OS,
                    app_version: Constants.expoConfig?.version ?? 'unknown',
                });
            }

            // Capture signup event for new users only
            if (isNew) {
                posthog.capture('signup', {
                    signup_method: signupMethodRef.current,
                });
            }

            // Register super properties — attached to every future event
            let isTestUser = false;
            try {
                const creator = await convex.query(api.creators.getCreator, {});
                isTestUser = !!(creator as any)?.is_test_user;
            } catch (_) { /* new user, no creator yet */ }

            posthog.register({
                is_test_user: isTestUser,
                domain_host: __DEV__ ? 'expo-dev' : 'production',
                device_type: Platform.OS,
                app_version: Constants.expoConfig?.version ?? 'unknown',
            });

            router.replace(isNew ? '/onboarding' : '/(tabs)');
        } catch (error) {
            setIsLoggingIn(false);
            Alert.alert('Login Failed', 'Something went wrong. Please try again.');
        }
    };

    const handleAppleLogin = async () => {
        signupMethodRef.current = 'apple';
        setIsAppleLoading(true);
        try {
            const { data, error } = await authClient.signIn.social({
                provider: "apple",
                callbackURL: "/(tabs)",
                newUserCallbackURL: "/onboarding",
            });

            if (error) {
                setIsAppleLoading(false);
                Alert.alert("Login Failed", "There was an error signing in with Apple. Please try again.");
                return;
            }

            // Verify session was created
            const session = await authClient.getSession();
            if (session.data) {
                setIsAppleLoading(false);
                actionSheetRef.current?.hide();
                await handleLoginSuccess();
            } else {
                console.error("Session not found after Apple login success");
                setIsAppleLoading(false);
            }
        } catch (error) {
            setIsAppleLoading(false);
            Alert.alert("Login Failed", "There was an error signing in with Apple.");
        }
    };

    const handleGoogleLogin = async () => {
        signupMethodRef.current = 'google';
        setIsGoogleLoading(true);
        try {
            const { data, error } = await authClient.signIn.social({
                provider: "google",
                callbackURL: "/(tabs)", // this will be converted to a deep link (eg. `myapp://dashboard`) on native
                newUserCallbackURL: "/onboarding",
            });

            if (error) {
                setIsGoogleLoading(false);
                Alert.alert("Login Failed", "There was an error signing in with Google. Please try again.");
                return;
            }

            // Verify session was created
            const session = await authClient.getSession();
            if (session.data) {
                setIsGoogleLoading(false);
                await handleLoginSuccess();
            } else {
                console.error("Session not found after login success");
                setIsGoogleLoading(false);
            }

        } catch (error) {
            setIsGoogleLoading(false);
            Alert.alert("Login Failed", "There was an error signing in with Google.");
        }
    };

    return (
        <ActionSheet
            ref={actionSheetRef}
            gestureEnabled={!isLoggingIn}
            indicatorStyle={{
                backgroundColor: '#E0E0E0',
                width: 40,
            }}
            containerStyle={{
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
            }}
        >
            {isLoggingIn ? (
                <View style={styles.loggingInContainer}>
                    <LottieView
                        source={require('@/assets/lotties/logging-in.json')}
                        autoPlay
                        loop
                        style={styles.loggingInLottie}
                    />
                    <ThemedText style={styles.loggingInText}>Logging you in…</ThemedText>
                </View>
            ) : (
                <View style={styles.container}>
                    <Image
                        source={require('@/assets/images/icon.svg')}
                        style={styles.logoContainer}
                        contentFit="contain"
                    />
                    <ThemedText type="subtitle" style={styles.title}>Welcome to Lumina</ThemedText>
                    <ThemedText style={styles.subtitle}>Sign in to start earning from your content.</ThemedText>

                    <View style={styles.buttonContainer}>
                        <Pressable
                            style={[styles.loginButton, styles.appleButton, isAppleLoading && styles.disabledButton]}
                            onPress={handleAppleLogin}
                            disabled={isAppleLoading}
                        >
                            {isAppleLoading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <AntDesign name="apple" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                                    <ThemedText style={styles.appleButtonText}>Continue with Apple</ThemedText>
                                </>
                            )}
                        </Pressable>

                        <Pressable
                            style={[styles.loginButton, styles.googleButton, isGoogleLoading && styles.disabledButton]}
                            onPress={handleGoogleLogin}
                            disabled={isGoogleLoading}
                        >
                            {isGoogleLoading ? (
                                <ActivityIndicator color="#000000" />
                            ) : (
                                <>
                                    <AntDesign name="google" size={20} color="#000000" style={styles.buttonIcon} />
                                    <ThemedText style={styles.googleButtonText}>Continue with Google</ThemedText>
                                </>
                            )}
                        </Pressable>
                    </View>

                    <ThemedText style={styles.footerText}>
                        By continuing, you agree to our Terms and Privacy Policy.
                    </ThemedText>
                </View>
            )}
        </ActionSheet>
    )
}

const styles = StyleSheet.create({
    loggingInContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loggingInLottie: {
        width: 180,
        height: 180,
    },
    loggingInText: {
        marginTop: 16,
        fontSize: 18,
        fontFamily: 'GoogleSans_600SemiBold',
        color: '#000000',
    },
    container: {
        padding: 24,
        alignItems: 'center',
    },
    logoContainer: {
        width: 60,
        height: 60,
        borderRadius: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
        marginBottom: 12,
    },
    loginButton: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    disabledButton: {
        opacity: 0.7,
    },
    buttonIcon: {
        fontSize: 20,
        marginRight: 10,
    },
    appleButton: {
        backgroundColor: '#000000',
        borderColor: '#000000',
    },
    appleButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    googleButton: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E0E0E0',
    },
    googleButtonText: {
        color: '#000000',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    footerText: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        lineHeight: 18,
    },
});
