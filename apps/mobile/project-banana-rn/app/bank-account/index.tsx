import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo } from 'react';
import Animated, {
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    useSharedValue
} from 'react-native-reanimated';
import { useQuery } from 'convex/react';
import LottieView from 'lottie-react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ApplicationStatus, ApplicationStatusBadge } from '@/components/ApplicationStatusBadge';
import { Image } from 'expo-image';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { BANK_OPTIONS } from '@/constants/banks';
import { BankAccountSourceType } from '@/constants/sourceType';

type BankAccountStatus = 'active' | 'pending' | 'rejected';

interface BankAccount {
    id: string;
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    logo: string;
    status: BankAccountStatus;
}

const BankAccountSkeleton = ({ backgroundColor }: { backgroundColor: string }) => {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 800 }),
                withTiming(0.3, { duration: 800 })
            ),
            -1,
            true
        );
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.skeletonItem, animatedStyle, { backgroundColor }]} />
    );
};

export default function BankAccountScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const screenBackgroundColor = isDark ? theme.screenBackground : '#F4F3EE';
    const cardBackgroundColor = isDark ? '#171717' : '#FBFAF7';
    const cardBorderColor = isDark ? '#303030' : '#E4DED2';
    const elevatedBackgroundColor = isDark ? '#1F1F1F' : '#FFFFFF';
    const dividerColor = isDark ? '#2A2A2A' : '#E7E2D8';
    const mutedTextColor = isDark ? '#A3A3A3' : '#6B7280';
    const primaryButtonBackgroundColor = isDark ? '#F3F1EA' : '#000000';
    const primaryButtonTextColor = isDark ? '#111111' : '#FFFFFF';

    const user = useQuery(api.users.getUser);
    const bankAccounts = useQuery(api.bankAccounts.getUserBankAccounts, { sourceType: BankAccountSourceType.Creator });

    const isLoading = bankAccounts === undefined || user === undefined;

    const mappedBankAccounts: BankAccount[] = useMemo(() => {
        if (!bankAccounts || !user) return [];

        return bankAccounts.map((account) => {
            // Map Convex status to local status
            let status: BankAccountStatus = 'pending';
            if (account.status === 'verified') status = 'active';
            if (account.status === 'rejected') status = 'rejected';

            const bank = BANK_OPTIONS.find(b => b.name === account.bank_name);

            return {
                id: account._id,
                bankName: account.bank_name,
                accountHolder: account.account_holder_name ?? user.name ?? 'User',
                accountNumber: account.account_number,
                logo: bank?.logo ?? 'https://companieslogo.com/img/orig/1295.KL-b182747d.png?t=1720244493', // Fallback
                status: status,
            };
        });
    }, [bankAccounts, user]);

    const renderBankAccount = ({ item }: { item: BankAccount }) => {
        const mappedStatus: ApplicationStatus =
            item.status === 'active' ? 'Active' :
                item.status === 'pending' ? 'Under Review' :
                    'Rejected';

        const handlePress = () => {
            router.push({
                pathname: '/bank-account/[id]',
                params: { id: item.id },
            });
        };

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.bankCard,
                    {
                        backgroundColor: cardBackgroundColor,
                        borderColor: cardBorderColor,
                    },
                    { opacity: pressed ? 0.7 : 1 }
                ]}
                onPress={handlePress}
            >
                <View style={[styles.bankLogoContainer, { backgroundColor: '#FFFFFF', borderColor: isDark ? '#2A2A2A' : '#E7E2D8' }]}>
                    <Image source={{ uri: item.logo }} style={styles.bankLogo} contentFit="contain" />
                </View>
                <View style={styles.bankInfo}>
                    <ThemedText type="defaultSemiBold">{item.bankName}</ThemedText>
                    <View style={styles.bankDetailsRow}>
                        <ThemedText style={[styles.bankDetailText, { color: mutedTextColor }]}>{item.accountNumber}</ThemedText>
                    </View>
                </View>
                <ApplicationStatusBadge status={mappedStatus} />
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: screenBackgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={[styles.backButton, { borderColor: cardBorderColor, backgroundColor: elevatedBackgroundColor }]}>
                    <ArrowLeft size={24} color={theme.text} />
                </Pressable>
                <ThemedText type="title" style={styles.headerTitle}>
                    Bank Accounts
                </ThemedText>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                    My Bank Accounts
                </ThemedText>

                {isLoading ? (
                    <View>
                        {[...Array(3)].map((_, i) => (
                            <BankAccountSkeleton
                                key={i}
                                backgroundColor={isDark ? '#1F1F1F' : '#ECE8DF'}
                            />
                        ))}
                    </View>
                ) : mappedBankAccounts.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        <LottieView
                            source={require('@/assets/lotties/not-found.json')}
                            autoPlay
                            loop
                            style={styles.lottie}
                        />
                        <ThemedText style={[styles.emptyStateText, { color: isDark ? '#D4D4D4' : '#4B5563' }]}>
                            No bank accounts found
                        </ThemedText>
                        <ThemedText style={[styles.emptyStateSubtext, { color: isDark ? '#8A8A8A' : '#9CA3AF' }]}>
                            Add a bank account to start receiving payouts
                        </ThemedText>
                    </View>
                ) : (
                    <FlatList
                        data={mappedBankAccounts}
                        renderItem={renderBankAccount}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {/* Add Bank Account Button */}
            <View style={[styles.footer, { backgroundColor: screenBackgroundColor, borderTopColor: dividerColor }]}>
                <Pressable
                    style={[styles.addButton, { backgroundColor: primaryButtonBackgroundColor }]}
                    onPress={() => router.push('/bank-account/add' as any)}
                >
                    <Plus size={20} color={primaryButtonTextColor} />
                    <ThemedText style={[styles.addButtonText, { color: primaryButtonTextColor }]}>Add Bank Account</ThemedText>
                </Pressable>
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
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
        marginBottom: 16,
    },
    listContent: {
        paddingBottom: 100,
    },
    bankCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#fff',
    },
    bankLogoContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        overflow: 'hidden',
    },
    bankLogo: {
        width: 24,
        height: 24,
    },
    bankInfo: {
        flex: 1,
    },
    bankDetailsRow: {
        flexDirection: 'row',
        marginTop: 4,
    },
    bankDetailText: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
    },
    separator: {
        height: 12,
    },
    footer: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    addButton: {
        backgroundColor: '#000',
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    skeletonItem: {
        width: '100%',
        height: 80,
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        marginBottom: 12,
    },
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        gap: 8,
    },
    emptyStateText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_500Medium',
        color: '#4B5563',
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        fontFamily: 'GoogleSans_400Regular',
    },
    lottie: {
        width: 150,
        height: 150,
    },
});
