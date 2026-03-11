import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ApplicationStatus, ApplicationStatusBadge } from '@/components/ApplicationStatusBadge';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SubmissionListItemProps {
    attemptNumber: number;
    date: string;
    status: ApplicationStatus;
    onPress: () => void;
}

export function SubmissionListItem({
    attemptNumber,
    date,
    status,
    onPress,
}: SubmissionListItemProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.container,
                {
                    backgroundColor: isDark ? '#1A1A1A' : Colors[colorScheme ?? 'light'].background,
                    borderColor: isDark ? '#2F2F2F' : '#E5E7EB',
                },
                pressed && { opacity: 0.7 }
            ]}
        >
            <View style={styles.content}>
                <View style={styles.textContainer}>
                    <ThemedText type="defaultSemiBold" style={styles.title}>
                        Attempt {attemptNumber}
                    </ThemedText>
                    <ThemedText style={[styles.date, { color: isDark ? '#8A8A8A' : '#666666' }]}>
                        {date}
                    </ThemedText>
                </View>
                <ApplicationStatusBadge status={status} />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    textContainer: {
        gap: 4,
    },
    title: {
        fontSize: 16,
    },
    date: {
        fontSize: 14,
        color: '#666666',
        fontFamily: 'GoogleSans_400Regular',
    },
});
