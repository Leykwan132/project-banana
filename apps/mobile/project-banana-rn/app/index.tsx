import { Redirect } from 'expo-router';

export default function Index() {
    // Redirect to welcome on app load
    return <Redirect href="/welcome" />;
}
