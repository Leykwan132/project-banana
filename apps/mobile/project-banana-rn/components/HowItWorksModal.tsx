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
    Search,
    FileText,
    Video,
    CheckCircle,
    Hash,
    X,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HowItWorksModalProps {
    visible: boolean;
    onDismiss: () => void;
}

interface StepData {
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
}

const ICON_SIZE = 32;
const ICON_COLOR = '#FC4C02';

const steps: StepData[] = [
    {
        id: '1',
        icon: <Search size={ICON_SIZE} color={ICON_COLOR} />,
        title: 'Explore Campaigns',
        description: 'See the campaigns pay per view and max payouts.',
    },
    {
        id: '2',
        icon: <FileText size={ICON_SIZE} color={ICON_COLOR} />,
        title: 'Check Requirements',
        description: 'Review the requirements (scripts, assets, etc).',
    },
    {
        id: '3',
        icon: <Video size={ICON_SIZE} color={ICON_COLOR} />,
        title: 'Create & Submit Video',
        description: 'Create your video and upload it for review.',
    },
    {
        id: '4',
        icon: <CheckCircle size={ICON_SIZE} color={ICON_COLOR} />,
        title: 'Brand Review',
        description: 'The brand reviews and approves your content.',
    },
    {
        id: '5',
        icon: <Hash size={ICON_SIZE} color={ICON_COLOR} />,
        title: 'Post & Share Link',
        description: 'Publish with the hashtag and submit your post link.',
    }
];

interface StepCardProps {
    step: StepData;
}

function StepCard({ step }: StepCardProps) {
    return (
        <View style={styles.card}>
            {/* Image placeholder area */}
            <View style={styles.imagePlaceholder}>

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

export function HowItWorksModal({ visible, onDismiss }: HowItWorksModalProps) {
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
                        {steps.map((step) => (
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
    closeButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
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
        backgroundColor: '#F8F8F8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderContent: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFF3ED',
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
        color: '#FC4C02',
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
        backgroundColor: '#000000',
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
