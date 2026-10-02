export const PRODUCT_TOUR_COMPLETED_KEY = 'lumina_product_tour_completed_v1';
export const PRODUCT_TOUR_BANNER_DISMISSED_KEY = 'lumina_product_tour_banner_dismissed_v1';
export const PRODUCT_TOUR_ACTIVE_KEY = 'lumina_product_tour_active_v1';
export const PRODUCT_TOUR_START_EVENT = 'lumina:start-product-tour';
export const PRODUCT_TOUR_STATE_EVENT = 'lumina:product-tour-state';

const readStorageBoolean = (key: string) => {
    if (typeof window === 'undefined') return false;
    try {
        return window.localStorage.getItem(key) === 'true';
    } catch {
        return false;
    }
};

const writeStorageBoolean = (key: string, value: boolean) => {
    if (typeof window === 'undefined') return;
    try {
        if (value) {
            window.localStorage.setItem(key, 'true');
            return;
        }
        window.localStorage.removeItem(key);
    } catch {
        // Tour preferences are optional and must not block app navigation.
    }
};

const readSessionStorageBoolean = (key: string) => {
    if (typeof window === 'undefined') return false;
    try {
        return window.sessionStorage.getItem(key) === 'true';
    } catch {
        return false;
    }
};

const writeSessionStorageBoolean = (key: string, value: boolean) => {
    if (typeof window === 'undefined') return;
    try {
        if (value) {
            window.sessionStorage.setItem(key, 'true');
            return;
        }
        window.sessionStorage.removeItem(key);
    } catch {
        // Tour preferences are optional and must not block app navigation.
    }
};

export const hasCompletedProductTour = () => readStorageBoolean(PRODUCT_TOUR_COMPLETED_KEY);

export const isProductTourBannerDismissed = () => readStorageBoolean(PRODUCT_TOUR_BANNER_DISMISSED_KEY);

export const setProductTourCompleted = (value: boolean) => {
    writeStorageBoolean(PRODUCT_TOUR_COMPLETED_KEY, value);
};

export const setProductTourBannerDismissed = (value: boolean) => {
    writeStorageBoolean(PRODUCT_TOUR_BANNER_DISMISSED_KEY, value);
};

export const isProductTourActive = () => readSessionStorageBoolean(PRODUCT_TOUR_ACTIVE_KEY);

export const clearStaleProductTourActive = (storage?: Pick<Storage, 'removeItem'>) => {
    try {
        const sessionStorage = storage ?? (typeof window !== 'undefined' ? window.sessionStorage : undefined);
        sessionStorage?.removeItem(PRODUCT_TOUR_ACTIVE_KEY);
    } catch {
        // Storage can be unavailable in restricted browser contexts.
    }

    if (storage || typeof window === 'undefined') return;
    try {
        // Remove the old persistent flag once during migration to session-scoped state.
        window.localStorage.removeItem(PRODUCT_TOUR_ACTIVE_KEY);
    } catch {
        // Storage can be unavailable in restricted browser contexts.
    }
};

export const setProductTourActive = (value: boolean) => {
    writeSessionStorageBoolean(PRODUCT_TOUR_ACTIVE_KEY, value);
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(PRODUCT_TOUR_STATE_EVENT));
};

export const triggerProductTourStart = () => {
    if (typeof window === 'undefined') return;
    setProductTourActive(true);
    window.dispatchEvent(new Event(PRODUCT_TOUR_START_EVENT));
};
