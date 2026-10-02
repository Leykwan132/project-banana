import type { ReactNode } from 'react';

export function CreatorPageHeader({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
    return <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
        <div>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-gray-600">{description}</p>
        </div>
        {children}
    </div>;
}
