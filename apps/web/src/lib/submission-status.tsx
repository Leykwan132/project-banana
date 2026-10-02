import { Chip } from '@heroui/react';
import { CheckCircle2, Circle, Clock3, AlertCircle, RotateCcw, ScanEye, Send } from 'lucide-react';
export const submissionStatuses: Record<string, { label: string; color: string }> = {
    pending_submission: { label: 'Pending submission', color: 'text-slate-700' },
    reviewing: { label: 'Reviewing', color: 'text-blue-700' },
    pending_review: { label: 'Pending review', color: 'text-cyan-800' },
    changes_requested: { label: 'Changes requested', color: 'text-orange-800' },
    ready_to_post: { label: 'Ready to post', color: 'text-violet-700' },
    verifying: { label: 'Verifying', color: 'text-indigo-700' },
    action_required: { label: 'Action required', color: 'text-rose-700' },
    earning: { label: 'Earning', color: 'text-emerald-700' },
};

export function submissionStatus(status: string) {
    return submissionStatuses[status] ?? {
        label: status.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase()),
        color: 'text-gray-700',
    };
}

export function SubmissionStatusBadge({ status }: { status: string }) {
    const { label, color } = submissionStatus(status);
    const Icon = status === 'earning' ? CheckCircle2 : ['changes_requested', 'changes_required'].includes(status) ? RotateCcw : status === 'action_required' ? AlertCircle : status === 'ready_to_post' ? Send : status === 'verifying' ? ScanEye : ['reviewing', 'pending_review', 'pending_submission'].includes(status) ? Clock3 : Circle;
    return <Chip size="sm" variant="flat" startContent={<Icon size={8} aria-hidden="true" className={color} />} classNames={{ base: 'w-fit gap-1.5 px-3 bg-gray-100 text-black', content: 'text-xs font-semibold text-black' }}>{label}</Chip>;
}
