import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRef, useState } from 'react';
import { usePostHog } from 'posthog-react-native';
import { ArrowRight } from 'lucide-react-native';
import { ActionSheetRef } from 'react-native-actions-sheet';

import { CreatorCommunitySheet } from '@/components/CreatorCommunitySheet';
import { HowItWorksModal } from '@/components/HowItWorksModal';
import { NewAccountModal } from '@/components/NewAccountModal';
import { CreatorCampaignModal } from '@/components/CreatorCampaignModal';
import { ThemedText } from '@/components/themed-text';

export enum BannerType {
    HOW_IT_WORKS = 'how_it_works',
    REFERRAL = 'referral',
    CASHBACK = 'cashback',
    PROMO = 'promo',
    NEW_ACCOUNT = 'new_account',
    CREATOR_CAMPAIGN = 'creator_campaign',
    LUMINA_CIRCLE = 'lumina_circle',
}

interface BannerProps {
    type: BannerType;
    title?: string;
    description?: string;
}

const defaultConfigs: Record<BannerType, { title: string, description: string, bg: string, titleColor: string, descColor: string }> = {
    [BannerType.HOW_IT_WORKS]: {
        title: 'New here?',
        description: 'Learn how Lumina help you earn with making online contents.',
        bg: '#5A8BEB',
        titleColor: '#C4E1FF',
        descColor: '#FFFFFF',
    },
    [BannerType.REFERRAL]: {
        title: 'Invite Friends',
        description: 'Share Lumina and earn more together.',
        bg: '#6C5CE7',
        titleColor: '#E8E5FF',
        descColor: '#FFFFFF',
    },
    [BannerType.CASHBACK]: {
        title: 'Get Cashback',
        description: 'Earn real cash on your daily purchases.',
        bg: '#F39C12',
        titleColor: '#FFF1E0',
        descColor: '#FFFFFF',
    },
    [BannerType.PROMO]: {
        title: 'Special Promo',
        description: 'Don\'t miss out on these limited time offers.',
        bg: '#E84393',
        titleColor: '#FFE0F0',
        descColor: '#FFFFFF',
    },
    [BannerType.NEW_ACCOUNT]: {
        title: 'Starting Fresh?',
        description: 'Tips to warm up and grow your brand-new account.',
        bg: '#00897B',
        titleColor: '#B2DFDB',
        descColor: '#FFFFFF',
    },
    [BannerType.CREATOR_CAMPAIGN]: {
        title: 'Creator Campaign',
        description: 'Get guaranteed payouts for every approved video.',
        bg: '#F39C12',
        titleColor: '#FFF1E0',
        descColor: '#FFFFFF',
    },
    [BannerType.LUMINA_CIRCLE]: {
        title: 'Lumina Circle',
        description: 'Connect, learn, and stay updated with our creator community.',
        bg: '#1F6A46',
        titleColor: '#D7F5E4',
        descColor: '#FFFFFF',
    },
};

export function Banner({ type, title, description }: BannerProps) {
    const creatorCommunitySheetRef = useRef<ActionSheetRef>(null);
    const [showHowItWorks, setShowHowItWorks] = useState(false);
    const [showNewAccount, setShowNewAccount] = useState(false);
    const [showCreatorCampaign, setShowCreatorCampaign] = useState(false);
    const posthog = usePostHog();

    const config = defaultConfigs[type];
    const displayTitle = title || config.title;
    const displayDescription = description || config.description;

    const handlePress = () => {
        posthog.capture('banner_opened', { banner_type: type });

        switch (type) {
            case BannerType.HOW_IT_WORKS:
                setShowHowItWorks(true);
                break;
            case BannerType.REFERRAL:
                // TODO: Navigate to referral screen
                break;
            case BannerType.CASHBACK:
                // TODO: Navigate to cashback screen
                break;
            case BannerType.PROMO:
                // TODO: Navigate to promo screen
                break;
            case BannerType.NEW_ACCOUNT:
                setShowNewAccount(true);
                break;
            case BannerType.CREATOR_CAMPAIGN:
                setShowCreatorCampaign(true);
                break;
            case BannerType.LUMINA_CIRCLE:
                creatorCommunitySheetRef.current?.show();
                break;
        }
    };

    return (
        <>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={handlePress}
                style={[styles.container, { backgroundColor: config.bg }]}
            >
                <View style={styles.content}>
                    <View style={styles.titleRow}>
                        <ThemedText style={[styles.title, { color: config.titleColor }]}>
                            {displayTitle}
                        </ThemedText>
                        <View style={styles.badge}>
                            <ArrowRight size={12} color="#FFFFFF" strokeWidth={3} />
                        </View>
                    </View>
                    <ThemedText style={[styles.description, { color: config.descColor }]}>
                        {displayDescription}
                    </ThemedText>
                </View>
                {/* Simulated bottom shadow to match the screenshot's depth */}
                <View style={styles.bottomShadow} />
            </TouchableOpacity>

            <HowItWorksModal
                visible={showHowItWorks}
                onDismiss={() => setShowHowItWorks(false)}
            />

            <NewAccountModal
                visible={showNewAccount}
                onDismiss={() => setShowNewAccount(false)}
            />

            <CreatorCampaignModal
                visible={showCreatorCampaign}
                onDismiss={() => setShowCreatorCampaign(false)}
            />

            <CreatorCommunitySheet actionSheetRef={creatorCommunitySheetRef} />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        justifyContent: 'center',
        paddingTop: 24,
        paddingBottom: 32,
        paddingHorizontal: 24,
        position: 'relative',
    },
    content: {
        alignItems: 'center',
        zIndex: 2,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        gap: 8,
    },
    title: {
        fontSize: 32,
        fontFamily: 'GoogleSans_700Bold',
        letterSpacing: -0.5,
        textAlign: 'center',
        flexShrink: 1,
        lineHeight: 42,
    },
    badge: {
        width: 20,
        height: 20,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF',
        // Slight nudge to align visually with the large text
        marginTop: 2,
    },
    description: {
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 24,
    },
    bottomShadow: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
        zIndex: 1,
    },
});
