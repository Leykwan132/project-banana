import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import ActionSheet, { ActionSheetRef } from 'react-native-actions-sheet';
import { Check } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Option {
    label: string;
    value: string;
    icon?: React.ElementType;
}

interface SelectionSheetProps {
    actionSheetRef: React.RefObject<ActionSheetRef | null>;
    title: string;
    options: Option[];
    selectedOption: string | null;
    onSelect: (value: string) => void;
    onReset?: () => void;
    type: 'filter' | 'sort';
}

export function SelectionSheet({
    actionSheetRef,
    title,
    options,
    selectedOption,
    onSelect,
    onReset,
    type,
}: SelectionSheetProps) {
    const colorScheme = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'light'];

    const handleSelect = (value: string) => {
        onSelect(value);
        actionSheetRef.current?.hide();
    };

    const handleReset = () => {
        if (onReset) {
            onReset();
            actionSheetRef.current?.hide();
        }
    };

    return (
        <ActionSheet ref={actionSheetRef} gestureEnabled>
            <View style={styles.sheetContent}>
                <ThemedText type="subtitle" style={styles.title}>
                    {title}
                </ThemedText>

                {type === 'filter' ? (
                    <View style={styles.filterContainer}>
                        {options.map((option) => {
                            const isSelected = selectedOption === option.value;
                            const Icon = option.icon;
                            return (
                                <Pressable
                                    key={option.value}
                                    style={[
                                        styles.chip,
                                        isSelected
                                            ? { backgroundColor: '#F5F5F5', borderColor: themeColors.text, borderWidth: 1 }
                                            : { backgroundColor: themeColors.background, borderColor: '#E0E0E0', borderWidth: 1 },
                                    ]}
                                    onPress={() => handleSelect(option.value)}
                                >
                                    {Icon && <Icon size={16} color={isSelected ? themeColors.text : '#6B7280'} />}
                                    <ThemedText
                                        style={[
                                            styles.chipText,
                                            { color: themeColors.text },
                                            isSelected && { fontFamily: 'GoogleSans_700Bold' },
                                        ]}
                                    >
                                        {option.label}
                                    </ThemedText>
                                </Pressable>
                            );
                        })}
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        {options.map((option) => {
                            const isSelected = selectedOption === option.value;
                            const Icon = option.icon;
                            return (
                                <Pressable
                                    key={option.value}
                                    style={styles.listItem}
                                    onPress={() => handleSelect(option.value)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        {Icon && <Icon size={20} color={isSelected ? themeColors.text : '#6B7280'} />}
                                        <ThemedText style={[styles.listItemText, isSelected && styles.selectedListItemText]}>
                                            {option.label}
                                        </ThemedText>
                                    </View>
                                    {isSelected && <Check size={20} color={themeColors.text} />}
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                {onReset && (
                    <Pressable style={styles.resetButton} onPress={handleReset}>
                        <ThemedText style={styles.resetButtonText}>Reset</ThemedText>
                    </Pressable>
                )}
            </View>
        </ActionSheet>
    );
}

const styles = StyleSheet.create({
    sheetContent: {
        padding: 24,
        paddingBottom: 40,
    },
    title: {
        marginBottom: 24,
        textAlign: 'center',
    },
    filterContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 32,
        justifyContent: 'center',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
    },
    chipText: {
        fontSize: 14,
        fontFamily: 'GoogleSans_500Medium',
    },
    listContainer: {
        marginBottom: 32,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    listItemText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
    },
    selectedListItemText: {
        fontFamily: 'GoogleSans_700Bold',
    },
    resetButton: {
        alignItems: 'center',
        paddingVertical: 16,
        marginTop: 16,
        backgroundColor: '#000000',
        borderRadius: 100,
        width: '100%',
    },
    resetButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontFamily: 'GoogleSans_700Bold',
    },
});
