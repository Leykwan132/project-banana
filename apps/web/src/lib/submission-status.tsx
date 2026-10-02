import { Chip } from '@heroui/react';
import { Circle } from 'lucide-react';
export const submissionStatuses: Record<string, { label: string; color: string }> = {
    pending_submission: { label: 'Pending submission', color: 'text-slate-400' },
    reviewing: { label: 'Reviewing', color: 'text-blue-500' },
    pending_review: { label: 'Pending review', color: 'text-cyan-500' },
    changes_requested: { label: 'Changes requested', color: 'text-orange-500' },
    changes_required: { label: 'Changes required', color: 'text-gray-500' },
    ready_to_post: { label: 'Ready to post', color: 'text-violet-500' },
    verifying: { label: 'Verifying', color: 'text-indigo-500' },
    action_required: { label: 'Action required', color: 'text-rose-500' },
    earning: { label: 'Earning', color: 'text-emerald-500' },
};

export function submissionStatus(status: string) {
    return submissionStatuses[status] ?? {
        label: status.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase()),
        color: 'text-gray-400',
    };
}

export function SubmissionStatusBadge({ status }: { status: string }) {
    const { label, color } = submissionStatus(status);
    return <Chip size="sm" className="h-5 min-h-0 w-fit gap-1.5 rounded-full bg-gray-100 px-3 py-0 text-black">
        <Circle size={8} aria-hidden="true" fill="currentColor" strokeWidth={0} className={color} />
        <Chip.Label className="text-xs font-semibold leading-none text-black">{label}</Chip.Label>
    </Chip>;
}
