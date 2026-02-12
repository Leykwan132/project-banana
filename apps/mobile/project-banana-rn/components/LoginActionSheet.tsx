import { View, StyleSheet, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { AntDesign } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { authClient } from "@/lib/auth-client";
interface LoginActionSheetProps {
    actionSheetRef: React.RefObject<ActionSheetRef | null>;
    onLogin: () => void;
}

export function LoginActionSheet({
    actionSheetRef,
    onLogin,
}: LoginActionSheetProps) {
    const colorScheme = useColorScheme();
    const { data: session } = authClient.useSession();
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isAppleLoading, setIsAppleLoading] = useState(false);

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
            const { data, error } = await authClient.signIn.social({
                provider: "google",
                callbackURL: "/onboarding", // this will be converted to a deep link (eg. `myapp://dashboard`) on native
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
                actionSheetRef.current?.hide();
                onLogin();
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
