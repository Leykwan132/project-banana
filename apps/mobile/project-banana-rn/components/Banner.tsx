import { View, StyleSheet, Pressable, Image } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { ReactNode, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { HowItWorksModal } from '@/components/HowItWorksModal';

export type BannerType = 'referral' | 'cashback' | 'promo' | 'how_it_works';

interface BannerProps {
    type: BannerType;
    title?: string;
    description?: string;
    icon?: ReactNode;
    onPress?: () => void;
}

const bannerConfigs = {
    referral: {
        backgroundColor: '#E8F5E9',
        defaultTitle: 'Invite a friend',
        defaultDescription: 'to Cashon!',
    },
    cashback: {
        backgroundColor: '#FFF8E1',
        defaultTitle: 'Get Flat',
        defaultDescription: '₹100 Cashback',
    },
    promo: {
        backgroundColor: '#E3F2FD',
        defaultTitle: 'Special Offer',
        defaultDescription: 'Limited Time!',
    },
    how_it_works: {
        backgroundColor: '#E1F5FE',
        defaultTitle: 'New to Youniq?',
        defaultDescription: 'See how it works',
    },
};

export function Banner({ type, title, description, icon, onPress }: BannerProps) {
    const config = bannerConfigs[type];
    const [showHowItWorks, setShowHowItWorks] = useState(false);

    const handlePress = () => {
        if (type === 'how_it_works') {
            setShowHowItWorks(true);
        } else if (onPress) {
            onPress();
        }
    };

    return (
        <>
            <Pressable style={styles.container} onPress={handlePress}>
                <View style={styles.banner}>
                    {/* Left: Icon with colored background */}
                    <View style={styles.iconContainer}>
                        {icon || (
                            <Image
                                source={require('@/assets/images/app-icon.png')}
                                style={styles.appIcon}
                                resizeMode="contain"
                            />
                        )}
                    </View>

                    {/* Right: Black section with title and arrow */}
                    <View style={styles.contentContainer}>
                        <View style={styles.titleContainer}>
                            <ThemedText style={styles.title}>
                                {title || config.defaultTitle}
                            </ThemedText>
                            <ThemedText style={styles.description}>
                                {description || config.defaultDescription}
                            </ThemedText>
                        </View>

                        <View style={styles.arrowContainer}>
                            <ChevronRight size={24} color="#FFFFFF" />
                        </View>
                    </View>
                </View>
            </Pressable>

            <HowItWorksModal
                visible={showHowItWorks}
                onDismiss={() => setShowHowItWorks(false)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    banner: {
        borderWidth: 1,
        borderColor: '#EEEEEE',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        overflow: 'hidden',
    },
    iconContainer: {
        width: 64,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
    },
    appIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },
    contentContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#000000',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: 13,
        fontFamily: 'GoogleSans_400Regular',
        color: '#FFFFFF',
        lineHeight: 18,
        marginBottom: 2,
    },
    description: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
        color: '#FFFFFF',
        lineHeight: 24,
    },
    arrowContainer: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
