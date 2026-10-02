import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';

import { useWorkspaces } from '../hooks/useWorkspaces';
import { protectedWorkspacePath, rememberWorkspace } from '../lib/workspace';
import { Sidebar } from './Sidebar';
import { ProductTour } from './ProductTour';

export function DashboardLayout() {
    const { loading, membership, session } = useWorkspaces();
    useEffect(() => {
        if (!loading && membership?.businessId) rememberWorkspace(session?.user.id, 'business');
    }, [loading, membership?.businessId, session?.user.id]);
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem('business-sidebar-collapsed') === 'true'; } catch { return false; }
    });

    const toggleCollapsed = () => {
        const next = !collapsed;
        setCollapsed(next);
        try { localStorage.setItem('business-sidebar-collapsed', String(next)); } catch { /* Private browsing may disable storage. */ }
    };

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
            <div className={`hidden md:fixed md:inset-y-0 md:flex md:flex-col ${collapsed ? 'md:w-20' : 'md:w-64'}`}>
                <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
            </div>
            <main className={`flex-1 ${collapsed ? 'md:pl-20' : 'md:pl-64'}`}>
                <Outlet />
            </main>
            <ProductTour />
        </div>
    );
}
