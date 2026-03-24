import { Stack } from 'expo-router';

import { LoginScreenContent } from '@/components/LoginScreenContent';

export default function LoginScreen() {
    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <LoginScreenContent />
        </>
    );
}
