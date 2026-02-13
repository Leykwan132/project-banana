import { useState } from 'react';
import { View, StyleSheet, Pressable, StyleProp, TextStyle, ActivityIndicator } from 'react-native';
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';

import { ThemedText } from '@/components/themed-text';

export interface DetailItem {
    label: string;
    value: string;
    valueStyle?: StyleProp<TextStyle>;
    note?: string;
}

interface TransactionDetailsSheetProps {
    actionSheetRef: React.RefObject<ActionSheetRef | null>;
    title?: string;
    details: DetailItem[];
    onCancel?: () => Promise<void> | void;
    cancelText?: string;
}

export function TransactionDetailsSheet({
    actionSheetRef,
    title = "Transaction Details",
    details,
    onCancel,
    cancelText = "Cancel Withdrawal",
}: TransactionDetailsSheetProps) {
    const insets = useSafeAreaInsets();
    const [view, setView] = useState<'details' | 'confirm' | 'success'>('details');
    const [isLoading, setIsLoading] = useState(false);

    const handleCancelPress = () => {
        setView('confirm');
    };

    const handleConfirmCancel = async () => {
        if (!onCancel) return;
        setIsLoading(true);
        try {
            await onCancel();
            setView('success');
        } catch (error) {
            console.error(error);
            // Handle error state if needed
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismiss = () => {
        actionSheetRef.current?.hide();
        // Reset state after sheet closes
        setTimeout(() => {
            setView('details');
            setIsLoading(false);
        }, 300);
    };

    return (
        <ActionSheet ref={actionSheetRef} gestureEnabled onClose={() => setView('details')}>
            <View style={[styles.sheetContent]}>
                {view === 'details' && (
                    <>
                        <ThemedText type="subtitle" style={styles.sheetTitle}>{title}</ThemedText>

                        {details.map((item, index) => (
                            <View key={index}>
                                <View style={styles.detailRow}>
                                    <View>
                                        <ThemedText style={styles.detailLabel}>{item.label}</ThemedText>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <ThemedText type="defaultSemiBold" style={item.valueStyle}>{item.value}</ThemedText>
                                        {item.note && (
                                            <ThemedText style={styles.noteText}>{item.note}</ThemedText>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.divider} />
                            </View>
                        ))}

                        {onCancel && (
                            <Pressable
                                style={[styles.button, styles.cancelButton]}
                                onPress={handleCancelPress}
                            >
                                <ThemedText style={styles.cancelButtonText}>{cancelText}</ThemedText>
                            </Pressable>
                        )}

                        <Pressable
                            style={[styles.button, styles.dismissButton, onCancel && { marginTop: 12 }]}
                            onPress={handleDismiss}
                        >
                            <ThemedText style={styles.dismissButtonText}>Dismiss</ThemedText>
                        </Pressable>
                    </>
                )}

                {view === 'confirm' && (
                    <View style={styles.centerContent}>
                        <ThemedText type="subtitle" style={styles.sheetTitle}>Cancel Withdrawal?</ThemedText>
                        <ThemedText style={styles.messageText}>Are you sure you want to cancel this withdrawal request?</ThemedText>

                        <Pressable
                            style={[styles.button, styles.cancelButton, { width: '100%', marginTop: 32 }]}
                            onPress={handleConfirmCancel}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <ThemedText style={styles.cancelButtonText}>Yes, Cancel</ThemedText>
                            )}
                        </Pressable>

                        <Pressable
                            style={[styles.button, styles.dismissButton, { width: '100%', marginTop: 12 }]}
                            onPress={() => setView('details')}
                            disabled={isLoading}
                        >
                            <ThemedText style={styles.dismissButtonText}>No, Keep it</ThemedText>
                        </Pressable>
                    </View>
                )}

                {view === 'success' && (
                    <View style={styles.centerContent}>
                        <LottieView
                            source={require('@/assets/lotties/success.json')}
                            autoPlay
                            loop={false}
                            style={{ width: 150, height: 150 }}
                        />
                        <ThemedText type="subtitle" style={[styles.sheetTitle, { marginTop: 16 }]}>Cancellation Successful</ThemedText>
                        <ThemedText style={styles.messageText}>Your withdrawal request has been cancelled.</ThemedText>

                        <Pressable
                            style={[styles.button, styles.dismissButton, { width: '100%', marginTop: 32 }]}
                            onPress={handleDismiss}
                        >
                            <ThemedText style={styles.dismissButtonText}>Done</ThemedText>
                        </Pressable>
                    </View>
                )}
            </View>
        </ActionSheet>
    );
}

const styles = StyleSheet.create({
    sheetContent: {
        padding: 24,
    },
    sheetTitle: {
        marginBottom: 8,
        textAlign: 'center',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    detailLabel: {
        fontSize: 16,
        color: '#666',
        fontFamily: 'GoogleSans_400Regular',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
    },
    button: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 32,
    },
    cancelButton: {
        backgroundColor: '#D32F2F',
    },
    cancelButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    dismissButton: {
        backgroundColor: '#F5F5F5',
    },
    dismissButtonText: {
        color: '#000',
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
    },
    centerContent: {
        alignItems: 'center',
        width: '100%',
    },
    messageText: {
        textAlign: 'center',
        color: '#666',
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
        marginBottom: 8,
    },
    noteText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        fontFamily: 'GoogleSans_400Regular',
    },
});
