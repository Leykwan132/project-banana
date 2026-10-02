import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeftRight, FileCheck2, Landmark, LoaderCircle, LogOut, Megaphone, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { authClient } from '../lib/auth-client';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { protectedWorkspacePath, rememberWorkspace, switchWorkspacePath } from '../lib/workspace';
import { Avatar, Dropdown, Label } from '@heroui/react';
import logo from '../assets/icon.svg';

const navigation = [
    { label: 'Campaigns', to: '/creator/campaigns', icon: Megaphone },
    { label: 'Submissions', to: '/creator/submissions', icon: FileCheck2 },
    { label: 'Withdraw', to: '/creator/withdraw', icon: Landmark },
];

export function CreatorShell({ name, image, hasBusiness }: { name?: string; image?: string | null; hasBusiness: boolean }) {
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem('creator-sidebar-collapsed') === 'true'; } catch { return false; }
    });
    const [mobileOpen, setMobileOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [signOutError, setSignOutError] = useState('');
    const dialog = useRef<HTMLDialogElement>(null);
    const location = useLocation();
    useEffect(() => { setMobileOpen(false); }, [location.pathname]);
    useEffect(() => {
        if (mobileOpen) dialog.current?.showModal();
        else dialog.current?.close();
    }, [mobileOpen]);
    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 768px)');
        const closeOnDesktop = () => { if (desktop.matches) setMobileOpen(false); };
        desktop.addEventListener('change', closeOnDesktop);
        return () => desktop.removeEventListener('change', closeOnDesktop);
    }, []);
    useEffect(() => {
        if (!mobileOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [mobileOpen]);

    function toggleCollapsed() {
        const next = !collapsed;
        setCollapsed(next);
        try { localStorage.setItem('creator-sidebar-collapsed', String(next)); } catch { /* Private browsing may disable storage. */ }
    }
    async function signOut() {
        setSigningOut(true);
        setSignOutError('');
        try {
            const result = await authClient.signOut();
            if (result.error) throw new Error(result.error.message ?? 'Unable to sign out.');
            window.location.assign('/creator/login');
        } catch {
            setSignOutError('Unable to sign out. Please try again.');
            setSigningOut(false);
        }
    }
    function sidebar(compact: boolean, mobile = false) {
        return <div className="flex h-full flex-col bg-white">
            <div className={`flex h-20 shrink-0 items-center border-b border-[#F4F6F8] ${compact ? 'justify-center px-1' : 'gap-3 px-4'}`}>
                <div className={`relative flex items-center ${compact ? 'group/collapsed-logo' : 'min-w-0 flex-1'}`}>
                <Link to="/creator/campaigns" aria-label="Lumina creator home" className="flex min-w-0 items-center gap-3">
                    <img src={logo} alt="" className={`h-8 w-8 shrink-0 transition-opacity ${compact ? 'group-hover/collapsed-logo:opacity-0 group-focus-within/collapsed-logo:opacity-0' : ''}`} />
                    {!compact && <div><span className="text-xl font-semibold tracking-tight">Lumina</span><p className="text-xs text-gray-400">Creator</p></div>}
                </Link>
                {!mobile && <button onClick={toggleCollapsed} aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!compact} title={compact ? 'Expand sidebar' : 'Collapse sidebar'} className={`rounded-lg text-gray-500 transition-opacity hover:bg-gray-100 ${compact ? 'absolute inset-0 z-10 grid place-items-center p-1 opacity-0 pointer-events-none group-hover/collapsed-logo:opacity-100 group-hover/collapsed-logo:pointer-events-auto group-focus-within/collapsed-logo:opacity-100 group-focus-within/collapsed-logo:pointer-events-auto [@media(hover:none)]:left-10 [@media(hover:none)]:right-auto [@media(hover:none)]:top-1/2 [@media(hover:none)]:bottom-auto [@media(hover:none)]:h-10 [@media(hover:none)]:w-10 [@media(hover:none)]:-translate-y-1/2 [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto' : 'ml-auto p-2'}`}>{compact ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>}
                </div>
                {mobile && <button onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="ml-auto rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={20} /></button>}
            </div>
            <nav aria-label={mobile ? 'Mobile creator navigation' : 'Creator navigation'} className={`flex-1 space-y-2 py-6 ${compact ? 'px-3' : 'px-4'}`}>
                {!compact && <p className="mb-4 px-3 text-xs font-medium uppercase tracking-wider text-gray-400">General</p>}
                {navigation.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} title={compact ? label : undefined} aria-label={compact ? label : undefined} className={({ isActive }) => `flex items-center rounded-xl py-3 text-sm font-medium transition-colors ${compact ? 'justify-center px-2' : 'gap-3 px-3'} ${isActive || (label === 'Submissions' && location.pathname.startsWith('/submissions/')) || (label === 'Withdraw' && location.pathname === '/creator/bank-accounts') ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}><Icon size={20} className="shrink-0" />{!compact && label}</NavLink>)}
            </nav>
            <div className={`space-y-2 border-t border-[#F4F6F8] py-4 ${compact ? 'px-3' : 'px-4'}`}>
                <Dropdown>
                    <Dropdown.Trigger>
                        <button aria-label={`${name ?? 'Creator'} account menu`} className={`flex w-full items-center rounded-xl py-2 text-left hover:bg-gray-50 ${compact ? 'justify-center' : 'gap-3 px-2'}`}>
                            <Avatar className="h-9 w-9 shrink-0 rounded-full bg-amber-100 text-amber-800">
                                <Avatar.Image src={image ?? undefined} alt={name ?? 'Creator'} />
                                <Avatar.Fallback>{(name ?? 'Creator').trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()}</Avatar.Fallback>
                            </Avatar>
                            {!compact && <span className="min-w-0 flex-1 truncate text-sm font-medium">{name ?? 'Creator'}</span>}
                        </button>
                    </Dropdown.Trigger>
                    <Dropdown.Popover placement={compact ? 'right top' : 'top start'} UNSTABLE_portalContainer={mobile ? (dialog.current ?? undefined) : undefined}>
                        <Dropdown.Menu aria-label="Creator account actions" disabledKeys={signingOut ? ['sign-out'] : []}>
                            {hasBusiness ? <Dropdown.Item id="business" textValue="Switch to Business" href={switchWorkspacePath('business')}><ArrowLeftRight size={18} /><Label>Switch to Business</Label></Dropdown.Item> : null}
                            <Dropdown.Item id="sign-out" textValue={signingOut ? 'Signing out' : 'Sign out'} onAction={signOut} isDisabled={signingOut} className="text-red-600"><LogOut size={18} className="text-red-600" /><Label className="text-red-600">{signingOut ? 'Signing out…' : 'Sign out'}</Label></Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown.Popover>
                </Dropdown>
                {signOutError && <p role="alert" className="text-xs text-red-600">{signOutError}</p>}
            </div>
        </div>;
    }
    return <div className="min-h-screen bg-white text-gray-900">
        <aside className={`fixed inset-y-0 left-0 z-30 hidden border-r border-[#F4F6F8] md:block ${collapsed ? 'w-20' : 'w-64'}`}>{sidebar(collapsed)}</aside>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-100 bg-white px-4 md:hidden">
            <button onClick={() => setMobileOpen(true)} aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="creator-mobile-sidebar" className="rounded-lg p-2 hover:bg-gray-100"><Menu size={22} /></button>
            <img src={logo} alt="" className="h-7 w-7" /><span className="font-semibold">Lumina</span><span className="text-sm text-gray-400">Creator</span>
        </header>
        <dialog ref={dialog} id="creator-mobile-sidebar" aria-label="Creator navigation menu" onCancel={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setMobileOpen(false); }} className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[85vw] border-0 p-0 backdrop:bg-black/40">{sidebar(false, true)}</dialog>
        <main className={`min-w-0 ${collapsed ? 'md:pl-20' : 'md:pl-64'}`}><div className="mx-auto max-w-7xl px-4 py-8 sm:px-8"><Outlet /></div></main>
    </div>;
}

export function CreatorLayout() {
    const { session, loading, membership } = useWorkspaces();
    useEffect(() => {
        if (!loading && membership?.creatorId) rememberWorkspace(session?.user.id, 'creator');
    }, [loading, membership?.creatorId, session?.user.id]);
    if (loading) return <main className="grid min-h-screen place-items-center bg-white" role="status" aria-busy="true">
        <div className="flex flex-col items-center gap-3 text-gray-500">
            <LoaderCircle className="h-9 w-9 animate-spin text-[#FF9500]" aria-hidden="true" />
            <p className="text-sm font-medium">Loading your creator workspace…</p>
        </div>
    </main>;
    const redirect = protectedWorkspacePath('creator', membership);
    if (redirect) return <Navigate to={redirect} replace />;
    return <CreatorShell name={session?.user.name} image={session?.user.image} hasBusiness={Boolean(membership?.businessId)} />;
}
