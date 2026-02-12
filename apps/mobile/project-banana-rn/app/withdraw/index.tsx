import { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import LottieView from 'lottie-react-native';
import { useMutation, useQuery } from 'convex/react';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { api } from '../../../../../packages/backend/convex/_generated/api';

import { ThemedText } from '@/components/themed-text';
import { PayoutCard } from '@/components/PayoutCard';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const BankAccountSkeleton = () => {
    const opacity = useSharedValue(0.35);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.75, { duration: 800 }),
                withTiming(0.35, { duration: 800 })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.bankSkeletonCard, animatedStyle]}>
            <View style={styles.bankSkeletonLogo} />
            <View style={styles.bankSkeletonInfo}>
                <View style={styles.bankSkeletonTitle} />
                <View style={styles.bankSkeletonMeta} />
            </View>
        </Animated.View>
    );
};

export default function WithdrawScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const [amount, setAmount] = useState('');
    const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
    const actionSheetRef = useRef<ActionSheetRef>(null);
    const [confirmStep, setConfirmStep] = useState<'review' | 'success' | 'failed'>('review');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [withdrawErrorMessage, setWithdrawErrorMessage] = useState('Something went wrong while creating your withdrawal request.');
    const requestWithdrawal = useMutation(api.payouts.requestWithdrawal);

    const balanceData = useQuery(api.users.getUserBalance);
    const bankAccountsData = useQuery(api.bankAccounts.getActiveBankAccounts);
    const isBankAccountsLoading = bankAccountsData === undefined;

    const bankAccounts = bankAccountsData?.map(account => ({
        id: account._id,
        bankName: account.bank_name,
        accountHolder: account.account_holder_name ?? 'User',
        accountNumber: account.account_number,
        logo: 'https://companieslogo.com/img/orig/1295.KL-b182747d.png?t=1720244493' // Placeholder
    })) || [];

    // Pre-select first bank account when loaded
    useEffect(() => {
        if (selectedBankId === null && bankAccounts.length > 0) {
            setSelectedBankId(bankAccounts[0].id);
        }
    }, [bankAccounts, selectedBankId]);

    const currentBalance = balanceData?.balance ?? 0;

    const handleMax = () => {
        setAmount(currentBalance.toString());
        setError('');
    };

    const handleConfirm = async () => {
        const selectedBank = bankAccounts.find((bank) => bank.id === selectedBankId);
        const parsedAmount = parseFloat(amount);

        if (!selectedBank) {
            Alert.alert('No bank account selected', 'Please select a bank account to continue.');
            return;
        }

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setError('Amount is required');
            return;
        }

        if (parsedAmount > currentBalance) {
            setError('Not enough balance');
            return;
        }

        setIsLoading(true);
        try {
            await requestWithdrawal({
                amount: parsedAmount,
                bankAccount: selectedBank.accountNumber,
                bankName: selectedBank.bankName,
            });
            setIsLoading(false);
            setConfirmStep('success');
        } catch (mutationError: any) {
            setIsLoading(false);
            setWithdrawErrorMessage(mutationError?.message ?? 'Please try again.');
            setConfirmStep('failed');
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={20} color="#000" />
                </Pressable>
                <ThemedText style={styles.headerTitle}>Withdraw page</ThemedText>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Balance Card */}
                <PayoutCard
                    amount={`Rm ${currentBalance}`}
                    showButton={false}
                    onPress={() => { }} // Just to make it pressable if needed or to show arrow if we decide to
                />


                {/* Amount Section */}
                <View style={styles.section}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>1. Amount to payout</ThemedText>
                    <View style={[styles.inputContainer, error ? styles.inputError : undefined]}>
                        <TextInput
                            style={styles.input}
                            placeholder="Rm"
                            value={amount ? `Rm ${amount}` : ''}
                            onChangeText={(text) => {
                                const numeric = text.replace(/[^0-9.]/g, '');
                                setAmount(numeric);
                                if (error) setError('');
                            }}
                            keyboardType="numeric"
                            placeholderTextColor="#999"
                        />
                        <Pressable onPress={handleMax} style={styles.maxButton}>
                            <ThemedText style={styles.maxButtonText}>Max</ThemedText>
                        </Pressable>
                    </View>
                    <View style={styles.inputFooter}>
                        <ThemedText style={styles.errorText}>{error}</ThemedText>
                        <ThemedText style={styles.noteText}>Estimated payout 3-5 days</ThemedText>
                    </View>
                </View>

                {/* Bank Accounts Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>2. Bank accounts</ThemedText>
                        <Pressable onPress={() => router.push('/bank-account/add')}>
                            <ThemedText style={styles.actionText}>+ Add bank account</ThemedText>
                        </Pressable>
                    </View>

                    {isBankAccountsLoading ? (
                        <View style={styles.bankSkeletonList}>
                            {[...Array(3)].map((_, index) => (
                                <BankAccountSkeleton key={index} />
                            ))}
                        </View>
                    ) : bankAccounts.length === 0 ? (
                        <View style={styles.emptyStateContainer}>
                            <LottieView
                                source={require('@/assets/lotties/not-found.json')}
                                autoPlay
                                loop
                                style={styles.lottie}
                            />
                            <ThemedText style={styles.emptyStateText}>
                                No bank accounts found
                            </ThemedText>
                            <ThemedText style={styles.emptyStateSubtext}>
                                Add a bank account to withdraw funds
                            </ThemedText>
                        </View>
                    ) : (
                        bankAccounts.map((account) => (
                            <Pressable
                                key={account.id}
                                style={[
                                    styles.bankCard,
                                    selectedBankId === account.id && styles.selectedBankCard
                                ]}
                                onPress={() => setSelectedBankId(account.id)}
                            >
                                <View style={styles.bankLogoContainer}>
                                    {/* Using a placeholder generic icon if image fails or for simplify */}
                                    <Image source={{ uri: account.logo }} style={styles.bankLogo} resizeMode="contain" />
                                </View>
                                <View style={styles.bankInfo}>
                                    <ThemedText type="defaultSemiBold">{account.bankName}</ThemedText>
                                    <View style={styles.bankDetailsRow}>
                                        <ThemedText style={styles.bankDetailText}>{account.accountHolder}</ThemedText>
                                        <ThemedText style={[styles.bankDetailText, { marginLeft: 16 }]}>{account.accountNumber}</ThemedText>
                                    </View>
                                </View>
                            </Pressable>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <Pressable
                    style={styles.confirmButton}
                    onPress={() => {
                        const parsedAmount = parseFloat(amount);

                        if (!amount || parsedAmount <= 0) {
                            setError('Amount is required');
                            return;
                        }
                        if (parsedAmount > currentBalance) {
                            setError('Not enough balance');
                            return;
                        }
                        if (!selectedBankId) {
                            Alert.alert('No bank account selected', 'Please add or select a bank account first.');
                            return;
                        }
                        setConfirmStep('review');
                        actionSheetRef.current?.show();
                    }}
                >
                    <ThemedText style={styles.confirmButtonText}>Review & Confirm</ThemedText>
                </Pressable>
            </View>

            <ActionSheet ref={actionSheetRef} gestureEnabled>
                <View style={[styles.sheetContent]}>
                    {confirmStep === 'review' ? (
                        <View>
                            <ThemedText type="subtitle" style={styles.sheetTitle}>Confirm Withdrawal</ThemedText>

                            <View style={styles.reviewRow}>
                                <ThemedText style={styles.reviewLabel}>Amount</ThemedText>
                                <ThemedText type="defaultSemiBold">Rm {amount || '0'}</ThemedText>
                            </View>
                            <View style={styles.divider} />

                            <View style={styles.reviewRow}>
                                <ThemedText style={styles.reviewLabel}>Bank</ThemedText>
                                <ThemedText type="defaultSemiBold">{bankAccounts.find(b => b.id === selectedBankId)?.bankName}</ThemedText>
                            </View>
                            <View style={styles.divider} />

                            <View style={styles.reviewRow}>
                                <ThemedText style={styles.reviewLabel}>Account</ThemedText>
                                <ThemedText type="defaultSemiBold">{bankAccounts.find(b => b.id === selectedBankId)?.accountNumber}</ThemedText>
                            </View>
                            <View style={styles.divider} />

                            <View style={styles.reviewRow}>
                                <ThemedText style={styles.reviewLabel}>Estimated Payout</ThemedText>
                                <ThemedText type="defaultSemiBold">3-5 business days</ThemedText>
                            </View>

                            <Pressable
                                style={[styles.confirmButton, { marginTop: 32, opacity: isLoading ? 0.7 : 1 }]}
                                onPress={handleConfirm}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <ThemedText style={styles.confirmButtonText}>Confirm Withdrawal</ThemedText>
                                )}
                            </Pressable>
                        </View>
                    ) : confirmStep === 'success' ? (
                        <View style={styles.successContainer}>
                            <LottieView
                                source={require('../../assets/lotties/pending.json')}
                                autoPlay
                                loop
                                style={{ width: 150, height: 150 }}
                            />
                            <ThemedText type="subtitle" style={styles.successTitle}>Withdrawal Processing</ThemedText>
                            <ThemedText style={styles.successSubtitle}>You should receive within 3-5 days</ThemedText>

                            <Pressable
                                style={[styles.confirmButton, { marginTop: 32, width: '100%' }]}
                                onPress={() => {
                                    actionSheetRef.current?.hide();
                                    router.back();
                                }}
                            >
                                <ThemedText style={styles.confirmButtonText}>Done</ThemedText>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.successContainer}>
                            <LottieView
                                source={require('../../assets/lotties/failed.json')}
                                autoPlay
                                loop={false}
                                style={{ width: 150, height: 150 }}
                            />
                            <ThemedText type="subtitle" style={styles.successTitle}>Withdrawal Failed</ThemedText>
                            <ThemedText style={styles.successSubtitle}>{withdrawErrorMessage}</ThemedText>

                            <Pressable
                                style={[styles.confirmButton, { marginTop: 32, width: '100%' }]}
                                onPress={() => setConfirmStep('review')}
                            >
                                <ThemedText style={styles.confirmButtonText}>Try Again</ThemedText>
                            </Pressable>

                            <Pressable
                                style={[styles.confirmButtonSecondary, { width: '100%', marginTop: 12 }]}
                                onPress={() => actionSheetRef.current?.hide()}
                            >
                                <ThemedText style={styles.confirmButtonSecondaryText}>Dismiss</ThemedText>
                            </Pressable>
                        </View>
                    )}
                </View>
            </ActionSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        height: 56,
        gap: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    headerTitle: {
        fontSize: 16,
        color: '#666',
    },
    content: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    section: {
        marginTop: 32,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
        marginBottom: 12,
    },
    actionText: {
        fontSize: 14,
        fontFamily: 'GoogleSans_400Regular',
        color: '#000',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 64,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputError: {
        borderColor: '#D32F2F',
        backgroundColor: '#FFEBEE',
    },
    input: {
        flex: 1,
        fontSize: 18,
        fontFamily: 'GoogleSans_400Regular',
        color: '#000',
    },
    inputFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingHorizontal: 4,
    },
    errorText: {
        fontSize: 12,
        color: '#D32F2F',
        fontFamily: 'GoogleSans_400Regular',
    },
    noteText: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
    },
    maxButton: {
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    maxButtonText: {
        fontSize: 12,
        fontFamily: 'GoogleSans_700Bold',
        color: '#000',
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
    bankSkeletonList: {
        gap: 12,
    },
    bankSkeletonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#F6F6F6',
    },
    bankSkeletonLogo: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E5E7EB',
        marginRight: 16,
    },
    bankSkeletonInfo: {
        flex: 1,
        gap: 8,
    },
    bankSkeletonTitle: {
        width: '45%',
        height: 14,
        borderRadius: 7,
        backgroundColor: '#E5E7EB',
    },
    bankSkeletonMeta: {
        width: '70%',
        height: 12,
        borderRadius: 6,
        backgroundColor: '#E5E7EB',
    },
    selectedBankCard: {
        borderColor: '#000', // Active state
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
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 16,
        paddingHorizontal: 24,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    confirmButton: {
        backgroundColor: '#000',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    confirmButtonSecondary: {
        backgroundColor: '#fff',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    confirmButtonSecondaryText: {
        color: '#111827',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    sheetContent: {
        padding: 24,
    },
    sheetTitle: {
        marginBottom: 24,
        textAlign: 'center',
    },
    reviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    reviewLabel: {
        fontSize: 16,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
    },
    successContainer: {
        alignItems: 'center',

    },
    successTitle: {
        marginTop: 16,
        textAlign: 'center',
    },
    successSubtitle: {
        marginTop: 8,
        color: '#666',
        textAlign: 'center',
        fontFamily: 'GoogleSans_400Regular',
    },
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        gap: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 16,
        borderStyle: 'dashed',
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
        width: 120,
        height: 120,
    },
});
