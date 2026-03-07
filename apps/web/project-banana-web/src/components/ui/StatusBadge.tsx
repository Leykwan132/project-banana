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
                return 'bg-emerald-500';
            case 'failed':
            case 'canceled':
            case 'rejected':
                return 'bg-red-500';
            case 'processing':
                return 'bg-blue-500';
            case 'pending':
            case 'paused':
            default:
                return 'bg-amber-500';
        }
    };

    const dotColorClass = getStatusConfig(status);

    const formattedStatus = status.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 ${className}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`} />
            <span>{formattedStatus}</span>
        </div>
    );
}
