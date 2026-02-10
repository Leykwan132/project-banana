import { View, StyleSheet, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { AntDesign } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { useAction } from "convex/react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { storage } from "@/lib/storage";
import { api } from "../../../../packages/backend/convex/_generated/api"


// import { api } from "@/convex/_generated/api";

interface LoginActionSheetProps {
    actionSheetRef: React.RefObject<ActionSheetRef | null>;
    onLogin: () => void;
}

export function LoginActionSheet({
    actionSheetRef,
    onLogin,
}: LoginActionSheetProps) {
    const colorScheme = useColorScheme();
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isAppleLoading, setIsAppleLoading] = useState(false);

    // Use the auth actions from the backend
    const getAuthorisationUrl = useAction(api.auth.getAuthorisationUrl);
    const authenticateWithCode = useAction(api.auth.authenticateWithCode);

    console.log("getAuthorisationUrl", getAuthorisationUrl);
    console.log("authenticateWithCode", authenticateWithCode);
    const handleLoginPress = () => {
        setIsAppleLoading(true);
        // Simulate async operation or replace with actual Apple login logic
        setTimeout(() => {
            setIsAppleLoading(false);
            actionSheetRef.current?.hide();
            onLogin();
        }, 1000);
    };

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true);
        try {
            // The redirectUri must be added to the sign-in callback in the workos dashboard
            const redirectUri = AuthSession.makeRedirectUri().toString();

            console.log('redirectUri', redirectUri);
            const authorisationUrl = await getAuthorisationUrl({
                provider: "GoogleOAuth",
                redirectUri,
            });

            const result = await WebBrowser.openAuthSessionAsync(
                authorisationUrl,
                redirectUri
            );

            if (result.type !== "success" || !result.url) {
                // User cancelled or failed
                setIsGoogleLoading(false);
                return;
            }

            const params = new URL(result.url).searchParams;
            const code = params.get("code");

            if (!code) throw new Error("No code returned");

            const { accessToken, refreshToken, user } = await authenticateWithCode({
                code,
            });

            await storage.setItem("refreshToken", refreshToken);
            await storage.setItem("accessToken", accessToken);
            await storage.setItem("user", JSON.stringify(user));

            // Proceed after successful login
            setIsGoogleLoading(false);
            actionSheetRef.current?.hide();
            onLogin();

        } catch (error) {
            setIsGoogleLoading(false);
            console.error("Google login error:", error);
            Alert.alert("Login Failed", "There was an error signing in with Google.");
        }
    };

    return (
        <ActionSheet
            ref={actionSheetRef}
            gestureEnabled={true}
            indicatorStyle={{
                backgroundColor: '#E0E0E0',
                width: 40,
            }}
            containerStyle={{
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
            }}
        >
            <View style={styles.container}>
                <View style={styles.logoContainer}>
                    <Image
                        source={require('@/assets/images/app-icon.png')}
                        style={styles.logoImage}
                    />
                </View>
                <ThemedText type="subtitle" style={styles.title}>Welcome to Youniq</ThemedText>
                <ThemedText style={styles.subtitle}>Sign in to start earning from your content.</ThemedText>

                <View style={styles.buttonContainer}>
                    <Pressable
                        style={[styles.loginButton, styles.appleButton, isAppleLoading && styles.disabledButton]}
                        onPress={handleLoginPress}
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
        </ActionSheet>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 24,
        alignItems: 'center',
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        marginBottom: 20,
        overflow: 'hidden',
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
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
