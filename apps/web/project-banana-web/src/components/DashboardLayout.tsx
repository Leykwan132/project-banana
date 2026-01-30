import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function DashboardLayout() {
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
