import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import {
    Clock,
    Eye,
    AlertCircle,
    CheckCheck,
    CircleCheck,
    Star
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';

export type ApplicationStatus = 'Pending Submission' | 'Under Review' | 'Changes Required' | 'Ready to Post' | 'Posted' | 'Active' | 'Rejected' | 'Pending' | 'Paid' | 'Processing' | 'Completed' | 'Failed';

export const getStatusConfig = (status?: ApplicationStatus) => {
    switch (status) {
        case 'Ready to Post':
            return {
                bg: '#E6F4EA',
                text: '#1E8E3E',
                border: '#1E8E3E',
                icon: CircleCheck,
                iconColor: '#8ad55d'
            };
        case 'Pending Submission':
            return {
                bg: '#E3F2FD',
                text: '#1976D2',
                border: '#1976D2',
                icon: Clock,
                iconColor: '#1976D2'
            };
        case 'Under Review':
            return {
                bg: '#FEF7E0',
                text: '#B08800',
                border: '#B08800',
                icon: Eye,
                iconColor: '#FFF93C'
            };
        case 'Changes Required':
            return {
                bg: '#FCE8E6',
                text: '#D93025',
                border: '#D93025',
                icon: AlertCircle,
                iconColor: '#FF7E87'
            };
        case 'Posted':
            return {
                bg: '#E6F4EA',
                text: '#1E8E3E',
                border: '#1E8E3E',
                icon: Star,
                iconColor: '#FFD700'
            };
        case 'Active':
            return {
                bg: '#E6F4EA',
                text: '#1E8E3E',
                border: '#1E8E3E',
                icon: CircleCheck,
                iconColor: '#8ad55d'
            };
        case 'Rejected':
            return {
                bg: '#FCE8E6',
                text: '#D93025',
                border: '#D93025',
                icon: AlertCircle,
                iconColor: '#FF7E87'
            };
        case 'Pending':
            return {
                bg: '#FFF3E0',
                text: '#F57C00',
                border: '#F57C00',
                icon: Clock,
                iconColor: '#F57C00'
            };
        case 'Paid':
        case 'Completed':
            return {
                bg: '#E8F5E9',
                text: '#2E7D32',
                border: '#2E7D32',
                icon: CheckCheck,
                iconColor: '#2E7D32'
            };
        case 'Processing':
            return {
                bg: '#E3F2FD',
                text: '#1976D2',
                border: '#1976D2',
                icon: Clock,
                iconColor: '#1976D2'
            };
        case 'Failed':
            return {
                bg: '#FFEBEE',
                text: '#C62828',
                border: '#C62828',
                icon: AlertCircle,
                iconColor: '#C62828'
            };
        default:
            return {
                bg: '#F3F4F6',
                text: '#4B5563',
                border: '#9CA3AF',
                icon: Clock,
                iconColor: '#4B5563'
            };
    }
};

interface ApplicationStatusBadgeProps {
    status?: ApplicationStatus;
    style?: StyleProp<ViewStyle>;
}

export function ApplicationStatusBadge({ status, style }: ApplicationStatusBadgeProps) {
    if (!status) return null;

    const { icon: StatusIcon, iconColor } = getStatusConfig(status);

    return (
        <View style={[styles.statusBadge, style]}>
            <StatusIcon size={14} fill={iconColor} />
            <ThemedText style={styles.statusText}>
                {status}
            </ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 2,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'GoogleSans_500Medium',
        color: '#000000',
    },
});
