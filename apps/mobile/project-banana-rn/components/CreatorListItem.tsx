import { View, StyleSheet, Image, Pressable } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface CreatorListItemProps {
    name: string;
    views: string;
    amount: string;
    logoUrl?: string;
    onPress?: () => void;
}

export function CreatorListItem({
    name,
    views,
    amount,
    logoUrl,
    onPress,
}: CreatorListItemProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    return (
        <Pressable onPress={onPress} style={styles.container}>
            <View style={styles.leftSection}>
                <View style={styles.logoContainer}>
                    {logoUrl ? (
                        <Image source={{ uri: logoUrl }} style={styles.logo} />
                    ) : (
                        <View style={[styles.logoPlaceholder, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderColor: isDark ? '#333333' : '#EEEEEE' }]}>
                            <ThemedText style={[styles.logoText, { color: theme.text }]}>{name.charAt(0)}</ThemedText>
                        </View>
                    )}
                </View>
                <View style={styles.content}>
                    <ThemedText type="defaultSemiBold" style={styles.name}>{name}</ThemedText>
                    <View style={styles.metaRow}>
                        <ThemedText style={[styles.metaTextHighlight, { color: theme.text }]}>{views} views</ThemedText>
                        <ThemedText style={[styles.metaText, { color: isDark ? '#9CA3AF' : '#666666' }]}>  {amount} received</ThemedText>
                    </View>
                </View>
            </View>

            <View style={[styles.arrowContainer, { backgroundColor: isDark ? '#2D230F' : '#FFFBE6', borderColor: isDark ? '#5A4615' : '#FEF3C7' }]}>
                <ArrowUpRight size={20} color={isDark ? '#FBBF24' : '#000'} />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    logoContainer: {
        marginRight: 12,
    },
    logo: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    logoPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    logoText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 16,
        fontFamily: 'GoogleSans_700Bold',
        marginBottom: 2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 13,
        color: '#666666',
        fontFamily: 'GoogleSans_400Regular',
    },
    metaTextHighlight: {
        fontSize: 13,
        color: '#000000',
        fontFamily: 'GoogleSans_700Bold',
    },
    arrowContainer: {
        width: 40,
        height: 40,
        backgroundColor: '#FFFBE6', // Light yellow bg from screenshot? Or just white/light gray
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
});
