import { View, StyleSheet, Pressable, Alert, Platform, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { AntDesign } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';
import { useConvex } from 'convex/react';
import LottieView from 'lottie-react-native';
import { usePostHog } from 'posthog-react-native';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { TypingText } from '@/components/ui/TypingText';
import { Colors } from '@/constants/theme';
import { authClient } from '@/lib/auth-client';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '../../../../packages/backend/convex/_generated/api';
import { ErrorType } from '../../../../packages/backend/convex/errors';
import { ConvexError } from 'convex/values';

export function LoginScreenContent() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const screenBackgroundColor = isDark ? theme.screenBackground : '#F4F3EE';
    const surfaceColor = isDark ? '#171717' : '#FBFAF7';
    const borderColor = isDark ? '#303030' : '#E4DED2';
    const subtleTextColor = isDark ? '#A3A3A3' : '#666666';
    const tertiaryTextColor = isDark ? '#7A7A7A' : '#999999';
    const decorativeLogoOpacity = isDark ? [0.22, 0.14, 0.18] : [0.32, 0.18, 0.24];
    const router = useRouter();
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isAppleLoading, setIsAppleLoading] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const convex = useConvex();
    const posthog = usePostHog();
    const signupMethodRef = useRef<'google' | 'apple'>('google');
    const floatAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: 1,
                    duration: 4500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 4500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [floatAnim]);

    const translateY1 = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -20],
    });

    const translateY2 = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 25],
    });

    const rotate1 = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['-14deg', '-6deg'],
    });

    const rotate2 = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['12deg', '24deg'],
    });

    const rotate3 = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['35deg', '25deg'],
    });

    const scale1 = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.05],
    });

    const scale2 = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.1],
    });

    const checkIsNewUser = async (): Promise<boolean> => {
        try {
            await convex.query(api.creators.getCreator, {});
            return false;
        } catch (error) {
            if (
                error instanceof ConvexError &&
                (error.data as { code: number }).code === ErrorType.CREATOR_NOT_FOUND.code
            ) {
                return true;
            }
            throw error;
        }
    };

    const handleLoginSuccess = async () => {
        setIsLoggingIn(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        try {
            const isNew = await checkIsNewUser();
            const currentSession = await authClient.getSession();

            if (currentSession.data?.user) {
                posthog.identify(currentSession.data.user.id, {
                    email: currentSession.data.user.email,
                    name: currentSession.data.user.name,
                    device_type: Platform.OS,
                    app_version: Constants.expoConfig?.version ?? 'unknown',
                });
            }

            if (isNew) {
                posthog.capture('signup', {
                    signup_method: signupMethodRef.current,
                });
            }

            let isTestUser = false;
            try {
                const creator = await convex.query(api.creators.getCreator, {});
                isTestUser = !!(creator as { is_test_user?: boolean } | null)?.is_test_user;
            } catch {
                // New users have no creator record yet.
            }

            posthog.register({
                is_test_user: isTestUser,
                domain_host: __DEV__ ? 'expo-dev' : 'production',
                device_type: Platform.OS,
                app_version: Constants.expoConfig?.version ?? 'unknown',
            });

            router.replace(isNew ? '/onboarding' : '/(tabs)');
        } catch {
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
                throw new Error('Failed to get Apple identity token');
            }

            const { error } = await authClient.signIn.social({
                provider: 'apple',
                idToken: {
                    token: credential.identityToken,
                },
            });

            if (error) {
                setIsAppleLoading(false);
                Alert.alert('Login Failed', 'There was an error signing in with Apple. Please try again.');
                return;
            }

            const session = await authClient.getSession();
            if (session.data) {
                setIsAppleLoading(false);
                await handleLoginSuccess();
            } else {
                console.error('Session not found after Apple login success');
                setIsAppleLoading(false);
            }
        } catch {
            setIsAppleLoading(false);
            Alert.alert('Login Failed', 'There was an error signing in with Apple.');
        }
    };

    const handleGoogleLogin = async () => {
        signupMethodRef.current = 'google';
        setIsGoogleLoading(true);
        try {
            const { error } = await authClient.signIn.social({
                provider: 'google',
                callbackURL: Linking.createURL('/login'),
            });

            if (error) {
                setIsGoogleLoading(false);
                Alert.alert('Login Failed', 'There was an error signing in with Google. Please try again.');
                return;
            }

            const session = await authClient.getSession();

            if (session.data) {
                setIsGoogleLoading(false);
                await handleLoginSuccess();
            } else {
                console.error('Session not found after login success');
                setIsGoogleLoading(false);
            }
        } catch {
            setIsGoogleLoading(false);
            Alert.alert('Login Failed', 'There was an error signing in with Google.');
        }
    };

    return (
        <SafeAreaView style={[styles.screen, { backgroundColor: screenBackgroundColor }]}>
            <View style={styles.header}>
                <Pressable
                    style={[styles.backButton, { borderColor }]}
                    onPress={() => router.back()}
                    disabled={isLoggingIn}
                >
                    <ArrowLeft size={20} color={theme.text} />
                </Pressable>
            </View>

            {isLoggingIn ? (
                <View style={styles.loggingInContainer}>
                    <LottieView
                        source={require('@/assets/lotties/logging-in.json')}
                        autoPlay
                        loop
                        style={styles.loggingInLottie}
                    />
                    <TypingText
                        text="Logging you in"
                        style={[styles.loggingInText, { color: theme.text }]}
                    />
                </View>
            ) : (
                <View style={styles.content}>
                    <Animated.View style={[styles.floatingLogo, styles.floatingLogoBottomRight, { opacity: decorativeLogoOpacity[1], transform: [{ rotate: rotate1 }, { translateY: translateY1 }, { scale: scale1 }] }]}>
                        <Image source={require('@/assets/images/icon.svg')} style={styles.fullImage} contentFit="contain" />
                    </Animated.View>
                    <View style={styles.hero}>
                        <Animated.View style={[styles.floatingLogo, styles.floatingLogoRight, { opacity: isDark ? 0.6 : 0.75, transform: [{ rotate: rotate2 }, { translateY: translateY2 }, { scale: scale2 }] }]}>
                            <Image source={require('@/assets/images/icon.svg')} style={styles.fullImage} contentFit="contain" />
                        </Animated.View>
                        <Animated.View style={[styles.floatingLogo, styles.floatingLogoBottomLeft, { opacity: decorativeLogoOpacity[2], transform: [{ rotate: rotate3 }, { translateY: translateY1 }, { scale: scale1 }] }]}>
                            <Image source={require('@/assets/images/icon.svg')} style={styles.fullImage} contentFit="contain" />
                        </Animated.View>
                        <ThemedText
                            style={[styles.title, { color: theme.text }]}
                            numberOfLines={2}
                            adjustsFontSizeToFit
                        >
                            Make content.{'\n'}Get paid.
                        </ThemedText>
                        <ThemedText style={[styles.subtitle, { color: subtleTextColor }]} numberOfLines={1} adjustsFontSizeToFit>
                            Turn views into cash with Lumina.
                        </ThemedText>
                    </View>

                    <View style={styles.actions}>
                        {Platform.OS === 'ios' ? (
                            <Pressable
                                style={[
                                    styles.loginButton,
                                    styles.primaryButton,
                                    {
                                        backgroundColor: isDark ? '#F4F1E8' : '#111111',
                                        borderColor: isDark ? '#F4F1E8' : '#111111',
                                    },
                                    isAppleLoading && styles.disabledButton,
                                ]}
                                onPress={handleAppleLogin}
                                disabled={isAppleLoading}
                            >
                                {isAppleLoading ? (
                                    <LoadingIndicator size="small" color={isDark ? '#111111' : '#FFFFFF'} />
                                ) : (
                                    <>
                                        <AntDesign
                                            name="apple"
                                            size={20}
                                            color={isDark ? '#111111' : '#FFFFFF'}
                                            style={styles.buttonIcon}
                                        />
                                        <ThemedText style={[styles.primaryButtonText, { color: isDark ? '#111111' : '#FFFFFF' }]}>
                                            Continue with Apple
                                        </ThemedText>
                                    </>
                                )}
                            </Pressable>
                        ) : null}

                        <Pressable
                            style={[
                                styles.loginButton,
                                {
                                    backgroundColor: isDark ? surfaceColor : '#FFFFFF',
                                    borderColor,
                                },
                                isGoogleLoading && styles.disabledButton,
                            ]}
                            onPress={handleGoogleLogin}
                            disabled={isGoogleLoading}
                        >
                            {isGoogleLoading ? (
                                <LoadingIndicator size="small" color={theme.text} />
                            ) : (
                                <>
                                    <AntDesign name="google" size={20} color={theme.text} style={styles.buttonIcon} />
                                    <ThemedText style={[styles.secondaryButtonText, { color: theme.text }]}>Continue with Google</ThemedText>
                                </>
                            )}
                        </Pressable>

                        <ThemedText style={[styles.footerText, { color: tertiaryTextColor }]}>
                            By continuing, you agree to our Terms and Privacy Policy.
                        </ThemedText>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 28,
        justifyContent: 'space-between',
    },
    hero: {
        position: 'relative',
        paddingTop: 20,
        minHeight: 360,
        justifyContent: 'flex-start',
    },
    title: {
        fontSize: 48,
        lineHeight: 54,
        fontFamily: 'GoogleSans_700Bold',
        letterSpacing: -1.5,
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 18,
        lineHeight: 26,
        fontFamily: 'GoogleSans_600SemiBold',
        maxWidth: 320,
    },
    floatingLogo: {
        position: 'absolute',
        zIndex: -1,
    },
    floatingLogoBottomRight: {
        width: 140,
        height: 140,
        bottom: -20,
        right: -30,
    },
    floatingLogoRight: {
        width: 180,
        height: 180,
        top: 240,
        right: -70,
    },
    floatingLogoBottomLeft: {
        width: 260,
        height: 260,
        top: 380,
        left: -110,
    },
    fullImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    actions: {
        width: '100%',
        gap: 12,
    },
    loginButton: {
        width: '100%',
        height: 58,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    primaryButton: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 3,
    },
    disabledButton: {
        opacity: 0.7,
    },
    buttonIcon: {
        marginRight: 10,
    },
    primaryButtonText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    footerText: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        marginTop: 8,
    },
    loggingInContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    loggingInLottie: {
        width: 220,
        height: 220,
    },
    loggingInText: {
        marginTop: 8,
        fontSize: 18,
        fontFamily: 'GoogleSans_600SemiBold',
    },
});
