import { View, StyleSheet, FlatList, Pressable, Image } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus, Landmark } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ApplicationStatus, ApplicationStatusBadge } from '@/components/ApplicationStatusBadge';

type BankAccountStatus = 'active' | 'pending' | 'rejected';

interface BankAccount {
    id: string;
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    logo: string;
    status: BankAccountStatus;
}

const MOCK_BANK_ACCOUNTS: BankAccount[] = [
    {
        id: '1',
        bankName: 'Public Bank Berhad',
        accountHolder: 'Choo Ley Kwan',
        accountNumber: '6558********',
        logo: 'https://companieslogo.com/img/orig/1295.KL-b182747d.png?t=1720244493',
        status: 'active',
    },
    {
        id: '2',
        bankName: 'Maybank',
        accountHolder: 'Choo Ley Kwan',
        accountNumber: '1234********',
        logo: 'https://companieslogo.com/img/orig/1155.KL-b2d9e9b2.png?t=1720244490',
        status: 'pending',
    },
    {
        id: '3',
        bankName: 'CIMB Bank',
        accountHolder: 'Choo Ley Kwan',
        accountNumber: '9988********',
        logo: 'https://companieslogo.com/img/orig/6117.KL-70783f98.png?t=1720244491',
        status: 'rejected',
    },
];

export default function BankAccountScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const renderBankAccount = ({ item }: { item: BankAccount }) => {
        const mappedStatus: ApplicationStatus =
            item.status === 'active' ? 'Active' :
                item.status === 'pending' ? 'Under Review' :
                    'Rejected';

        const handlePress = () => {
            router.push({
                pathname: `/bank-account/${item.id}`,
                params: {
                    status: item.status,
                    bankName: item.bankName,
                    accountNumber: item.accountNumber,
                    accountHolder: item.accountHolder,
                    // Mock additional data that the details page expects
                    rejectionReason: item.status === 'rejected' ? 'The uploaded proof is blurry and hard to read. Please re-upload a clearer image.' : undefined,
                    proofUri: item.logo, // Using logo as a placeholder for proof
                }
            });
        };

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.bankCard,
                    { opacity: pressed ? 0.7 : 1 }
                ]}
                onPress={handlePress}
            >
                <View style={styles.bankLogoContainer}>
                    <Image source={{ uri: item.logo }} style={styles.bankLogo} resizeMode="contain" />
                </View>
                <View style={styles.bankInfo}>
                    <ThemedText type="defaultSemiBold">{item.bankName}</ThemedText>
                    <View style={styles.bankDetailsRow}>
                        <ThemedText style={[styles.bankDetailText]}>{item.accountNumber}</ThemedText>
                    </View>
                </View>
                <ApplicationStatusBadge status={mappedStatus} />
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.text} />
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

                <FlatList
                    data={MOCK_BANK_ACCOUNTS}
                    renderItem={renderBankAccount}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            {/* Add Bank Account Button */}
            <View style={styles.footer}>
                <Pressable
                    style={styles.addButton}
                    onPress={() => router.push('/bank-account/add' as any)}
                >
                    <Plus size={20} color="#fff" />
                    <ThemedText style={styles.addButtonText}>Add Bank Account</ThemedText>
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
});
