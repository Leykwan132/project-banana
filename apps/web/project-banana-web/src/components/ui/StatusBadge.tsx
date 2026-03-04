import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
    status: string;
    className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
    const getStatusConfig = (status: string) => {
        const lowerState = status.toLowerCase();
        switch (lowerState) {
            case 'succeeded':
            case 'paid':
            case 'completed':
            case 'verified':
            case 'active':
                return {
                    colorClass: 'text-green-600 bg-green-50/50 border-green-100',
                    Icon: CheckCircle2
                };
            case 'failed':
            case 'canceled':
            case 'rejected':
                return {
                    colorClass: 'text-red-600 bg-red-50/50 border-red-100',
                    Icon: XCircle
                };
            case 'processing':
            case 'pending':
                return {
                    colorClass: 'text-blue-600 bg-blue-50/50 border-blue-100',
                    Icon: Clock
                };
            case 'paused':
            default:
                return {
                    colorClass: 'text-yellow-600 bg-yellow-50/50 border-yellow-100',
                    Icon: AlertCircle
                };
        }
    };

    const { colorClass, Icon } = getStatusConfig(status);

    const formattedStatus = status.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass} ${className}`}>
            <Icon className="w-3.5 h-3.5" />
            <span>{formattedStatus}</span>
        </div>
    );
}
