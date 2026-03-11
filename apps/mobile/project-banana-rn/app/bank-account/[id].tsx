import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Upload, AlertCircle, FileText, Camera, ImageIcon, Pencil } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useAction, useMutation, useQuery } from 'convex/react';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ApplicationStatus, ApplicationStatusBadge } from '@/components/ApplicationStatusBadge';
import { BankAccountSourceType } from '@/constants/sourceType';
import { prepareBankProofUpload } from '@/utils/bankProofUpload';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { Id } from '../../../../../packages/backend/convex/_generated/dataModel';

export default function BankAccountDetailsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const screenBackgroundColor = isDark ? theme.screenBackground : '#F4F3EE';
    const elevatedBackgroundColor = isDark ? '#1F1F1F' : '#FFFFFF';
    const borderColor = isDark ? '#303030' : '#E4DED2';
    const dividerColor = isDark ? '#2A2A2A' : '#E7E2D8';
    const mutedTextColor = isDark ? '#A3A3A3' : '#6B7280';
    const uploadEmptyBackgroundColor = isDark ? '#151515' : '#F7F4ED';
    const sheetBackgroundColor = isDark ? '#101010' : '#FFFFFF';
    const secondarySurfaceColor = isDark ? '#1D1D1D' : '#F4F1E8';
    const subtleButtonBackgroundColor = isDark ? '#202020' : '#ECE7DB';
    const primaryButtonBackgroundColor = isDark ? '#F3F1EA' : '#000000';
    const primaryButtonTextColor = isDark ? '#111111' : '#FFFFFF';

    const bankAccountId = id as Id<'bank_accounts'>;
    const bankAccount = useQuery(
        api.bankAccounts.getBankAccount,
        bankAccountId ? { bankAccountId, sourceType: BankAccountSourceType.Creator } : "skip"
    );
    const generateProofUploadUrl = useAction(api.bankAccounts.generateProofUploadUrl);
    const generateProofAccessUrl = useAction(api.bankAccounts.generateProofAccessUrl);
    const deleteProofObject = useAction(api.bankAccounts.deleteProofObject);
    const resubmitBankAccountProof = useMutation(api.bankAccounts.resubmitBankAccountProof);

    const isRejected = bankAccount?.status === 'rejected';

    const [uploadedFile, setUploadedFile] = useState<{
        uri: string;
        name?: string;
        type: 'image' | 'pdf';
        mimeType?: string;
    } | null>(null);
    const [remoteProofFile, setRemoteProofFile] = useState<{
        uri: string;
        name?: string;
        type: 'image' | 'pdf';
    } | null>(null);
    const [isProofLoading, setIsProofLoading] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [submitStep, setSubmitStep] = useState<'pending' | null>(null);

    const uploadOptionsSheetRef = useRef<ActionSheetRef>(null);
    const submitStatusSheetRef = useRef<ActionSheetRef>(null);

    const mappedStatus: ApplicationStatus =
        bankAccount?.status === 'verified' ? 'Active' :
            bankAccount?.status === 'rejected' ? 'Rejected' :
                'Under Review';
    const isAccountLoading = bankAccount === undefined;

    useEffect(() => {
        let cancelled = false;

        const loadProof = async () => {
            if (!bankAccountId || bankAccount === undefined) return;
            const proofKey = bankAccount?.proof_document_r2_key;
            if (!proofKey) {
                setRemoteProofFile(null);
                setIsProofLoading(false);
                return;
            }

            try {
                setIsProofLoading(true);
                if (proofKey.startsWith('http://') || proofKey.startsWith('https://')) {
                    setRemoteProofFile({
                        uri: proofKey,
                        name: 'Current Proof',
                        type: proofKey.toLowerCase().includes('.pdf') ? 'pdf' : 'image',
                    });
                    setIsProofLoading(false);
                    return;
                }

                const signedUrl = await generateProofAccessUrl({ r2Key: proofKey });
                if (cancelled) return;

                if (!signedUrl) {
                    setRemoteProofFile(null);
                    setIsProofLoading(false);
                    return;
                }

                setRemoteProofFile({
                    uri: signedUrl,
                    name: 'Current Proof',
                    type: signedUrl.toLowerCase().includes('.pdf') ? 'pdf' : 'image',
                });
                setIsProofLoading(false);
            } catch {
                if (!cancelled) {
                    setRemoteProofFile(null);
                    setIsProofLoading(false);
                }
            }
        };

        loadProof();
        return () => {
            cancelled = true;
        };
    }, [bankAccountId, bankAccount?._id, bankAccount?.proof_document_r2_key, generateProofAccessUrl]);

    const proofFileToDisplay = uploadedFile ?? remoteProofFile;

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Camera permission is needed to take photos.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });
        if (!result.canceled && result.assets.length > 0) {
            setUploadedFile({
                uri: result.assets[0].uri,
                name: result.assets[0].fileName || 'Photo',
                type: 'image',
                mimeType: result.assets[0].mimeType ?? 'image/jpeg',
            });
        }
        uploadOptionsSheetRef.current?.hide();
    };

    const handleChooseFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });
        if (!result.canceled && result.assets.length > 0) {
            setUploadedFile({
                uri: result.assets[0].uri,
                name: result.assets[0].fileName || 'Image',
                type: 'image',
                mimeType: result.assets[0].mimeType ?? 'image/jpeg',
            });
        }
        uploadOptionsSheetRef.current?.hide();

    };

    const handleUploadPDF = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
            copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets.length > 0) {
            setUploadedFile({
                uri: result.assets[0].uri,
                name: result.assets[0].name || 'Document.pdf',
                type: 'pdf',
                mimeType: result.assets[0].mimeType ?? 'application/pdf',
            });
        }
        uploadOptionsSheetRef.current?.hide();

    };

    const handleSubmitReupload = async () => {
        if (!uploadedFile) {
            Alert.alert('No proof selected', 'Please upload a proof document first.');
            return;
        }

        setIsLoading(true);
        try {
            const preparedFile = await prepareBankProofUpload(uploadedFile);
            const contentType = preparedFile.contentType;

            const { uploadUrl, r2Key } = await generateProofUploadUrl({ contentType });

            const fileResponse = await fetch(preparedFile.uri);
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

            const previousProofKey = await resubmitBankAccountProof({
                bankAccountId,
                newProofKey: r2Key,
            });

            if (
                previousProofKey &&
                previousProofKey !== r2Key &&
                previousProofKey.startsWith('bank-proofs/')
            ) {
                deleteProofObject({ r2Key: previousProofKey }).catch((error) => {
                    console.warn('Failed to delete old bank proof object:', error);
                });
            }

            setIsLoading(false);
            setSubmitStep('pending');
            submitStatusSheetRef.current?.show();
        } catch (error) {
            console.error('Error resubmitting bank proof:', error);
            setIsLoading(false);
            Alert.alert('Submission failed', 'Unable to submit new proof. Please try again.');
        }
    };

    const handleCloseSubmitSheet = () => {
        submitStatusSheetRef.current?.hide();
        setTimeout(() => {
            setSubmitStep(null);
            router.back();
        }, 300);
    };

    if (bankAccount === null) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: screenBackgroundColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
                    <ThemedText>Bank account not found.</ThemedText>
                    <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
                        <ThemedText style={{ color: '#2563EB' }}>Go Back</ThemedText>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: screenBackgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={[styles.backButton, { borderColor, backgroundColor: elevatedBackgroundColor }]}>
                    <ArrowLeft size={24} color={theme.text} />
                </Pressable>
                <ThemedText type="title" style={styles.headerTitle}>
                    Bank Account
                </ThemedText>
                <View style={styles.placeholder} />
            </View>

            <View style={{ flex: 1 }}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Verification Status */}
                    <View style={styles.sectionBlock}>
                        <ThemedText type="defaultSemiBold" style={styles.label}>Verification Status</ThemedText>
                        <View style={styles.statusBadgeRow}>
                            {isAccountLoading ? (
                                <View style={[styles.badgeSkeleton, { backgroundColor: isDark ? '#262626' : '#EEF0F2' }]} />
                            ) : (
                                <ApplicationStatusBadge status={mappedStatus} />
                            )}
                        </View>
                    </View>

                    {/* Rejection Reason */}
                    {!isAccountLoading && isRejected && (
                        <View style={[styles.rejectionCard, { backgroundColor: isDark ? '#2A1616' : '#FFF5F5', borderColor: isDark ? '#5E2424' : '#FFCDD2' }]}>
                            <View style={styles.rejectionHeader}>
                                <AlertCircle size={18} color="#C62828" />
                                <ThemedText type="defaultSemiBold" style={styles.rejectionTitle}>
                                    Rejection Reason
                                </ThemedText>
                            </View>
                            <ThemedText style={[styles.rejectionText, { color: mutedTextColor }]}>
                                Your proof needs updates. Please upload a clearer document that shows account holder name and account number.
                            </ThemedText>
                        </View>
                    )}

                    {/* Bank Details */}
                    <View style={styles.sectionBlock}>
                        <ThemedText type="defaultSemiBold" style={styles.label}>Bank Name</ThemedText>
                        <View style={[styles.readOnlyField, { backgroundColor: elevatedBackgroundColor, borderColor }]}>
                            {isAccountLoading ? (
                                <View style={[styles.fieldSkeleton, { backgroundColor: isDark ? '#262626' : '#E5E7EB' }]} />
                            ) : (
                                <ThemedText style={[styles.readOnlyText, { color: theme.text }]}>{bankAccount.bank_name}</ThemedText>
                            )}
                        </View>
                    </View>

                    <View style={styles.sectionBlock}>
                        <ThemedText type="defaultSemiBold" style={styles.label}>Account Number</ThemedText>
                        <View style={[styles.readOnlyField, { backgroundColor: elevatedBackgroundColor, borderColor }]}>
                            {isAccountLoading ? (
                                <View style={[styles.fieldSkeleton, { backgroundColor: isDark ? '#262626' : '#E5E7EB' }]} />
                            ) : (
                                <ThemedText style={[styles.readOnlyText, { color: theme.text }]}>{bankAccount.account_number}</ThemedText>
                            )}
                        </View>
                    </View>

                    <View style={styles.sectionBlock}>
                        <ThemedText type="defaultSemiBold" style={styles.label}>Account Holder</ThemedText>
                        <View style={[styles.readOnlyField, { backgroundColor: elevatedBackgroundColor, borderColor }]}>
                            {isAccountLoading ? (
                                <View style={[styles.fieldSkeleton, { backgroundColor: isDark ? '#262626' : '#E5E7EB' }]} />
                            ) : (
                                <ThemedText style={[styles.readOnlyText, { color: theme.text }]}>{bankAccount.account_holder_name ?? '-'}</ThemedText>
                            )}
                        </View>
                    </View>

                    {/* Proof Section */}
                    <View style={styles.sectionBlock}>
                        <ThemedText type="defaultSemiBold" style={styles.label}>Proof of Bank Account</ThemedText>

                        {/* Upload Area */}
                        <View
                            style={[
                                styles.uploadArea,
                                {
                                    borderColor,
                                    backgroundColor: uploadEmptyBackgroundColor,
                                },
                                proofFileToDisplay && styles.uploadAreaWithPreview,
                                proofFileToDisplay && { backgroundColor: elevatedBackgroundColor, borderColor }
                            ]}
                        >
                            {isAccountLoading || (isProofLoading && !uploadedFile) ? (
                                <View style={[styles.proofSkeleton, { backgroundColor: isDark ? '#262626' : '#EEF0F2' }]} />
                            ) : proofFileToDisplay ? (
                                <View style={styles.previewContainer}>
                                    {proofFileToDisplay.type === 'image' ? (
                                        <Image
                                            source={{ uri: proofFileToDisplay.uri }}
                                            style={styles.previewImage}
                                            contentFit="contain"
                                        />
                                    ) : (
                                        <View style={styles.webViewWrapperInPlace}>
                                            <WebView
                                                source={{ uri: proofFileToDisplay.uri }}
                                                style={styles.webView}
                                                scalesPageToFit
                                                originWhitelist={['*']}
                                                scrollEnabled={false}
                                            />
                                        </View>
                                    )}

                                    {isRejected && (
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
                                    )}
                                </View>
                            ) : (
                                <Pressable
                                    style={styles.emptyUploadContainer}
                                    onPress={() => uploadOptionsSheetRef.current?.show()}
                                    disabled={!isRejected}
                                >
                                    <Upload size={40} color={mutedTextColor} />
                                    <ThemedText style={[styles.uploadText, { color: mutedTextColor }]}>No proof uploaded</ThemedText>
                                </Pressable>
                            )}
                        </View>
                    </View>
                </ScrollView>

                {/* Footer Buttons for Rejected */}
                {!isAccountLoading && isRejected && (
                    <View style={[styles.footer, { backgroundColor: screenBackgroundColor, borderTopColor: dividerColor }]}>
                        {uploadedFile && uploadedFile.name !== 'Current Proof' ? (
                            /* Submit Button - Only visible when new file uploaded */
                            <Pressable
                                style={[styles.mainButton, styles.submitButton, { backgroundColor: primaryButtonBackgroundColor }]}
                                onPress={handleSubmitReupload}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <LoadingIndicator size="small" color={primaryButtonTextColor} />
                                ) : (
                                    <ThemedText style={[styles.mainButtonText, { color: primaryButtonTextColor }]}>Submit for Review</ThemedText>
                                )}
                            </Pressable>
                        ) : (
                            /* Upload Button - Visible when no new file uploaded */
                            <Pressable
                                style={[styles.mainButton, styles.uploadButton, { backgroundColor: primaryButtonBackgroundColor }]}
                                onPress={() => uploadOptionsSheetRef.current?.show()}
                            >
                                <Upload size={20} color={primaryButtonTextColor} />
                                <ThemedText style={[styles.mainButtonText, { color: primaryButtonTextColor }]}>Upload New Proof</ThemedText>
                            </Pressable>
                        )}
                    </View>
                )}
            </View>
            {/* Upload Options Sheet */}
            <ActionSheet ref={uploadOptionsSheetRef} gestureEnabled containerStyle={{ backgroundColor: sheetBackgroundColor }}>
                <View style={[styles.sheetContent, { backgroundColor: sheetBackgroundColor }]}>
                    <ThemedText type="subtitle" style={[styles.sheetTitle, { color: theme.text }]}>Upload Proof</ThemedText>

                    <Pressable style={styles.uploadOption} onPress={handleTakePhoto}>
                        <View style={[styles.uploadOptionIcon, { backgroundColor: secondarySurfaceColor }]}>
                            <Camera size={24} color={theme.text} />
                        </View>
                        <ThemedText style={[styles.uploadOptionText, { color: theme.text }]}>Take a Photo</ThemedText>
                    </Pressable>

                    <View style={[styles.divider, { backgroundColor: dividerColor }]} />

                    <Pressable style={styles.uploadOption} onPress={handleChooseFromGallery}>
                        <View style={[styles.uploadOptionIcon, { backgroundColor: secondarySurfaceColor }]}>
                            <ImageIcon size={24} color={theme.text} />
                        </View>
                        <ThemedText style={[styles.uploadOptionText, { color: theme.text }]}>Choose from Gallery</ThemedText>
                    </Pressable>

                    <View style={[styles.divider, { backgroundColor: dividerColor }]} />

                    <Pressable style={styles.uploadOption} onPress={handleUploadPDF}>
                        <View style={[styles.uploadOptionIcon, { backgroundColor: secondarySurfaceColor }]}>
                            <FileText size={24} color={theme.text} />
                        </View>
                        <ThemedText style={[styles.uploadOptionText, { color: theme.text }]}>Upload PDF</ThemedText>
                    </Pressable>
                </View>
            </ActionSheet>

            {/* Submit Status Sheet */}
            <ActionSheet
                ref={submitStatusSheetRef}
                gestureEnabled={true}
                closeOnTouchBackdrop={true}
                containerStyle={{ backgroundColor: sheetBackgroundColor }}
            >
                <View style={[styles.sheetContent, { backgroundColor: sheetBackgroundColor }]}>
                    {submitStep === 'pending' && (
                        <View style={styles.statusContainer}>
                            <LottieView
                                source={require('../../assets/lotties/pending.json')}
                                autoPlay
                                loop={false}
                                style={{ width: 120, height: 120 }}
                            />
                            <ThemedText type="subtitle" style={[styles.statusTitle, { color: theme.text }]}>
                                Pending Review
                            </ThemedText>
                            <ThemedText style={[styles.statusDescription, { color: mutedTextColor }]}>
                                Your updated proof has been submitted for review. We will verify your details and notify you once it&apos;s approved.
                            </ThemedText>
                            <Pressable
                                style={[styles.doneButton, { backgroundColor: subtleButtonBackgroundColor, borderColor }]}
                                onPress={handleCloseSubmitSheet}
                            >
                                <ThemedText style={[styles.doneButtonText, { color: theme.text }]}>Done</ThemedText>
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
        fontSize: 18,
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
        paddingBottom: 100,
    },
    sectionBlock: {
        marginBottom: 20,
    },
    infoCard: {
        marginBottom: 16,
        padding: 18,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusBadgeRow: {
        flexDirection: 'row',
        marginTop: 4,
    },
    badgeSkeleton: {
        width: 110,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EEF0F2',
    },
    rejectionCard: {
        backgroundColor: '#FFF5F5',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    rejectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    rejectionTitle: {
        color: '#C62828',
        fontSize: 14,
    },
    rejectionText: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
        lineHeight: 22,
    },
    section: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontFamily: 'GoogleSans_700Bold',
        marginBottom: 8,
    },
    readOnlyField: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    readOnlyText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
        color: '#333',
    },
    fieldSkeleton: {
        width: '60%',
        height: 18,
        borderRadius: 6,
        backgroundColor: '#E5E7EB',
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
    },
    uploadAreaWithPreview: {
        borderStyle: 'solid',
        borderColor: '#E5E7EB',
        padding: 0,
        overflow: 'hidden',
        height: 450,
    },
    proofSkeleton: {
        width: '100%',
        height: '100%',
        borderRadius: 14,
        backgroundColor: '#EEF0F2',
    },
    emptyUploadContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    uploadText: {
        fontSize: 16,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
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
    footer: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        paddingBottom: 32,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    mainButton: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    uploadButton: {
        backgroundColor: '#000',
    },
    submitButton: {
        backgroundColor: '#2E7D32',
    },
    mainButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    sheetContent: {
        padding: 24,
        paddingBottom: 40,
    },
    sheetTitle: {
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: 'GoogleSans_700Bold',
    },
    uploadOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
    },
    uploadOptionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    uploadOptionText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
        color: '#333',
        flex: 1,
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
        borderWidth: 1,
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
});
