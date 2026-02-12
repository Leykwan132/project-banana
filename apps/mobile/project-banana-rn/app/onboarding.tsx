import { useCallback, useRef, useState, useEffect } from 'react';
import {
    Dimensions,
    ImageBackground,
    Pressable,
    StyleSheet,
    View, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
    Carousel, PageControlPosition,
    TouchableOpacity
} from 'react-native-ui-lib';

import { ActionSheetRef } from 'react-native-actions-sheet';

import { ThemedText } from '@/components/themed-text';
import { LoginActionSheet } from '@/components/LoginActionSheet';
import { authClient } from "@/lib/auth-client";


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_DEVICE = SCREEN_HEIGHT < 750; // Threshold for smaller/shorter devices


const CARD_IMAGES = [
    require('@/assets/images/ob-earns.png'),
    require('@/assets/images/ob-brands.png'),
    require('@/assets/images/ob-analytics.png'),
    require('@/assets/images/ob-payouts.png'),
];

interface SlideData {
    id: string;
    title: string;
    subtitle: string;
    cardImage: any;
}

const slides: SlideData[] = [
    {
        id: '1',
        title: 'Turn content into income',
        subtitle: "If you can make videos, you're in.",
        cardImage: CARD_IMAGES[0],
    },

    {
        id: '2',
        title: 'Work with brands directly.',
        subtitle: 'Choose campaigns you love.',
        cardImage: CARD_IMAGES[1],
    },
    {
        id: '3',
        title: 'Performance-based pay',
        subtitle: 'Earn based on views, not followers.',
        cardImage: CARD_IMAGES[2],
    },


    {
        id: '4',
        title: 'Fast payouts guaranteed.',
        subtitle: 'Money credited within 3-5 days.',
        cardImage: CARD_IMAGES[3],
    },
];

interface SlideProps {
    item: SlideData;
}

function Slide({ item }: SlideProps) {
    return (
        <View style={styles.slide}>
            {/* Card + Title Section - positioned to overlap */}
            <View style={styles.overlayContainer}>

                <Image
                    source={item.cardImage}
                    style={styles.cardImage}
                    // width={200}
                    // height={200}
                    borderRadius={24}
                    resizeMode="contain"
                />

                <ThemedText style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">{item.title}</ThemedText>
                <ThemedText style={styles.cardSubtitle} >{item.subtitle}</ThemedText>

            </View>
        </View>
    );
}

export default function OnboardingScreen() {
    const insets = useSafeAreaInsets();
    const [currentPage, setCurrentPage] = useState(0);

    const loginActionSheetRef = useRef<ActionSheetRef>(null);

    useEffect(() => {
        const checkSession = async () => {
            const session = await authClient.getSession();
            if (session.data) {
                router.replace('/(tabs)');
            }
        };
        checkSession();
    }, []);

    const handleLogin = useCallback(() => {
        console.log('pressing login')
        loginActionSheetRef.current?.show();

    }, []);

    const onActualLogin = useCallback(() => {
        router.replace('/(tabs)');
    }, []);


    const onChangePage = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    return (
        <View style={styles.container}>
            <View style={[styles.brandingContainer, { paddingTop: insets.top + 20 }]}>
                <View style={styles.brandingLogoContainer}>
                    <ThemedText type="title" style={styles.brandingLogoText}>✦</ThemedText>
                </View>
                <ThemedText type="defaultSemiBold" style={styles.brandingAppName}>Youniq</ThemedText>
            </View>
            <Carousel
                autoplay
                onChangePage={onChangePage}
                initialPage={0}
                containerStyle={styles.carouselContainer}
                pageControlPosition={PageControlPosition.UNDER}
                pageControlProps={{
                    size: 8,
                    spacing: 8,
                    color: '#FC4C02',
                    inactiveColor: '#D9D9D9',
                }}
                autoplayInterval={4000}
                loop
            >
                {slides.map((slide) => (
                    <Slide key={slide.id} item={slide} />
                ))}
            </Carousel>
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                <Pressable style={styles.primaryButton} onPress={handleLogin}>
                    <ThemedText style={styles.primaryButtonText}>Login or Sign up</ThemedText>
                </Pressable>
            </View>
            <LoginActionSheet
                actionSheetRef={loginActionSheetRef}
                onLogin={onActualLogin}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    carouselContainer: {
        flex: 1,
    },
    slide: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.8,
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
        borderRadius: 16,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
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
        position: 'absolute',
        top: 30,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    screenshotCard: {
        width: '90%',
        aspectRatio: 9 / 16,
        maxHeight: SCREEN_HEIGHT * 0.5,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 10,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    cardHeaderDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#E0E0E0',
    },
    cardHeaderTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontFamily: 'GoogleSans_500Medium',
        color: '#333333',
    },
    cardHeaderIcon: {
        width: 6,
        height: 6,
    },
    cardContent: {
        flex: 1,
        backgroundColor: '#F8F8F8',
    },
    cardImage: {
        borderRadius: 24,
        width: SCREEN_WIDTH * 0.65,
        maxWidth: SCREEN_WIDTH * 0.62,
        aspectRatio: 8 / 16,
        maxHeight: SCREEN_HEIGHT * (IS_SMALL_DEVICE ? 0.5 : 0.6),
        backgroundColor: 'white',
        borderColor: '#E0E0E0',
        borderWidth: 1,
    },
    cardTitle: {
        marginTop: 24,
        fontSize: 22,
        fontFamily: 'GoogleSans_700Bold',
        color: '#000000',
        textAlign: 'center',
        lineHeight: 28,

    },
    footer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24,
        // paddingTop: 24,
        alignItems: 'center',
    },
    slideTitle: {
        fontSize: 24,
        fontFamily: 'GoogleSans_700Bold',
        color: '#000000',
        textAlign: 'center',
        lineHeight: 30,
        marginBottom: 16,
    },
    pagination: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
    },
    paginationDot: {
        height: 8,
        width: 8,
        borderRadius: 4,
        backgroundColor: '#D9D9D9',
    },
    paginationDotActive: {
        backgroundColor: '#FC4C02',
    },
    primaryButton: {
        width: '100%',
        backgroundColor: '#000000',
        borderRadius: 30,
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
    secondaryButton: {
        width: '100%',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        color: '#FC4C02',
        fontSize: 16,
        fontFamily: 'GoogleSans_600SemiBold',
    },
    cardSubtitle: {
        fontFamily: 'GoogleSans_400Regular',
        textAlign: 'center',
        marginTop: 8,
    }
});
