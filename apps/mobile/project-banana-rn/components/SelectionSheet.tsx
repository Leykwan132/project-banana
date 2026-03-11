import { View, StyleSheet, Pressable } from 'react-native';
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
    const isDark = colorScheme === 'dark';
    const screenBackgroundColor = isDark ? themeColors.screenBackground : '#F4F3EE';
    const controlBackgroundColor = isDark ? '#141414' : '#F7F4ED';
    const borderColor = isDark ? '#303030' : '#E4DED2';
    const dividerColor = isDark ? '#2A2A2A' : '#E7E2D8';
    const selectedBackgroundColor = isDark ? '#262626' : '#D9D2C6';
    const selectedBorderColor = isDark ? '#383838' : '#C8BFB1';
    const selectedTextColor = isDark ? '#ECEDEE' : '#111111';
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
        <ActionSheet
            ref={actionSheetRef}
            gestureEnabled
            containerStyle={{ backgroundColor: screenBackgroundColor }}
        >
            <View style={[styles.sheetContent, { backgroundColor: screenBackgroundColor }]}>
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
                                            ? { backgroundColor: selectedBackgroundColor, borderColor: selectedBorderColor, borderWidth: 1 }
                                            : { backgroundColor: controlBackgroundColor, borderColor, borderWidth: 1 },
                                    ]}
                                    onPress={() => handleSelect(option.value)}
                                >
                                    {Icon && <Icon size={16} color={isSelected ? selectedTextColor : (isDark ? '#9CA3AF' : '#6B7280')} />}
                                    <ThemedText
                                        style={[
                                            styles.chipText,
                                            { color: isSelected ? selectedTextColor : themeColors.text },
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
                                    style={[
                                        styles.listItem,
                                        { borderBottomColor: dividerColor },
                                        isSelected && {
                                            backgroundColor: selectedBackgroundColor,
                                            borderRadius: 14,
                                            borderBottomColor: 'transparent',
                                            paddingHorizontal: 14,
                                        }
                                    ]}
                                    onPress={() => handleSelect(option.value)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        {Icon && <Icon size={20} color={isSelected ? selectedTextColor : (isDark ? '#9CA3AF' : '#6B7280')} />}
                                        <ThemedText style={[styles.listItemText, isSelected && styles.selectedListItemText, isSelected && { color: selectedTextColor }]}>
                                            {option.label}
                                        </ThemedText>
                                    </View>
                                    {isSelected && <Check size={20} color={selectedTextColor} />}
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                {onReset && (
                    <Pressable
                        style={[
                            styles.resetButton,
                            {
                                backgroundColor: isDark ? '#F3F1EA' : '#000000',
                                borderColor: isDark ? '#F3F1EA' : '#000000',
                            }
                        ]}
                        onPress={handleReset}
                    >
                        <ThemedText style={[styles.resetButtonText, { color: isDark ? '#111111' : '#FFFFFF' }]}>Reset</ThemedText>
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
        paddingHorizontal: 6,
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
        borderWidth: 1,
        borderColor: '#E4DED2',
        width: '100%',
    },
    resetButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontFamily: 'GoogleSans_700Bold',
    },
});
