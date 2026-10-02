export type SubmissionSortKey = 'status' | 'submitted' | 'views' | 'earnings';
export type SortDirection = 'asc' | 'desc';

type SortableSubmission = {
    status: string;
    created_at: number;
    views?: number;
    earnings?: number;
};

export function getNextSortDirection(
    currentKey: SubmissionSortKey | null,
    currentDirection: SortDirection,
    clickedKey: SubmissionSortKey,
): SortDirection {
    if (currentKey !== clickedKey) return 'desc';
    return currentDirection === 'desc' ? 'asc' : 'desc';
}

export function sortSubmissions<T extends SortableSubmission>(
    submissions: readonly T[],
    key: SubmissionSortKey,
    direction: SortDirection,
    getStatusLabel: (status: string) => string = status => status,
): T[] {
    return [...submissions].sort((a, b) => {
        let comparison: number;
        switch (key) {
            case 'status':
                comparison = getStatusLabel(a.status).localeCompare(getStatusLabel(b.status));
                break;
            case 'submitted':
                comparison = a.created_at - b.created_at;
                break;
            case 'views':
                comparison = (a.views ?? 0) - (b.views ?? 0);
                break;
            case 'earnings':
                comparison = (a.earnings ?? 0) - (b.earnings ?? 0);
                break;
        }
        return direction === 'desc' ? -comparison : comparison;
    });
}
