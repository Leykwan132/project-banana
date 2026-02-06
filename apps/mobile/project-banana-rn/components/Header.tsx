import { View, StyleSheet, Image } from 'react-native';
import { Bell } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface HeaderProps {
    title?: string;
}

export function Header({ title }: HeaderProps) {
    const colorScheme = useColorScheme();

    return (
        <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].navBackground }]}>
            <View style={styles.leftSection}>
                {title ? (
                    <ThemedText type="title" style={styles.headerTitle}>{title}</ThemedText>
                ) : (
                    <>
                        <View style={styles.logoContainer}>
                            <ThemedText type="title" style={styles.logoText}>✦</ThemedText>
                        </View>
                        <ThemedText type="defaultSemiBold" style={styles.appName}>Youniq</ThemedText>
                    </>
                )}
            </View>
            <View style={styles.rightSection}>
                <View style={styles.iconButton}>
                    <Bell size={22} color={Colors[colorScheme ?? 'light'].text} />
                </View>
                <View style={styles.avatar}>
                    <Image
                        source={{ uri: 'https://i.pravatar.cc/100' }}
                        style={styles.avatarImage}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        color: '#fff',
        fontSize: 18,
        lineHeight: 22,
    },
    appName: {
        fontSize: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'GoogleSans_700Bold',
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
});
