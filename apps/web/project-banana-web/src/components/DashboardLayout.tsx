import { Outlet, Navigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { Sidebar } from './Sidebar';

export function DashboardLayout() {
    const businessOnboardingStatus = useQuery(api.businesses.getOnboardingStatus);

    // Wait for onboarding status to load
    if (businessOnboardingStatus === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    // Redirect to onboarding if not onboarded
    if (!businessOnboardingStatus.isOnboarded) {
        return <Navigate to="/onboarding" />;
    }

    return (
        <div className="flex min-h-screen bg-white">
            <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
                <Sidebar />
            </div>
            <main className="flex-1 md:pl-64">
                <Outlet />
            </main>
        </div>
    );
}
