import { Link, Navigate, Outlet } from 'react-router-dom';
import { authClient } from '../lib/auth-client';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { callbackPath, protectedWorkspacePath } from '../lib/workspace';

export function CreatorLayout() {
    const { session, loading, membership } = useWorkspaces();
    if (loading) return <p className="p-10" role="status">Loading your creator workspace…</p>;
    const redirect = protectedWorkspacePath('creator', membership);
    if (redirect) return <Navigate to={redirect} replace />;
    return (
        <div className="min-h-screen bg-[#fafafa] text-gray-900">
            <header className="border-b border-gray-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
                    <Link to="/creator/campaigns" className="text-xl font-semibold">Lumina <span className="ml-2 text-sm font-normal text-gray-500">Creator</span></Link>
                    <nav aria-label="Creator navigation" className="flex flex-wrap items-center gap-5 text-sm">
                        <Link to="/creator/campaigns" className="font-semibold">Campaigns</Link>
                        {membership?.businessId && <Link to={callbackPath('business')} className="underline">Switch workspace</Link>}
                        <span className="text-gray-600">{session?.user.name}</span>
                        <button className="underline" onClick={async () => { await authClient.signOut(); window.location.assign('/creator/login'); }}>Sign out</button>
                    </nav>
                </div>
            </header>
            <main className="mx-auto max-w-7xl px-6 py-10"><Outlet /></main>
        </div>
    );
}
