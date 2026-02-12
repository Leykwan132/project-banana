import { useState, useRef } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronDown, Upload, Eye, CheckCircle, Search, Camera, FileText, Image as ImageIcon, Pencil } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useAction, useMutation } from 'convex/react';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '../../../../../packages/backend/convex/_generated/api';

const BANK_OPTIONS = [
    'Affin Bank',
    'Alliance Bank',
    'AmBank',
    'Bank Islam Malaysia',
    'Bank Rakyat',
    'BSN (Bank Simpanan Nasional)',
    'CIMB Bank',
    'Hong Leong Bank',
    'HSBC Bank',
    'Maybank (Malayan Banking)',
    'MBSB Bank',
    'OCBC Bank',
    'Public Bank Berhad',
    'RHB Bank',
    'Standard Chartered',
    'UOB Bank',
];

export default function AddBankAccountScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const isEditing = !!params.id;

    const [bankName, setBankName] = useState((params.bankName as string) || '');
    const [accountHolderName, setAccountHolderName] = useState((params.accountHolder as string) || '');
    const [accountNumber, setAccountNumber] = useState((params.accountNumber as string) || '');
    const [proofUploaded, setProofUploaded] = useState(!!params.proofUri);
    const [uploadedFile, setUploadedFile] = useState<{
        uri: string;
        name?: string;
        type: 'image' | 'pdf';
        mimeType?: string;
    } | null>(params.proofUri ? {
        uri: params.proofUri as string,
        name: 'Selected Proof',
        type: (params.proofUri as string).toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
        mimeType: (params.proofUri as string).toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
    } : null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [submitStep, setSubmitStep] = useState<'pending' | null>(null);
    const createBankAccount = useMutation(api.bankAccounts.createBankAccount);
    const generateProofUploadUrl = useAction(api.bankAccounts.generateProofUploadUrl);

    const bankSelectSheetRef = useRef<ActionSheetRef>(null);
    const exampleSheetRef = useRef<ActionSheetRef>(null);
    const uploadOptionsSheetRef = useRef<ActionSheetRef>(null);
    const submitStatusSheetRef = useRef<ActionSheetRef>(null);
    const previewSheetRef = useRef<ActionSheetRef>(null);
    const bankScrollViewRef = useRef<ScrollView>(null);

    const scrollToSelectedBank = () => {
        if (bankName) {
            const index = BANK_OPTIONS.indexOf(bankName);
            if (index !== -1) {
                // Approximate item height is 53px
                bankScrollViewRef.current?.scrollTo({
                    y: index * 53,
                    animated: true
                });
            }
        }
    };

    const handleSelectBank = (bank: string) => {
        setBankName(bank);
        bankSelectSheetRef.current?.hide();
    };

    const handleUploadProof = () => {
        if (uploadedFile) {
            previewSheetRef.current?.show();
        } else {
            uploadOptionsSheetRef.current?.show();
        }
    };

    const handleReupload = () => {
        previewSheetRef.current?.hide();
        setTimeout(() => {
            uploadOptionsSheetRef.current?.show();
        }, 300);
    };

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });

        uploadOptionsSheetRef.current?.hide();

        if (!result.canceled && result.assets.length > 0) {
            const asset = result.assets[0];
            setUploadedFile({
                uri: asset.uri,
                name: asset.fileName || 'Photo',
                type: 'image',
                mimeType: asset.mimeType ?? 'image/jpeg',
            });
            setProofUploaded(true);
        }
    };

    const handleChooseFromGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Photo library permission is needed to select photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            // allowsEditing: true,
            // quality: 0.8,
        });

        uploadOptionsSheetRef.current?.hide();

        if (!result.canceled && result.assets.length > 0) {
            const asset = result.assets[0];
            setUploadedFile({
                uri: asset.uri,
                name: asset.fileName || 'Image',
                type: 'image',
                mimeType: asset.mimeType ?? 'image/jpeg',
            });
            setProofUploaded(true);
        }
    };

    const handleUploadPDF = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            uploadOptionsSheetRef.current?.hide();

            if (!result.canceled && result.assets.length > 0) {
                const asset = result.assets[0];
                setUploadedFile({
                    uri: asset.uri,
                    name: asset.name || 'Document.pdf',
                    type: 'pdf',
                    mimeType: asset.mimeType ?? 'application/pdf',
                });
                setProofUploaded(true);
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to pick document. Please try again.');
        }
    };

    const handleSubmit = async () => {
        if (!bankName || !accountHolderName || !accountNumber || !proofUploaded || !uploadedFile) {
            return;
        }

        setIsLoading(true);
        try {
            const contentType =
                uploadedFile.mimeType ??
                (uploadedFile.type === 'pdf' ? 'application/pdf' : 'image/jpeg');

            const { uploadUrl, s3Key } = await generateProofUploadUrl({ contentType });

            const fileResponse = await fetch(uploadedFile.uri);
            if (!fileResponse.ok) {
                throw new Error('Unable to read selected proof file.');
            }
            const fileBuffer = await fileResponse.arrayBuffer();

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': contentType },
                body: fileBuffer,
            });
            if (!uploadResponse.ok) {
                throw new Error(`Proof upload failed with status ${uploadResponse.status}`);
            }

            await createBankAccount({
                bankName,
                accountHolderName: accountHolderName.trim(),
                accountNumber: accountNumber.trim(),
                proofDocumentKey: s3Key,
            });
            setIsLoading(false);
            setSubmitStep('pending');
            submitStatusSheetRef.current?.show();
        } catch (error) {
            setIsLoading(false);
            Alert.alert('Submission failed', 'Unable to submit bank account. Please try again.');
        }
    };

    const handleCloseSubmitSheet = () => {
        submitStatusSheetRef.current?.hide();
        setTimeout(() => {
            setSubmitStep(null);
            router.back();
        }, 300);
    };

    const isFormValid = bankName && accountHolderName && accountNumber && proofUploaded;

    const filteredBanks = BANK_OPTIONS.filter(bank =>
        bank.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.text} />
                </Pressable>
                <ThemedText type="title" style={styles.headerTitle}>
                    {isEditing ? 'Edit Bank Account' : 'Adding New Bank Account'}
                </ThemedText>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Bank Name */}
                <View style={styles.section}>
                    <ThemedText type="defaultSemiBold" style={styles.label}>Bank Name</ThemedText>
                    <Pressable
                        style={styles.selectButton}
                        onPress={() => bankSelectSheetRef.current?.show()}
                    >
                        <ThemedText style={[styles.selectText, !bankName && styles.placeholder]}>
                            {bankName || 'Select your bank'}
                        </ThemedText>
                        <ChevronDown size={20} color="#666" />
                    </Pressable>
                </View>

                {/* Bank Account Number */}
                <View style={styles.section}>
                    <ThemedText type="defaultSemiBold" style={styles.label}>Bank Account Number</ThemedText>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your account number"
                        value={accountNumber}
                        onChangeText={setAccountNumber}
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                    />
                </View>

                {/* Account Holder Name */}
                <View style={styles.section}>
                    <ThemedText type="defaultSemiBold" style={styles.label}>Account Holder Name</ThemedText>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter account holder name"
                        value={accountHolderName}
                        onChangeText={setAccountHolderName}
                        placeholderTextColor="#999"
                    />
                </View>

                {/* Proof of Bank Account */}
                <View style={styles.section}>
                    <ThemedText type="defaultSemiBold" style={styles.label}>Proof of Bank Account</ThemedText>
                    <ThemedText style={styles.proofDescription}>
                        The bank account holder's name and the bank account number should be clearly shown on the proof. The latest bank statement is usually used as proof of bank account.
                    </ThemedText>

                    <Pressable
                        style={styles.viewExampleButton}
                        onPress={() => exampleSheetRef.current?.show()}
                    >
                        <Eye size={18} color="#000" />
                        <ThemedText style={styles.viewExampleText}>View Example</ThemedText>
                    </Pressable>

                    {/* Upload Area */}
                    <View
                        style={[styles.uploadArea, uploadedFile && styles.uploadAreaWithPreview]}
                    >
                        {uploadedFile ? (
                            <View style={styles.previewContainer}>
                                {uploadedFile.type === 'image' ? (
                                    <Image
                                        source={{ uri: uploadedFile.uri }}
                                        style={styles.previewImage}
                                        contentFit="contain"
                                    />
                                ) : (
                                    <View style={styles.webViewWrapperInPlace}>
                                        <WebView
                                            source={{ uri: uploadedFile.uri }}
                                            style={styles.webView}
                                            scalesPageToFit
                                            originWhitelist={['*']}
                                            scrollEnabled={false}
                                        />
                                    </View>
                                )}

                                <Pressable
                                    style={styles.editButtonOverlay}
                                    onPress={() => uploadOptionsSheetRef.current?.show()}
                                >
                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                                        style={styles.gradientOverlay}
                                    >
                                        <View style={styles.editBadge}>
                                            <Pencil size={14} color="#000" />
                                            <ThemedText style={styles.editBadgeText}>Edit</ThemedText>
                                        </View>
                                    </LinearGradient>
                                </Pressable>
                            </View>
                        ) : (
                            <Pressable
                                style={styles.emptyUploadContainer}
                                onPress={() => uploadOptionsSheetRef.current?.show()}
                            >
                                <Upload size={40} color="#666" />
                                <ThemedText style={styles.uploadText}>Upload a proof</ThemedText>
                            </Pressable>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Submit Button */}
            <View style={styles.footer}>
                <Pressable
                    style={[
                        styles.submitButton,
                        !isFormValid && styles.submitButtonDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={!isFormValid || isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <ThemedText style={styles.submitButtonText}>
                            {isEditing ? 'Save Changes' : 'Submit'}
                        </ThemedText>
                    )}
                </Pressable>
            </View>

            {/* Bank Selection Sheet */}
            <ActionSheet
                // snapPoints={[30, 90, 100]}
                // initialSnapIndex={1}
                ref={bankSelectSheetRef}
                gestureEnabled
                onOpen={scrollToSelectedBank}
                onClose={() => setSearchQuery('')}
            >
                <View style={[styles.sheetContent, { paddingBottom: 60 }]}>
                    <ThemedText type="subtitle" style={styles.sheetTitle}>Select Bank</ThemedText>

                    {/* Search Input */}
                    <View style={styles.searchContainer}>
                        <Search size={20} color="#666" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search bank name..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#999"
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <ThemedText style={styles.clearText}>Clear</ThemedText>
                            </Pressable>
                        )}
                    </View>

                    <ScrollView
                        ref={bankScrollViewRef}
                        style={{ maxHeight: 550 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {filteredBanks.map((bank) => (
                            <Pressable
                                key={bank}
                                style={styles.bankOption}
                                onPress={() => handleSelectBank(bank)}
                            >
                                <ThemedText style={[
                                    styles.bankOptionText,
                                    bank === bankName && styles.bankOptionSelected
                                ]}>
                                    {bank}
                                </ThemedText>
                                {bank === bankName && (
                                    <CheckCircle size={20} color="#000" />
                                )}
                            </Pressable>
                        ))}
                        {filteredBanks.length === 0 && (
                            <View style={styles.noResultContainer}>
                                <ThemedText style={styles.noResultText}>No banks found</ThemedText>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </ActionSheet>

            {/* Example Sheet */}
            <ActionSheet ref={exampleSheetRef} gestureEnabled>
                <View style={styles.sheetContent}>
                    <ThemedText type="subtitle" style={styles.sheetTitle}>Example Bank Statement</ThemedText>
                    <Image
                        source={{ uri: 'https://placehold.co/600x800/F5F5F5/666?text=Bank+Statement+Example' }}
                        style={styles.exampleImage}
                        contentFit="contain"
                    />
                    <ThemedText style={styles.exampleCaption}>
                        Your bank statement should clearly show your name and account number as highlighted above.
                    </ThemedText>
                    <Pressable
                        style={styles.gotItButton}
                        onPress={() => exampleSheetRef.current?.hide()}
                    >
                        <ThemedText style={styles.gotItButtonText}>Got it</ThemedText>
                    </Pressable>
                </View>
            </ActionSheet>

            {/* Preview Sheet */}
            <ActionSheet ref={previewSheetRef} gestureEnabled>
                <View style={styles.sheetContent}>
                    <ThemedText type="subtitle" style={styles.sheetTitle}>Edit</ThemedText>

                    {uploadedFile?.type === 'image' ? (
                        <Image
                            source={{ uri: uploadedFile.uri }}
                            style={styles.fullPreviewImage}
                            contentFit="contain"
                        />
                    ) : uploadedFile?.type === 'pdf' ? (
                        <View style={styles.webViewContainer}>
                            <ThemedText type="defaultSemiBold" style={styles.pdfFileNameTitle}>
                                {uploadedFile.name}
                            </ThemedText>
                            <View style={styles.webViewWrapper}>
                                <WebView
                                    source={{ uri: uploadedFile.uri }}
                                    style={styles.webView}
                                    scalesPageToFit
                                    originWhitelist={['*']}
                                    allowFileAccess={true}
                                    allowFileAccessFromFileURLs={true}
                                    androidLayerType="software"
                                />
                            </View>
                        </View>
                    ) : null}

                    <Pressable
                        style={styles.reuploadButton}
                        onPress={handleReupload}
                    >
                        <Upload size={18} color="#000" />
                        <ThemedText style={styles.reuploadButtonText}>Re-upload</ThemedText>
                    </Pressable>
                </View>
            </ActionSheet>

            {/* Upload Options Sheet */}
            <ActionSheet ref={uploadOptionsSheetRef} gestureEnabled>
                <View style={styles.sheetContent}>
                    <ThemedText type="subtitle" style={styles.sheetTitle}>Upload Proof</ThemedText>

                    <Pressable
                        style={styles.uploadOption}
                        onPress={handleTakePhoto}
                    >
                        <View style={styles.uploadOptionIcon}>
                            <Camera size={24} color="#000" />
                        </View>
                        <ThemedText style={styles.uploadOptionText}>Take a Photo</ThemedText>
                    </Pressable>

                    <View style={styles.divider} />

                    <Pressable
                        style={styles.uploadOption}
                        onPress={handleChooseFromGallery}
                    >
                        <View style={styles.uploadOptionIcon}>
                            <ImageIcon size={24} color="#000" />
                        </View>
                        <ThemedText style={styles.uploadOptionText}>Choose from Gallery</ThemedText>
                    </Pressable>

                    <View style={styles.divider} />

                    <Pressable
                        style={styles.uploadOption}
                        onPress={handleUploadPDF}
                    >
                        <View style={styles.uploadOptionIcon}>
                            <FileText size={24} color="#000" />
                        </View>
                        <ThemedText style={styles.uploadOptionText}>Upload PDF</ThemedText>
                    </Pressable>
                </View>
            </ActionSheet>

            {/* Submit Status Sheet */}
            <ActionSheet
                ref={submitStatusSheetRef}
                gestureEnabled={true}
                closeOnTouchBackdrop={true}
            >
                <View style={styles.sheetContent}>
                    {submitStep === 'pending' && (
                        <View style={styles.statusContainer}>
                            <LottieView
                                source={require('../../assets/lotties/pending.json')}
                                autoPlay
                                loop={false}
                                style={{ width: 120, height: 120 }}
                            />
                            <ThemedText type="subtitle" style={styles.statusTitle}>
                                {isEditing ? 'Update Successful' : 'Pending Review'}
                            </ThemedText>
                            <ThemedText style={styles.statusDescription}>
                                {isEditing
                                    ? 'Your bank account details have been updated successfully.'
                                    : 'Your bank account has been submitted for review. We will verify your details and notify you once it\'s approved.'
                                }
                            </ThemedText>
                            <Pressable
                                style={styles.doneButton}
                                onPress={handleCloseSubmitSheet}
                            >
                                <ThemedText style={styles.doneButtonText}>Done</ThemedText>
                            </Pressable>
                        </View>
                    )}
                </View>
            </ActionSheet>
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
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    placeholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 120,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
        marginBottom: 12,
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FAFAFA',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    selectText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
        color: '#000',
        flex: 1,
    },
    input: {
        backgroundColor: '#FAFAFA',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    proofDescription: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
        lineHeight: 22,
        marginBottom: 16,
    },
    viewExampleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        marginBottom: 16,
        paddingVertical: 4,
    },
    viewExampleText: {
        fontSize: 14,
        fontFamily: 'GoogleSans_500Medium',
        color: '#666',
        textDecorationLine: 'underline',
    },
    uploadArea: {
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        borderRadius: 16,
        height: 160,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
        gap: 12,
    },
    uploadAreaSuccess: {
        borderColor: '#2E7D32',
        borderStyle: 'solid',
        backgroundColor: '#E8F5E9',
    },
    uploadText: {
        fontSize: 16,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingVertical: 16,
        paddingBottom: 32,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    submitButton: {
        backgroundColor: '#000',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: '#CCC',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    sheetContent: {
        padding: 24,
        paddingBottom: 24,
    },
    sheetTitle: {
        textAlign: 'center',
        marginBottom: 24,
    },
    bankOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    bankOptionText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
    },
    bankOptionSelected: {
        fontFamily: 'GoogleSans_700Bold',
    },
    exampleImage: {
        width: '100%',
        height: 300,
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
    },
    exampleCaption: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 22,
    },
    gotItButton: {
        backgroundColor: '#000',
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    gotItButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 16,
        height: 48,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
        height: '100%',
    },
    clearText: {
        fontSize: 14,
        color: '#D32F2F',
        fontFamily: 'GoogleSans_500Medium',
    },
    noResultContainer: {
        paddingTop: 32,
        alignItems: 'center',
    },
    noResultText: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
    },
    uploadOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    uploadOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    uploadOptionText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
    },
    statusContainer: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    statusTitle: {
        marginTop: 16,
        textAlign: 'center',
    },
    statusDescription: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
        paddingHorizontal: 16,
    },
    doneButton: {
        backgroundColor: '#000',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        width: '100%',
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    uploadAreaWithPreview: {
        borderStyle: 'solid',
        borderColor: '#E5E7EB',
        padding: 0,
        overflow: 'hidden',
        height: 450,
    },
    previewContainer: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: 14,
        backgroundColor: '#F9FAFB',
    },
    previewOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
        justifyContent: 'flex-end',
        padding: 12,
        alignItems: 'center',
    },
    successBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#2E7D32',
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    changeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    changeButtonText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'GoogleSans_500Medium',
    },
    pdfPreviewContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    pdfIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: '#FFEBEE',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    pdfFileName: {
        fontSize: 14,
        fontFamily: 'GoogleSans_500Medium',
        color: '#333',
        maxWidth: '80%',
        textAlign: 'center',
    },
    changeLink: {
        marginTop: 8,
    },
    changeLinkText: {
        fontSize: 13,
        fontFamily: 'GoogleSans_400Regular',
        color: '#666',
        textDecorationLine: 'underline',
    },
    tapHintBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tapHintText: {
        color: '#000',
        fontSize: 13,
        fontFamily: 'GoogleSans_500Medium',
    },
    tapHintSmall: {
        fontSize: 12,
        fontFamily: 'GoogleSans_400Regular',
        color: '#666',
    },
    editHintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
    },
    fullPreviewImage: {
        width: '100%',
        height: 350,
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
    },
    webViewContainer: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    pdfFileNameTitle: {
        fontSize: 14,
        fontFamily: 'GoogleSans_700Bold',
        color: '#333',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#fff',
    },
    webViewWrapper: {
        height: 450,
        width: '100%',
    },
    webViewWrapperInPlace: {
        flex: 1,
        width: '100%',
    },
    webView: {
        flex: 1,
        backgroundColor: '#fff',
    },
    editButtonOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
    },
    gradientOverlay: {
        height: '40%',
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 20,
    },
    editBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    editBadgeText: {
        color: '#000',
        fontSize: 14,
        fontFamily: 'GoogleSans_700Bold',
    },
    emptyUploadContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    reuploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F5',
        height: 56,
        borderRadius: 28,
        marginTop: 24,
        gap: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    reuploadButtonText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
        color: '#000',
    },
});
