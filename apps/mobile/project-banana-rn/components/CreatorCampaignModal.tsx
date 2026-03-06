import { useState } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Modal,
    Dimensions,
} from 'react-native';
import { Carousel, PageControlPosition } from 'react-native-ui-lib';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CreatorCampaignModalProps {
    visible: boolean;
    onDismiss: () => void;
}

const onboardReviewImage = require('@/assets/images/onboard-review.png');
const onboardPostImage = require('@/assets/images/onboard-post.png');

interface StepData {
    id: string;
    title: string;
    description: string;
    image: any;
}

const THEME_COLOR = '#F39C12';

const campaignSteps: StepData[] = [
    {
        id: '1',
        title: 'Reach 10k Views',
        description: 'Get 10,000 total views on your videos to unlock Creator Campaigns.',
        image: onboardReviewImage,
    },
    {
        id: '2',
        title: 'Guaranteed Base Pay',
        description: 'Earn a guaranteed RM20 base pay for every approved video!',
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
                <ThemedText style={styles.stepNumber}>Step {step.id}</ThemedText>
                <ThemedText style={styles.cardTitle}>{step.title}</ThemedText>
                <ThemedText style={styles.cardDescription}>{step.description}</ThemedText>
            </View>
        </View>
    );
}

export function CreatorCampaignModal({ visible, onDismiss }: CreatorCampaignModalProps) {
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
                            color: THEME_COLOR,
                            inactiveColor: 'rgba(255, 255, 255, 0.5)',
                        }}
                    >
                        {campaignSteps.map((step) => (
                            <View key={step.id} style={styles.slideContainer}>
                                <StepCard step={step} />
                            </View>
                        ))}
                    </Carousel>
                </View>

                {/* Dismiss button */}
                <Pressable style={styles.dismissButton} onPress={onDismiss}>
                    <ThemedText style={styles.dismissButtonText}>Sounds great!</ThemedText>
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
        backgroundColor: '#FFF8F0',
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
        color: THEME_COLOR,
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
