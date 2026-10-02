import { Chip } from '@heroui/react';
import { Circle } from 'lucide-react';
export const submissionStatuses: Record<string, { label: string; color: string }> = {
    pending_submission: { label: 'Pending submission', color: 'bg-slate-400' },
    reviewing: { label: 'Reviewing', color: 'bg-blue-500' },
    pending_review: { label: 'Pending review', color: 'bg-cyan-500' },
    changes_requested: { label: 'Changes requested', color: 'bg-orange-500' },
    changes_required: { label: 'Changes required', color: 'bg-gray-500' },
    ready_to_post: { label: 'Ready to post', color: 'bg-violet-500' },
    verifying: { label: 'Verifying', color: 'bg-indigo-500' },
    action_required: { label: 'Action required', color: 'bg-rose-500' },
    earning: { label: 'Earning', color: 'bg-emerald-500' },
};

export function submissionStatus(status: string) {
    return submissionStatuses[status] ?? {
        label: status.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase()),
        color: 'bg-gray-400',
    };
}

export function SubmissionStatusBadge({ status }: { status: string }) {
    const { label, color } = submissionStatus(status);
    return <Chip size="sm" variant="flat" startContent={<Circle size={8} aria-hidden="true" fill="currentColor" strokeWidth={0} className={color} />} classNames={{ base: 'w-fit gap-1.5 px-3 bg-gray-100 text-black', content: 'text-xs font-semibold text-black' }}>{label}</Chip>;
}
