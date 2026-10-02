import { Chip } from '@heroui/react';
import { CheckCircle2, Circle, Clock3, AlertCircle, RotateCcw, ScanEye, Send } from 'lucide-react';
export const submissionStatuses: Record<string, { label: string; color: string }> = {
    pending_submission: { label: 'Pending submission', color: 'bg-slate-100 text-slate-700' },
    reviewing: { label: 'Reviewing', color: 'bg-blue-100 text-blue-700' },
    pending_review: { label: 'Pending review', color: 'bg-cyan-100 text-cyan-800' },
    changes_requested: { label: 'Changes requested', color: 'bg-orange-100 text-orange-800' },
    ready_to_post: { label: 'Ready to post', color: 'bg-violet-100 text-violet-700' },
    verifying: { label: 'Verifying', color: 'bg-indigo-100 text-indigo-700' },
    action_required: { label: 'Action required', color: 'bg-rose-100 text-rose-700' },
    earning: { label: 'Earning', color: 'bg-emerald-100 text-emerald-700' },
};

export function submissionStatus(status: string) {
    return submissionStatuses[status] ?? {
        label: status.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase()),
        color: 'bg-gray-100 text-gray-700',
    };
}

export function SubmissionStatusBadge({ status }: { status: string }) {
    const { label, color } = submissionStatus(status);
    const Icon = status === 'earning' ? CheckCircle2 : status === 'changes_requested' ? RotateCcw : status === 'action_required' ? AlertCircle : status === 'ready_to_post' ? Send : status === 'verifying' ? ScanEye : ['reviewing', 'pending_review', 'pending_submission'].includes(status) ? Clock3 : Circle;
    return <Chip size="sm" variant="flat" startContent={<Icon size={13} aria-hidden="true" />} classNames={{ base: `w-fit gap-1 ${color}`, content: 'text-xs font-semibold' }}>{label}</Chip>;
}
