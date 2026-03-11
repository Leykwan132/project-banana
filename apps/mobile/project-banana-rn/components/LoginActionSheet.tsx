import { View, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { AntDesign } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState, useRef } from 'react';
import { useConvex } from 'convex/react';
import LottieView from 'lottie-react-native';
import { usePostHog } from 'posthog-react-native'
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';

import { ThemedText } from '@/components/themed-text';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { Colors } from '@/constants/theme';
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
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const screenBackgroundColor = isDark ? theme.screenBackground : '#F4F3EE';
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
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (!credential.identityToken) {
                throw new Error("Failed to get Apple identity token");
            }

            const { data, error } = await authClient.signIn.social({
                provider: "apple",
                idToken: {
                    token: credential.identityToken,
                    // nonce: credential.authorizationCode ?? undefined,
                    // accessToken: credential.identityToken,
                },
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
                backgroundColor: isDark ? '#3A3A3A' : '#E0E0E0',
                width: 40,
            }}
            containerStyle={{
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                backgroundColor: screenBackgroundColor,
            }}
        >
            {isLoggingIn ? (
                <View style={[styles.loggingInContainer, { backgroundColor: screenBackgroundColor }]}>
                    <LottieView
                        source={require('@/assets/lotties/logging-in.json')}
                        autoPlay
                        loop
                        style={styles.loggingInLottie}
                    />
                    <ThemedText style={[styles.loggingInText, { color: theme.text }]}>Logging you in…</ThemedText>
                </View>
            ) : (
                <View style={[styles.container, { backgroundColor: screenBackgroundColor }]}>
                    <Image
                        source={require('@/assets/images/icon.svg')}
                        style={styles.logoContainer}
                        contentFit="contain"
                    />
                    <ThemedText type="subtitle" style={[styles.title, { color: theme.text }]}>Welcome to Lumina</ThemedText>
                    <ThemedText style={[styles.subtitle, { color: isDark ? '#A3A3A3' : '#666666' }]}>Sign in to start earning from your content.</ThemedText>

                    <View style={styles.buttonContainer}>
                        {Platform.OS === 'ios' && (
                            <Pressable
                                style={[
                                    styles.loginButton,
                                    styles.appleButton,
                                    {
                                        backgroundColor: isDark ? theme.background : '#000000',
                                        borderColor: isDark ? '#333333' : '#000000',
                                    },
                                    isAppleLoading && styles.disabledButton
                                ]}
                                onPress={handleAppleLogin}
                                disabled={isAppleLoading}
                            >
                                {isAppleLoading ? (
                                    <LoadingIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <AntDesign name="apple" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                                        <ThemedText style={styles.appleButtonText}>Continue with Apple</ThemedText>
                                    </>
                                )}
                            </Pressable>
                        )}

                        <Pressable
                            style={[
                                styles.loginButton,
                                styles.googleButton,
                                {
                                    backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                                    borderColor: isDark ? '#333333' : '#E0E0E0',
                                },
                                isGoogleLoading && styles.disabledButton
                            ]}
                            onPress={handleGoogleLogin}
                            disabled={isGoogleLoading}
                        >
                            {isGoogleLoading ? (
                                <LoadingIndicator size="small" color={theme.text} />
                            ) : (
                                <>
                                    <AntDesign name="google" size={20} color={theme.text} style={styles.buttonIcon} />
                                    <ThemedText style={[styles.googleButtonText, { color: theme.text }]}>Continue with Google</ThemedText>
                                </>
                            )}
                        </Pressable>
                    </View>

                    <ThemedText style={[styles.footerText, { color: isDark ? '#7A7A7A' : '#999999' }]}>
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
        width: 50,
        height: 50,
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
