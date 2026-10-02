import { Loader2 } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';

import { useWorkspaces } from '../hooks/useWorkspaces';
import { protectedWorkspacePath } from '../lib/workspace';
import { Sidebar } from './Sidebar';
import { ProductTour } from './ProductTour';

export function DashboardLayout() {
    const { loading, membership } = useWorkspaces();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white">
                <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
            </div>
        );
    }

    const redirect = protectedWorkspacePath('business', membership);
    if (redirect) return <Navigate to={redirect} replace />;

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
