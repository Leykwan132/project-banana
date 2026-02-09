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

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.container,
                { backgroundColor: Colors[colorScheme ?? 'light'].background },
                pressed && { opacity: 0.7 }
            ]}
        >
            <View style={styles.content}>
                <View style={styles.textContainer}>
                    <ThemedText type="defaultSemiBold" style={styles.title}>
                        Attempt {attemptNumber}
                    </ThemedText>
                    <ThemedText style={styles.date}>
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
        // Removed border properties
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
