import * as SecureStore from 'expo-secure-store';

function canUseLocalStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export const storage = {
    async getItem(key: string) {
        try {
            return await SecureStore.getItemAsync(key);
        } catch {
            if (canUseLocalStorage()) {
                return window.localStorage.getItem(key);
            }

            return null;
        }
    },
    async removeItem(key: string) {
        try {
            await SecureStore.deleteItemAsync(key);
            return;
        } catch {
            if (canUseLocalStorage()) {
                window.localStorage.removeItem(key);
            }
        }
    },
    async setItem(key: string, value: string) {
        try {
            await SecureStore.setItemAsync(key, value);
            return;
        } catch {
            if (canUseLocalStorage()) {
                window.localStorage.setItem(key, value);
            }
        }
    },
};
