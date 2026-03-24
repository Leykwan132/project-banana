import { View, StyleSheet, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppBottomSheet, BottomSheetView } from '@/components/ui/AppBottomSheet';

interface Option {
    label: string;
    value: string;
    icon?: React.ElementType;
}

interface SelectionSheetProps {
    open: boolean;
    onClose: () => void;
    title: string;
    options: Option[];
    selectedOption: string | null;
    onSelect: (value: string) => void;
    onReset?: () => void;
    type: 'filter' | 'sort';
}

export function SelectionSheet({
    open,
    onClose,
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
    const cardBackgroundColor = isDark ? '#171717' : '#FBFAF7';
    const cardBorderColor = isDark ? '#303030' : '#E4DED2';
    const badgeBackgroundColor = isDark ? '#111111' : '#F3EEE3';
    const badgeBorderColor = isDark ? '#303030' : '#DDD6C7';
    const selectedBackgroundColor = isDark ? '#1E1E1E' : '#F3EEE3';
    const selectedBorderColor = isDark ? '#424242' : '#D8D0C2';
    const selectedTextColor = isDark ? '#ECEDEE' : '#111111';
    const selectedIconBadgeColor = isDark ? '#262626' : '#ECE3D4';
    const iconBadgeColor = badgeBackgroundColor;
    const handleSelect = (value: string) => {
        onSelect(value);
        onClose();
    };

    const handleReset = () => {
        if (onReset) {
            onReset();
            onClose();
        }
    };

    return (
        <AppBottomSheet
            open={open}
            onClose={onClose}
            backgroundColor={screenBackgroundColor}
        >
            <BottomSheetView style={[styles.sheetContent, { backgroundColor: screenBackgroundColor }]}>
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
                                        {
                                            backgroundColor: isSelected ? selectedBackgroundColor : cardBackgroundColor,
                                            borderColor: isSelected ? selectedBorderColor : cardBorderColor,
                                            borderWidth: 1,
                                        },
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
                                        {
                                            backgroundColor: isSelected ? selectedBackgroundColor : cardBackgroundColor,
                                            borderColor: isSelected ? selectedBorderColor : cardBorderColor,
                                        },
                                    ]}
                                    onPress={() => handleSelect(option.value)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        {Icon ? (
                                            <View
                                                style={[
                                                    styles.listIconBadge,
                                                    {
                                                        backgroundColor: isSelected ? selectedIconBadgeColor : iconBadgeColor,
                                                        borderColor: isSelected ? selectedBorderColor : badgeBorderColor,
                                                    },
                                                ]}
                                            >
                                                <Icon size={18} color={isSelected ? selectedTextColor : (isDark ? '#9CA3AF' : '#6B7280')} />
                                            </View>
                                        ) : null}
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
            </BottomSheetView>
        </AppBottomSheet>
    );
}

const styles = StyleSheet.create({
    sheetContent: {
        padding: 24,
        paddingBottom: 48,
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
        borderRadius: 20,
    },
    chipText: {
        fontSize: 14,
        fontFamily: 'GoogleSans_500Medium',
    },
    listContainer: {
        gap: 8,
        marginBottom: 32,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    listIconBadge: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listItemText: {
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
    },
    selectedListItemText: {
        fontFamily: 'GoogleSans_600SemiBold',
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
