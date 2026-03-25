import {
    Clapperboard,
    Flame,
    Mic,
    Package,
    Scissors,
    Sparkles,
    Tag,
    type LucideIcon,
} from 'lucide-react';

type CategoryVisual = {
    icon: LucideIcon;
    iconBgClass: string;
    iconColorClass: string;
};

const DEFAULT_CATEGORY_VISUAL: CategoryVisual = {
    icon: Tag,
    iconBgClass: 'bg-gray-100',
    iconColorClass: 'text-gray-500',
};

const CATEGORY_VISUALS_BY_ID: Record<string, CategoryVisual> = {
    challenge: {
        icon: Flame,
        iconBgClass: 'bg-gray-100',
        iconColorClass: 'text-gray-500',
    },
    'product-review': {
        icon: Package,
        iconBgClass: 'bg-gray-100',
        iconColorClass: 'text-gray-500',
    },
    vlog: {
        icon: Clapperboard,
        iconBgClass: 'bg-gray-100',
        iconColorClass: 'text-gray-500',
    },
    reaction: {
        icon: Sparkles,
        iconBgClass: 'bg-gray-100',
        iconColorClass: 'text-gray-500',
    },
    voiceover: {
        icon: Mic,
        iconBgClass: 'bg-gray-100',
        iconColorClass: 'text-gray-500',
    },
    clipping: {
        icon: Scissors,
        iconBgClass: 'bg-gray-100',
        iconColorClass: 'text-gray-500',
    },
};

const normalizeCategoryKey = (value?: string | null) =>
    value
        ?.trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

export const getCampaignCategoryVisual = (category?: { id?: string | null; label?: string | null } | string | null) => {
    if (!category) {
        return DEFAULT_CATEGORY_VISUAL;
    }

    if (typeof category === 'string') {
        return CATEGORY_VISUALS_BY_ID[normalizeCategoryKey(category) ?? ''] ?? DEFAULT_CATEGORY_VISUAL;
    }

    return CATEGORY_VISUALS_BY_ID[category.id ?? '']
        ?? CATEGORY_VISUALS_BY_ID[normalizeCategoryKey(category.label) ?? '']
        ?? DEFAULT_CATEGORY_VISUAL;
};
