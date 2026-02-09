import { Redirect } from 'expo-router';

export default function Index() {
    // Redirect to onboarding on app load
    return <Redirect href="/onboarding" />;
}
