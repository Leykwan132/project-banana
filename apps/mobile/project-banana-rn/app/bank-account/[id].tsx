import { useState, useRef } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Upload, Eye, AlertCircle, FileText, CheckCircle, Clock, XCircle, ChevronRight, Camera, ImageIcon, Pencil } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ApplicationStatus, ApplicationStatusBadge } from '@/components/ApplicationStatusBadge';

type BankAccountStatus = 'active' | 'pending' | 'rejected';

export default function BankAccountDetailsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const status = params.status as BankAccountStatus;
    const isRejected = status === 'rejected';

    const [uploadedFile, setUploadedFile] = useState<{
        uri: string;
        name?: string;
        type: 'image' | 'pdf';
    } | null>(params.proofUri ? {
        uri: params.proofUri as string,
        name: 'Current Proof',
        type: 'image',
    } : null);

    const [isLoading, setIsLoading] = useState(false);
    const [submitStep, setSubmitStep] = useState<'pending' | null>(null);

    const uploadOptionsSheetRef = useRef<ActionSheetRef>(null);
    const submitStatusSheetRef = useRef<ActionSheetRef>(null);

    const mappedStatus: ApplicationStatus =
        status === 'active' ? 'Active' :
            status === 'pending' ? 'Under Review' :
                'Rejected';

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
            });
        }
        uploadOptionsSheetRef.current?.hide();

    };

    const handleSubmitReupload = async () => {
        setIsLoading(true);

        // Simulate upload delay
        setTimeout(() => {
            setIsLoading(false);
            setSubmitStep('pending');
            submitStatusSheetRef.current?.show();
        }, 2000);
    };

    const handleCloseSubmitSheet = () => {
        submitStatusSheetRef.current?.hide();
        setTimeout(() => {
            setSubmitStep(null);
            router.back();
        }, 300);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.text} />
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
                    <View style={styles.section}>
                        <ThemedText type="defaultSemiBold" style={styles.label}>Verification Status</ThemedText>
                        <View style={styles.statusBadgeRow}>
                            <ApplicationStatusBadge status={mappedStatus} />
                        </View>
                    </View>

                    {/* Rejection Reason */}
                    {isRejected && params.rejectionReason && (
                        <View style={styles.rejectionCard}>
                            <View style={styles.rejectionHeader}>
                                <AlertCircle size={18} color="#C62828" />
                                <ThemedText type="defaultSemiBold" style={styles.rejectionTitle}>
                                    Rejection Reason
                                </ThemedText>
                            </View>
                            <ThemedText style={styles.rejectionText}>
                                {params.rejectionReason}
                            </ThemedText>
                        </View>
                    )}

                    {/* Bank Details */}
                    <View style={styles.section}>
                        <ThemedText type="defaultSemiBold" style={styles.label}>Bank Name</ThemedText>
                        <View style={styles.readOnlyField}>
                            <ThemedText style={styles.readOnlyText}>{params.bankName}</ThemedText>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <ThemedText type="defaultSemiBold" style={styles.label}>Account Number</ThemedText>
                        <View style={styles.readOnlyField}>
                            <ThemedText style={styles.readOnlyText}>{params.accountNumber}</ThemedText>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <ThemedText type="defaultSemiBold" style={styles.label}>Account Holder</ThemedText>
                        <View style={styles.readOnlyField}>
                            <ThemedText style={styles.readOnlyText}>{params.accountHolder}</ThemedText>
                        </View>
                    </View>

                    {/* Proof Section */}
                    <View style={styles.section}>
                        <ThemedText type="defaultSemiBold" style={styles.label}>Proof of Bank Account</ThemedText>

                        {/* Upload Area */}
                        <View style={[styles.uploadArea, uploadedFile && styles.uploadAreaWithPreview]}>
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
                                    <Upload size={40} color="#666" />
                                    <ThemedText style={styles.uploadText}>No proof uploaded</ThemedText>
                                </Pressable>
                            )}
                        </View>
                    </View>
                </ScrollView>

                {/* Footer Buttons for Rejected */}
                {isRejected && (
                    <View style={styles.footer}>
                        {uploadedFile && uploadedFile.name !== 'Current Proof' ? (
                            /* Submit Button - Only visible when new file uploaded */
                            <Pressable
                                style={[styles.mainButton, styles.submitButton]}
                                onPress={handleSubmitReupload}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <ThemedText style={styles.mainButtonText}>Submit for Review</ThemedText>
                                )}
                            </Pressable>
                        ) : (
                            /* Upload Button - Visible when no new file uploaded */
                            <Pressable
                                style={[styles.mainButton, styles.uploadButton]}
                                onPress={() => uploadOptionsSheetRef.current?.show()}
                            >
                                <Upload size={20} color="#fff" />
                                <ThemedText style={styles.mainButtonText}>Upload New Proof</ThemedText>
                            </Pressable>
                        )}
                    </View>
                )}
            </View>
            {/* Upload Options Sheet */}
            <ActionSheet ref={uploadOptionsSheetRef} gestureEnabled>
                <View style={styles.sheetContent}>
                    <ThemedText type="subtitle" style={styles.sheetTitle}>Upload Proof</ThemedText>

                    <Pressable style={styles.uploadOption} onPress={handleTakePhoto}>
                        <View style={styles.uploadOptionIcon}>
                            <Camera size={24} color="#000" />
                        </View>
                        <ThemedText style={styles.uploadOptionText}>Take a Photo</ThemedText>
                    </Pressable>

                    <View style={styles.divider} />

                    <Pressable style={styles.uploadOption} onPress={handleChooseFromGallery}>
                        <View style={styles.uploadOptionIcon}>
                            <ImageIcon size={24} color="#000" />
                        </View>
                        <ThemedText style={styles.uploadOptionText}>Choose from Gallery</ThemedText>
                    </Pressable>

                    <View style={styles.divider} />

                    <Pressable style={styles.uploadOption} onPress={handleUploadPDF}>
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
                                Pending Review
                            </ThemedText>
                            <ThemedText style={styles.statusDescription}>
                                Your updated proof has been submitted for review. We will verify your details and notify you once it's approved.
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
    statusBadgeRow: {
        flexDirection: 'row',
        marginTop: 4,
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
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
});
