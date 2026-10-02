export const PRODUCT_TOUR_COMPLETED_KEY = 'lumina_product_tour_completed_v1';
export const PRODUCT_TOUR_BANNER_DISMISSED_KEY = 'lumina_product_tour_banner_dismissed_v1';
export const PRODUCT_TOUR_ACTIVE_KEY = 'lumina_product_tour_active_v1';
export const PRODUCT_TOUR_START_EVENT = 'lumina:start-product-tour';
export const PRODUCT_TOUR_STATE_EVENT = 'lumina:product-tour-state';

const readStorageBoolean = (key: string) => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(key) === 'true';
};

const writeStorageBoolean = (key: string, value: boolean) => {
    if (typeof window === 'undefined') return;
    if (value) {
        window.localStorage.setItem(key, 'true');
        return;
    }
    window.localStorage.removeItem(key);
};

export const hasCompletedProductTour = () => readStorageBoolean(PRODUCT_TOUR_COMPLETED_KEY);

export const isProductTourBannerDismissed = () => readStorageBoolean(PRODUCT_TOUR_BANNER_DISMISSED_KEY);

export const setProductTourCompleted = (value: boolean) => {
    writeStorageBoolean(PRODUCT_TOUR_COMPLETED_KEY, value);
};

export const setProductTourBannerDismissed = (value: boolean) => {
    writeStorageBoolean(PRODUCT_TOUR_BANNER_DISMISSED_KEY, value);
};

export const isProductTourActive = () => readStorageBoolean(PRODUCT_TOUR_ACTIVE_KEY);

export const setProductTourActive = (value: boolean) => {
    writeStorageBoolean(PRODUCT_TOUR_ACTIVE_KEY, value);
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(PRODUCT_TOUR_STATE_EVENT));
};

export const triggerProductTourStart = () => {
    if (typeof window === 'undefined') return;
    setProductTourActive(true);
    window.dispatchEvent(new Event(PRODUCT_TOUR_START_EVENT));
};
