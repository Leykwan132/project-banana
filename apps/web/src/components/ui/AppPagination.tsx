import { Fragment } from 'react';
import { Pagination } from '@heroui/react';

type AppPaginationProps = {
    total: number;
    page: number;
    onChange: (page: number) => void;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
};

function visiblePages(page: number, total: number) {
    const pages = new Set<number>([1, total]);
    for (let candidate = page - 1; candidate <= page + 1; candidate += 1) {
        if (candidate > 1 && candidate < total) pages.add(candidate);
    }
    return [...pages].sort((a, b) => a - b);
}

export function AppPagination({ total, page, onChange, size = 'md', className }: AppPaginationProps) {
    if (total <= 1) return null;

    const pages = visiblePages(page, total);
    return <Pagination size={size} aria-label="Pagination" className={className}>
        <Pagination.Content>
            <Pagination.Item>
                <Pagination.Previous aria-label="Previous page" isDisabled={page <= 1} onPress={() => onChange(Math.max(1, page - 1))}>
                    <Pagination.PreviousIcon />
                </Pagination.Previous>
            </Pagination.Item>
            {pages.map((item, index) => {
                const previous = pages[index - 1];
                return <Fragment key={item}>
                    {previous !== undefined && item - previous > 1 && <Pagination.Item><Pagination.Ellipsis /></Pagination.Item>}
                    <Pagination.Item>
                        <Pagination.Link aria-label={`Page ${item}`} isActive={page === item} onPress={() => onChange(item)}>{item}</Pagination.Link>
                    </Pagination.Item>
                </Fragment>;
            })}
            <Pagination.Item>
                <Pagination.Next aria-label="Next page" isDisabled={page >= total} onPress={() => onChange(Math.min(total, page + 1))}>
                    <Pagination.NextIcon />
                </Pagination.Next>
            </Pagination.Item>
        </Pagination.Content>
    </Pagination>;
}
