import { Tag } from 'lucide-react';

export function CampaignCategoryTag({ label }: { label: string }) {
    return <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-black">
        <Tag size={12} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{label}</span>
    </span>;
}
