import { View, StyleSheet, Pressable, Image } from 'react-native';
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { ThemedText } from '@/components/themed-text';

interface LoginActionSheetProps {
    actionSheetRef: React.RefObject<ActionSheetRef | null>;
    onLogin: () => void;
}

export function LoginActionSheet({
    actionSheetRef,
    onLogin,
}: LoginActionSheetProps) {
    const colorScheme = useColorScheme();

    const handleLoginPress = () => {
        actionSheetRef.current?.hide();
        onLogin();
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
                    <Pressable style={[styles.loginButton, styles.appleButton]} onPress={handleLoginPress}>
                        <AntDesign name="apple" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                        <ThemedText style={styles.appleButtonText}>Continue with Apple</ThemedText>
                    </Pressable>

                    <Pressable style={[styles.loginButton, styles.googleButton]} onPress={handleLoginPress}>
                        <AntDesign name="google" size={20} color="#000000" style={styles.buttonIcon} />
                        <ThemedText style={styles.googleButtonText}>Continue with Google</ThemedText>
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
