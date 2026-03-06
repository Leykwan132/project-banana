import { useState } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Modal,
    Dimensions,
} from 'react-native';
import { Carousel, PageControlPosition } from 'react-native-ui-lib';
import {
    Flame,
    UserCircle,
    Hash,
    Banknote,
} from 'lucide-react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface NewAccountModalProps {
    visible: boolean;
    onDismiss: () => void;
}

const onboardPublicImage = require('@/assets/images/onboard-ig.png');
const onboardCampaignImage = require('@/assets/images/onboard-campaign.png');
const onboardSubmitVideoImage = require('@/assets/images/onboard-submit-video.png');
const onboardPostImage = require('@/assets/images/onboard-post.png');

interface StepData {
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    image: any;
}

const ICON_SIZE = 32;
const ICON_COLOR = '#00897B';

const newAccountSteps: StepData[] = [
    {
        id: '1',
        icon: <UserCircle size={ICON_SIZE} color={ICON_COLOR} />,
        title: 'Set Up Your Account',
        description:
            'Choose a clean username, add your name, and write a simple bio so people know who you are.',
        image: onboardPublicImage,
    },
    {
        id: '2',
        icon: <Flame size={ICON_SIZE} color={ICON_COLOR} />,
        title: 'Warm Up Your Account',
        description:
            'Search for a topic in your niche, then start following and engaging with other creators.',
        image: onboardCampaignImage,
    },
    {
        id: '3',
        icon: <Hash size={ICON_SIZE} color={ICON_COLOR} />,
        title: 'Posting Hygiene',
        description:
            'Always include relevant hashtags and write a good caption—like asking a question—to encourage comments.',
        image: onboardSubmitVideoImage,
    },
    {
        id: '4',
        icon: <Banknote size={ICON_SIZE} color={ICON_COLOR} />,
        title: 'Get Paid',
        description:
            'Every approved video will get a 20 ringgit base payout after you hit 10k views.',
        image: onboardPostImage,
    },
];

interface StepCardProps {
    step: StepData;
}

function StepCard({ step }: StepCardProps) {
    return (
        <View style={styles.card}>
            {/* Image area */}
            <View style={styles.imagePlaceholder}>
                <Image
                    source={step.image}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                />
            </View>

            {/* Content */}
            <View style={styles.cardContent}>
                <ThemedText style={styles.stepNumber}>Tip {step.id}</ThemedText>
                <ThemedText style={styles.cardTitle}>{step.title}</ThemedText>
                <ThemedText style={styles.cardDescription}>{step.description}</ThemedText>
            </View>
        </View>
    );
}

export function NewAccountModal({ visible, onDismiss }: NewAccountModalProps) {
    const [currentPage, setCurrentPage] = useState(0);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onDismiss}
        >
            <View style={styles.overlay}>
                {/* Carousel container */}
                <View style={styles.carouselWrapper}>
                    <Carousel
                        autoplay
                        autoplayInterval={4000}
                        loop
                        onChangePage={setCurrentPage}
                        containerStyle={styles.carouselContainer}
                        pageControlPosition={PageControlPosition.UNDER}
                        pageControlProps={{
                            size: 8,
                            spacing: 8,
                            color: '#FC4C02',
                            inactiveColor: 'rgba(255, 255, 255, 0.5)',
                        }}
                    >
                        {newAccountSteps.map((step) => (
                            <View key={step.id} style={styles.slideContainer}>
                                <StepCard step={step} />
                            </View>
                        ))}
                    </Carousel>
                </View>

                {/* Dismiss button */}
                <Pressable style={styles.dismissButton} onPress={onDismiss}>
                    <ThemedText style={styles.dismissButtonText}>Got it!</ThemedText>
                </Pressable>
            </View>
        </Modal>
    );
}

const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.7;

const styles = StyleSheet.create({
    overlay: {
        paddingTop: 20,
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    carouselWrapper: {
        width: SCREEN_WIDTH,
        height: CARD_HEIGHT + 60,
    },
    carouselContainer: {
        flex: 1,
    },
    slideContainer: {
        width: SCREEN_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
    },
    imagePlaceholder: {
        height: CARD_HEIGHT * 0.7,
        backgroundColor: '#F0FAF9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNumber: {
        fontSize: 12,
        fontFamily: 'GoogleSans_600SemiBold',
        color: '#00897B',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 22,
        fontFamily: 'GoogleSans_700Bold',
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 15,
        fontFamily: 'GoogleSans_400Regular',
        color: '#666666',
        textAlign: 'center',
        lineHeight: 22,
    },
    dismissButton: {
        width: CARD_WIDTH,
        backgroundColor: 'black',
        borderRadius: 100,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    dismissButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
});
