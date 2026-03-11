import { useState } from 'react';
import { View, StyleSheet, Pressable, StyleProp, TextStyle } from 'react-native';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import LottieView from 'lottie-react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
    /** Optional fully-custom content that replaces the default detail rows */
    customContent?: React.ReactNode;
}

export function TransactionDetailsSheet({
    actionSheetRef,
    title = "Transaction Details",
    details,
    onCancel,
    cancelText = "Cancel Withdrawal",
    customContent,
}: TransactionDetailsSheetProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
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
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismiss = () => {
        actionSheetRef.current?.hide();
        setTimeout(() => {
            setView('details');
            setIsLoading(false);
        }, 300);
    };

    return (
        <ActionSheet
            ref={actionSheetRef}
            gestureEnabled
            onClose={() => setView('details')}
            containerStyle={{ backgroundColor: theme.screenBackground }}
        >
            <View style={[styles.sheetContent, { backgroundColor: theme.screenBackground }]}>
                {view === 'details' && (
                    <>
                        <ThemedText type="subtitle" style={[styles.sheetTitle, { color: theme.text }]}>{title}</ThemedText>

                        {customContent ? (
                            customContent
                        ) : (
                            details.map((item, index) => (
                                <View key={index}>
                                    <View style={styles.detailRow}>
                                        <View>
                                            <ThemedText style={[styles.detailLabel, { color: isDark ? '#A3A3A3' : '#666666' }]}>{item.label}</ThemedText>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <ThemedText type="defaultSemiBold" style={item.valueStyle}>{item.value}</ThemedText>
                                            {item.note && (
                                                <ThemedText style={[styles.noteText, { color: isDark ? '#8A8A8A' : '#666666' }]}>{item.note}</ThemedText>
                                            )}
                                        </View>
                                    </View>
                                    <View style={[styles.divider, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]} />
                                </View>
                            ))
                        )}

                        {onCancel && (
                            <Pressable
                                style={[styles.button, styles.cancelButton]}
                                onPress={handleCancelPress}
                            >
                                <ThemedText style={styles.cancelButtonText}>{cancelText}</ThemedText>
                            </Pressable>
                        )}

                        <Pressable
                            style={[
                                styles.button,
                                styles.dismissButton,
                                { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5', borderColor: isDark ? '#333333' : 'transparent' },
                                onCancel && { marginTop: 12 }
                            ]}
                            onPress={handleDismiss}
                        >
                            <ThemedText style={[styles.dismissButtonText, { color: theme.text }]}>Dismiss</ThemedText>
                        </Pressable>
                    </>
                )}

                {view === 'confirm' && (
                    <View style={styles.centerContent}>
                        <ThemedText type="subtitle" style={[styles.sheetTitle, { color: theme.text }]}>Cancel Withdrawal?</ThemedText>
                        <ThemedText style={[styles.messageText, { color: isDark ? '#A3A3A3' : '#666666' }]}>Are you sure you want to cancel this withdrawal request?</ThemedText>

                        <Pressable
                            style={[styles.button, styles.cancelButton, { width: '100%', marginTop: 32 }]}
                            onPress={handleConfirmCancel}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <LoadingIndicator size="small" color="#fff" />
                            ) : (
                                <ThemedText style={styles.cancelButtonText}>Yes, Cancel</ThemedText>
                            )}
                        </Pressable>

                        <Pressable
                            style={[
                                styles.button,
                                styles.dismissButton,
                                { width: '100%', marginTop: 12, backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5', borderColor: isDark ? '#333333' : 'transparent' }
                            ]}
                            onPress={() => setView('details')}
                            disabled={isLoading}
                        >
                            <ThemedText style={[styles.dismissButtonText, { color: theme.text }]}>No, Keep it</ThemedText>
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
                        <ThemedText type="subtitle" style={[styles.sheetTitle, { marginTop: 16, color: theme.text }]}>Cancellation Successful</ThemedText>
                        <ThemedText style={[styles.messageText, { color: isDark ? '#A3A3A3' : '#666666' }]}>Your withdrawal request has been cancelled.</ThemedText>

                        <Pressable
                            style={[
                                styles.button,
                                styles.dismissButton,
                                { width: '100%', marginTop: 32, backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5', borderColor: isDark ? '#333333' : 'transparent' }
                            ]}
                            onPress={handleDismiss}
                        >
                            <ThemedText style={[styles.dismissButtonText, { color: theme.text }]}>Done</ThemedText>
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
        borderWidth: 1,
        borderColor: 'transparent',
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
