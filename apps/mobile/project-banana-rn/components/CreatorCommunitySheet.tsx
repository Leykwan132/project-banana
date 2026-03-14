import { View, StyleSheet, Pressable, Linking, Alert, ScrollView } from 'react-native';
import ActionSheet, { ActionSheetRef } from 'react-native-actions-sheet';
import { ArrowRight } from 'lucide-react-native';
import { Image as ExpoImage } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { CREATOR_COMMUNITY_URL } from '@/constants/support';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CreatorCommunitySheetProps {
    actionSheetRef: React.RefObject<ActionSheetRef | null>;
}

const communityBenefits = [
    {
        title: 'Workshops',
        description: 'Quick ways to improve your content.',
        backgroundColor: '#4E35E5',
        accentColor: '#F68A58',
        accentSoftColor: '#FFE2C4',
        shape: 'stack',
    },
    {
        title: 'Connections',
        description: 'Meet creators and swap ideas fast.',
        backgroundColor: '#1F6A46',
        accentColor: '#F0B6DC',
        accentSoftColor: '#FFEAF6',
        shape: 'petal',
    },
    {
        title: 'Feature requests',
        description: 'Tell us what Lumina should build next.',
        backgroundColor: '#314A8D',
        accentColor: '#A4D4FF',
        accentSoftColor: '#E4F3FF',
        shape: 'ribbon',
    },
    {
        title: 'Announcements',
        description: 'Catch updates and launches first.',
        backgroundColor: '#A24617',
        accentColor: '#FFD36B',
        accentSoftColor: '#FFF3CB',
        shape: 'burst',
    },
];

export function CreatorCommunitySheet({ actionSheetRef }: CreatorCommunitySheetProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const cardBorderColor = isDark ? '#303030' : '#E4DED2';
    const cardDividerColor = isDark ? '#2A2A2A' : '#E7E2D8';
    const badgeBackgroundColor = isDark ? '#111111' : '#F3EEE3';
    const badgeLabelColor = isDark ? '#9CA3AF' : '#6F6758';
    const screenBackgroundColor = isDark ? theme.screenBackground : '#F4F3EE';
    const accentColor = '#FC4C02';

    const handleJoinCommunityPress = () => {
        actionSheetRef.current?.hide();
        setTimeout(() => {
            Linking.openURL(CREATOR_COMMUNITY_URL).catch(() => {
                Alert.alert('Unable to open link', 'Please try again in a moment.');
            });
        }, 250);
    };

    const renderCommunityShape = (
        shape: string,
        accentColorValue: string,
        accentSoftColorValue: string,
    ) => {
        if (shape === 'stack') {
            return (
                <View style={styles.communityArt}>
                    <View style={[styles.communityShapeStackBlock, { backgroundColor: accentColorValue }]} />
                    <View style={[styles.communityShapeStackBlockSmall, { backgroundColor: accentColorValue }]} />
                    <View style={[styles.communityShapeOrb, { backgroundColor: accentSoftColorValue }]} />
                    <View style={styles.communityShapeDot} />
                </View>
            );
        }

        if (shape === 'petal') {
            return (
                <View style={styles.communityArt}>
                    <View style={[styles.communityShapePetalLeft, { backgroundColor: accentColorValue }]} />
                    <View style={[styles.communityShapePetalRight, { backgroundColor: accentColorValue }]} />
                    <View style={[styles.communityShapeOrb, { backgroundColor: accentSoftColorValue }]} />
                    <View style={styles.communityShapeDot} />
                </View>
            );
        }

        if (shape === 'ribbon') {
            return (
                <View style={styles.communityArt}>
                    <View style={[styles.communityShapeRibbonMain, { backgroundColor: accentColorValue }]} />
                    <View style={[styles.communityShapeRibbonTail, { backgroundColor: accentSoftColorValue }]} />
                    <View style={styles.communityShapeDot} />
                </View>
            );
        }

        return (
            <View style={styles.communityArt}>
                <View style={[styles.communityShapeBurstTall, { backgroundColor: accentColorValue }]} />
                <View style={[styles.communityShapeBurstWide, { backgroundColor: accentSoftColorValue }]} />
                <View style={styles.communityShapeDot} />
            </View>
        );
    };

    return (
        <ActionSheet
            ref={actionSheetRef}
            gestureEnabled
            containerStyle={{ backgroundColor: screenBackgroundColor }}
            indicatorStyle={{ backgroundColor: cardDividerColor }}
        >
            <View style={[styles.communitySheetContent, { backgroundColor: screenBackgroundColor }]}>
                <View style={styles.communityHeader}>
                    <View style={[styles.communityBadge, { backgroundColor: badgeBackgroundColor, borderColor: cardBorderColor }]}>
                        <ExpoImage
                            source={require('../assets/images/icon.svg')}
                            style={styles.communityHeroIcon}
                            contentFit="contain"
                        />
                    </View>

                    <ThemedText type="title" style={styles.communityTitle}>
                        Join our creator community
                    </ThemedText>
                    <ThemedText style={[styles.communitySubtitle, { color: badgeLabelColor }]}>
                        A place to connect and grow together.
                    </ThemedText>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    decelerationRate="fast"
                    snapToInterval={190}
                    snapToAlignment="start"
                    contentContainerStyle={styles.communityBenefits}
                >
                    {communityBenefits.map((benefit) => (
                        <View
                            key={benefit.title}
                            style={[
                                styles.communityBenefitCard,
                                { backgroundColor: benefit.backgroundColor },
                            ]}
                        >
                            <View style={styles.communityBenefitCopy}>
                                <ThemedText style={styles.communityBenefitTitle}>{benefit.title}</ThemedText>
                                <ThemedText style={styles.communityBenefitDescription}>
                                    {benefit.description}
                                </ThemedText>
                            </View>
                            {renderCommunityShape(benefit.shape, benefit.accentColor, benefit.accentSoftColor)}
                        </View>
                    ))}
                </ScrollView>

                <View style={styles.communityFooter}>
                    <Pressable
                        style={[styles.communityCtaButton, { backgroundColor: accentColor }]}
                        onPress={handleJoinCommunityPress}
                    >
                        <ThemedText style={styles.communityCtaText}>Join now</ThemedText>
                        <ArrowRight size={18} color="#FFFFFF" />
                    </Pressable>
                </View>
            </View>
        </ActionSheet>
    );
}

const styles = StyleSheet.create({
    communitySheetContent: {
        paddingTop: 20,
        paddingBottom: 24,
        alignItems: 'center',
        width: '100%',
    },
    communityHeader: {
        width: '100%',
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    communityBadge: {
        width: 72,
        height: 72,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    communityHeroIcon: {
        width: 42,
        height: 42,
    },
    communityTitle: {
        fontSize: 24,
        textAlign: 'center',
    },
    communitySubtitle: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        fontFamily: 'GoogleSans_400Regular',
        marginBottom: 28,
    },
    communityBenefits: {
        paddingLeft: 16,
        paddingRight: 24,
        marginBottom: 24,
        gap: 14,
    },
    communityBenefitCard: {
        width: 176,
        minHeight: 220,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 18,
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
    },
    communityArt: {
        position: 'absolute',
        right: -4,
        bottom: -6,
        width: 118,
        height: 112,
    },
    communityShapeStackBlock: {
        position: 'absolute',
        left: 4,
        bottom: 12,
        width: 76,
        height: 76,
        borderRadius: 26,
        transform: [{ rotate: '-23deg' }],
    },
    communityShapeStackBlockSmall: {
        position: 'absolute',
        left: 28,
        bottom: 36,
        width: 30,
        height: 30,
        borderRadius: 10,
        transform: [{ rotate: '-23deg' }],
    },
    communityShapePetalLeft: {
        position: 'absolute',
        left: 24,
        bottom: 10,
        width: 52,
        height: 84,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 40,
        transform: [{ rotate: '-24deg' }],
    },
    communityShapePetalRight: {
        position: 'absolute',
        left: 50,
        bottom: 10,
        width: 52,
        height: 84,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 10,
        transform: [{ rotate: '24deg' }],
    },
    communityShapeRibbonMain: {
        position: 'absolute',
        left: 16,
        bottom: 16,
        width: 88,
        height: 56,
        borderRadius: 20,
        transform: [{ rotate: '-14deg' }],
    },
    communityShapeRibbonTail: {
        position: 'absolute',
        left: 54,
        bottom: 44,
        width: 36,
        height: 36,
        borderRadius: 12,
        transform: [{ rotate: '18deg' }],
    },
    communityShapeBurstTall: {
        position: 'absolute',
        left: 22,
        bottom: 12,
        width: 40,
        height: 88,
        borderRadius: 24,
        transform: [{ rotate: '-16deg' }],
    },
    communityShapeBurstWide: {
        position: 'absolute',
        left: 44,
        bottom: 28,
        width: 64,
        height: 40,
        borderRadius: 20,
        transform: [{ rotate: '16deg' }],
    },
    communityShapeOrb: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 62,
        height: 62,
        borderRadius: 31,
    },
    communityShapeDot: {
        position: 'absolute',
        right: 18,
        bottom: 24,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#1C1C1C',
        opacity: 0.9,
    },
    communityBenefitCopy: {
        alignItems: 'flex-start',
        maxWidth: 132,
    },
    communityBenefitTitle: {
        fontSize: 16,
        lineHeight: 20,
        fontFamily: 'GoogleSans_700Bold',
        marginBottom: 6,
        color: '#FFFFFF',
    },
    communityBenefitDescription: {
        fontSize: 13,
        lineHeight: 18,
        fontFamily: 'GoogleSans_400Regular',
        color: 'rgba(255,255,255,0.82)',
    },
    communityFooter: {
        width: '100%',
        paddingHorizontal: 16,
    },
    communityCtaButton: {
        minHeight: 56,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 20,
        alignSelf: 'stretch',
    },
    communityCtaText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
});
