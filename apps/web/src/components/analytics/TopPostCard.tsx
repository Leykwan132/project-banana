import { Skeleton } from '@heroui/react';

type AnalyticsTopPostCardProps = {
    title: string;
    creatorUsername?: string | null;
    views: number;
    postUrl?: string | null;
};

const normalizeExternalUrl = (url: string) => {
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
};

const formatCreatorUsername = (username?: string | null) => {
    if (!username) return null;
    return username.startsWith('@') ? username : `@${username}`;
};

export const AnalyticsTopPostCardSkeleton = () => (
    <div className="min-h-[180px] rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex h-full flex-col justify-between gap-6">
            <div className="space-y-2 pb-4">
                <Skeleton className="h-4 w-36 rounded-lg" />
                <Skeleton className="h-3 w-20 rounded-lg" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-3 w-16 rounded-lg" />
                <Skeleton className="h-6 w-24 rounded-lg" />
            </div>
        </div>
    </div>
);

export const AnalyticsTopPostCard = ({
    title,
    creatorUsername,
    views,
    postUrl,
}: AnalyticsTopPostCardProps) => {
    const href = postUrl ? normalizeExternalUrl(postUrl) : '';
    const formattedUsername = formatCreatorUsername(creatorUsername);

    return (
        <a
            href={href || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[180px] h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300 hover:bg-gray-50"
        >
            <div className="min-w-0 pb-4">
                <p className="line-clamp-2 text-sm font-semibold text-gray-900">
                    {title}
                </p>
                {formattedUsername ? (
                    <p className="mt-1 text-xs text-gray-500">
                        {formattedUsername}
                    </p>
                ) : null}
            </div>
            <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400">
                    Views
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {views.toLocaleString()}
                </p>
            </div>
        </a>
    );
};
