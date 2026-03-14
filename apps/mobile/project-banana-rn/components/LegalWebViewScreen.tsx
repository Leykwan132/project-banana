import { Pressable, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type LegalWebViewScreenProps = {
    title: string;
    url: string;
};

export function LegalWebViewScreen({ title, url }: LegalWebViewScreenProps) {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const screenBackgroundColor = isDark ? theme.screenBackground : '#F4F3EE';
    const surfaceColor = isDark ? '#171717' : '#FBFAF7';
    const borderColor = isDark ? '#303030' : '#E4DED2';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: screenBackgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={[styles.backButton, { borderColor, backgroundColor: surfaceColor }]}
                >
                    <ArrowLeft size={24} color={theme.text} />
                </Pressable>
                <ThemedText type="title" style={styles.headerTitle}>
                    {title}
                </ThemedText>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                <View style={[styles.webViewCard, { borderColor, backgroundColor: surfaceColor }]}>
                    <WebView
                        source={{ uri: url }}
                        style={styles.webView}
                        originWhitelist={['*']}
                        startInLoadingState
                        setSupportMultipleWindows={false}
                    />
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
        lineHeight: 22,
        fontFamily: 'GoogleSans_700Bold',
        textTransform: 'capitalize',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 24,
    },
    webViewCard: {
        flex: 1,
        overflow: 'hidden',
        borderWidth: 1,
        borderRadius: 24,
    },
    webView: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});
