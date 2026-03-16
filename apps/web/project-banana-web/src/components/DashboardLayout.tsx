import { Loader2 } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';

import { authClient } from '../lib/auth-client';
import { Sidebar } from './Sidebar';
import { ProductTour } from './ProductTour';

export function DashboardLayout() {
    const { data: session, isPending } = authClient.useSession();

    if (isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white">
                <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!session?.user) {
        return <Navigate to="/business" replace />;
    }

    return (
        <div className="flex min-h-screen bg-white">
            <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
                <Sidebar />
            </div>
            <main className="flex-1 md:pl-64">
                <Outlet />
            </main>
            <ProductTour />
        </div>
    );
}
