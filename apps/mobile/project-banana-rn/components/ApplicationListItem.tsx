
import { View, StyleSheet, Image, Pressable, StyleProp, ViewStyle } from 'react-native';
import {
    Calendar,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ApplicationStatus, ApplicationStatusBadge } from '@/components/ApplicationStatusBadge';

interface ApplicationListItemProps {
    logoUrl?: string;
    campaignName: string;
    companyName?: string;
    createdOn?: string;
    status?: ApplicationStatus;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
}

export function ApplicationListItem({
    logoUrl,
    campaignName,
    companyName = 'Company Name',
    status,
    createdOn,
    onPress,
    style,
}: ApplicationListItemProps) {
    const colorScheme = useColorScheme();

    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.container,
                { backgroundColor: Colors[colorScheme ?? 'light'].background },
                style
            ]}
        >
            {/* Top Part */}
            <View style={styles.topSection}>
                <View style={styles.logoContainer}>
                    {logoUrl ? (
                        <Image source={{ uri: logoUrl }} style={styles.logo} />
                    ) : (
                        <View style={[styles.logoPlaceholder, { backgroundColor: '#FF9900' }]}>
                            <ThemedText style={styles.logoText}>
                                {campaignName.charAt(0).toUpperCase()}
                            </ThemedText>
                        </View>
                    )}
                </View>
                <View style={styles.titleContainer}>
                    <View style={styles.textColumn}>
                        <ThemedText style={styles.companyName}>
                            {companyName}
                        </ThemedText>
                        <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={2}>
                            {campaignName}
                        </ThemedText>
                    </View>
                </View>
            </View>

            {/* Bottom Part */}
            <View style={styles.bottomSection}>
                <ApplicationStatusBadge status={status} />

                {createdOn && (
                    <View style={styles.statItem}>
                        <Calendar size={16} color={Colors[colorScheme ?? 'light'].icon} style={styles.icon} />
                        <ThemedText style={styles.statText}>
                            Created on {createdOn}
                        </ThemedText>
                    </View>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        paddingVertical: 16,
        marginBottom: 12,
        borderRadius: 12,
    },
    topSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoContainer: {
        marginRight: 12,
    },
    logo: {
        width: 48,
        height: 48,
        resizeMode: 'contain',
        borderRadius: 100,
    },
    logoPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'GoogleSans_700Bold',
    },
    titleContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    textColumn: {
        flex: 1,
        marginRight: 8,
    },
    name: {
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 2,
    },
    companyName: {
        fontSize: 14,
        color: '#6B7280',
        fontFamily: 'GoogleSans_400Regular',
    },
    bottomSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    icon: {
        opacity: 0.7,
    },
    statText: {
        fontSize: 13,
        color: '#4B5563',
        fontFamily: 'GoogleSans_500Medium',
    },
});
