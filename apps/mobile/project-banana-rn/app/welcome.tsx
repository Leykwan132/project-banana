import { useCallback, useEffect, useState } from 'react';
import {
    Pressable,
    StyleSheet,
    View, Image, useWindowDimensions,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
    Carousel, PageControlPosition,
} from 'react-native-ui-lib';
import { ThemedText } from '@/components/themed-text';
import { TypingText } from '@/components/ui/TypingText';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authClient } from "@/lib/auth-client";
import { useConvex } from 'convex/react';
import { api } from '../../../../packages/backend/convex/_generated/api';
import { ErrorType } from '../../../../packages/backend/convex/errors';
import { ConvexError } from "convex/values";

const CARD_IMAGES = [
    require('@/assets/images/ob-earns.png'),
    require('@/assets/images/ob-brands.png'),
    require('@/assets/images/ob-analytics.png'),
    require('@/assets/images/ob-payouts.png'),
];

interface SlideData {
    id: string;
    title: string;
    cardImage: any;
}

const slides: SlideData[] = [
    {
        id: '2',
        title: 'Discover campaigns & create',
        cardImage: CARD_IMAGES[1],
    },

    {
        id: '1',
        title: 'Get approved by brands',
        cardImage: CARD_IMAGES[0],
    },
    {
        id: '3',
        title: 'Track your live earnings',
        cardImage: CARD_IMAGES[2],
    },
    {
        id: '4',
        title: 'Earn & withdraw with ease',
        cardImage: CARD_IMAGES[3],
    },
];

interface SlideProps {
    item: SlideData;
}

function Slide({ item }: SlideProps) {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const imageSource = Image.resolveAssetSource(item.cardImage);
    const imageAspectRatio = imageSource.width / imageSource.height;
    const maxImageWidth = screenWidth;
    const maxImageHeight = screenHeight * (screenHeight < 750 ? 0.54 : 0.62);
    const heightAtMaxWidth = maxImageWidth / imageAspectRatio;
    const imageHeight = Math.min(heightAtMaxWidth, maxImageHeight);
    const imageWidth = imageHeight * imageAspectRatio;

    return (
        <View style={styles.slide}>
            <View style={styles.overlayContainer}>
                <Image
                    source={item.cardImage}
                    style={[
                        styles.cardImage,
                        {
                            width: imageWidth,
                            height: imageHeight,
                        },
                    ]}
                    resizeMode="contain"
                />

                <ThemedText style={[styles.cardTitle, { color: isDark ? '#ECEDEE' : '#000000' }]} numberOfLines={1} ellipsizeMode="tail">{item.title}</ThemedText>

            </View>
        </View>
    );
}

export default function WelcomeScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const screenBackgroundColor = isDark ? theme.screenBackground : '#F4F3EE';
    const primaryOrange = '#FC4C02';

    const [isCheckingSession, setIsCheckingSession] = useState(false);

    const convex = useConvex();

    useEffect(() => {
        const checkSession = async () => {
            const session = await authClient.getSession();
            if (session.data) {
                setIsCheckingSession(true);
                try {
                    await convex.query(api.creators.getCreator, {});
                    router.replace('/(tabs)');
                } catch (error) {
                    if (
                        error instanceof ConvexError &&
                        (error.data as { code: number }).code === ErrorType.CREATOR_NOT_FOUND.code
                    ) {
                        router.replace('/onboarding');
                    } else {
                        // For any other unexpected errors, we just stay on the welcome screen
                        console.error('Session check error:', error);
                        setIsCheckingSession(false);
                    }
                }
            }
        };
        checkSession();
    }, [convex]);

    const handleLogin = useCallback(() => {
        router.push('/login');
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: screenBackgroundColor }]}>
            <View style={[styles.brandingContainer, { paddingTop: insets.top + 20 }]}>
                <ExpoImage
                    source={require('@/assets/images/icon.svg')}
                    style={styles.brandingLogoContainer}
                    contentFit="contain"
                />
                <ThemedText type="defaultSemiBold" style={styles.brandingAppName}>Lumina</ThemedText>
            </View>
            <Carousel
                autoplay
                initialPage={0}
                containerStyle={styles.carouselContainer}
                pageControlPosition={PageControlPosition.OVER}
                pageControlProps={{
                    size: 8,
                    spacing: 8,
                    color: primaryOrange,
                    inactiveColor: isDark ? '#3A3A3A' : '#D8D0C4',
                }}
                autoplayInterval={4000}
                loop
            >
                {slides.map((slide) => (
                    <Slide key={slide.id} item={slide} />
                ))}
            </Carousel>
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24), backgroundColor: screenBackgroundColor }]}>
                <Pressable
                    style={[
                        styles.primaryButton,
                        {
                            backgroundColor: primaryOrange,
                            borderColor: primaryOrange,
                        }
                    ]}
                    onPress={handleLogin}
                >
                    <ThemedText style={styles.primaryButtonText}>Login or Sign up</ThemedText>
                </Pressable>
            </View>
            {/* Loading overlay shown while verifying session against the server */}
            {isCheckingSession && (
                <View style={[StyleSheet.absoluteFill, styles.loadingOverlay, { backgroundColor: screenBackgroundColor }]}>
                    <LottieView
                        source={require('@/assets/lotties/logging-in.json')}
                        autoPlay
                        loop
                        style={{ width: 180, height: 180 }}
                    />
                    <TypingText
                        text="Logging you in"
                        style={[styles.loadingText, { color: isDark ? '#ECEDEE' : '#000000' }]}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingOverlay: {
        alignItems: 'center',
        borderRadius: 12,
        justifyContent: 'center',
        zIndex: 9999,
    },
    loadingText: {
        marginTop: 8,
        fontSize: 18,
        fontFamily: 'GoogleSans_600SemiBold',
    },
    carouselContainer: {
        flex: 1,
    },
    slide: {
        width: '100%',
        height: '100%',
    },
    brandingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        zIndex: 10,
    },
    brandingLogoContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
    },
    brandingLogoText: {
        color: '#fff',
        fontSize: 18,
        lineHeight: 22,
    },
    brandingAppName: {
        fontSize: 20,
        fontFamily: 'GoogleSans_700Bold',
    },
    overlayContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 0,
    },
    cardImage: {
    },
    cardTitle: {
        fontSize: 22,
        fontFamily: 'GoogleSans_700Bold',
        color: '#000000',
        textAlign: 'center',
        marginTop: 18,
    },
    footer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24,
        // paddingTop: 24,
        alignItems: 'center',
    },
    primaryButton: {
        width: '100%',
        backgroundColor: '#FC4C02',
        borderRadius: 30,
        borderWidth: 1,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        zIndex: 100,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
});
