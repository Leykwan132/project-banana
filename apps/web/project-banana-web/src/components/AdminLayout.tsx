import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Shield, CreditCard, FileVideo, Banknote } from 'lucide-react';
import { authClient } from '../lib/auth-client';
import { useQuery } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';

const LOCKOUT_KEY = 'admin_lockout_until';
const ATTEMPTS_KEY = 'admin_failed_attempts';
const SESSION_KEY = 'admin_unlocked';
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function AdminGate({ onUnlock }: { onUnlock: () => void }) {
    const { data: session, isPending } = authClient.useSession();
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        const lockoutUntil = localStorage.getItem(LOCKOUT_KEY);
        if (lockoutUntil && Date.now() < Number(lockoutUntil)) {
            setIsLocked(true);
        } else if (lockoutUntil) {
            localStorage.removeItem(LOCKOUT_KEY);
            localStorage.removeItem(ATTEMPTS_KEY);
        }
    }, []);

    const signIn = async () => {
        await authClient.signIn.social({
            provider: "google",
            callbackURL: "/admin",
        });
    };

    const isSignedIn = !!session?.user;
    const userEmail = session?.user?.email ?? '';
    const isEmailAllowed = useQuery(api.admin.checkIsAdmin);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isPending && isSignedIn && isEmailAllowed === false) {
            navigate('/', { replace: true });
        }
    }, [isPending, isSignedIn, isEmailAllowed, navigate]);

    const handleSubmit = () => {
        if (isLocked) return;

        if (!isEmailAllowed) {
            setError('This account is not authorized for admin access.');
            return;
        }

        const correctCode = import.meta.env.VITE_ADMIN_CODE;

        if (code === correctCode) {
            sessionStorage.setItem(SESSION_KEY, 'true');
            localStorage.removeItem(ATTEMPTS_KEY);
            onUnlock();
        } else {
            const attempts = Number(localStorage.getItem(ATTEMPTS_KEY) || '0') + 1;
            localStorage.setItem(ATTEMPTS_KEY, String(attempts));

            if (attempts >= MAX_ATTEMPTS) {
                const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
                localStorage.setItem(LOCKOUT_KEY, String(lockoutUntil));
                setIsLocked(true);
                setError('');
            } else {
                setError(`Invalid code. ${MAX_ATTEMPTS - attempts} attempt(s) remaining.`);
            }
            setCode('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSubmit();
    };

    return (
        <div className="fixed inset-0 z-9999 bg-black/95 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-sm text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-8">
                    <Shield className="w-7 h-7 text-white/80" />
                </div>

                {isLocked ? (
                    <>
                        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Access Locked</h1>
                        <p className="text-white/50 text-sm">Too many failed attempts. Try again later.</p>
                    </>
                ) : isPending ? (
                    <>
                        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Admin Access</h1>
                        <p className="text-white/50 text-sm">Loading...</p>
                    </>
                ) : isSignedIn ? (
                    <>
                        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Admin Access</h1>
                        <p className="text-white/50 text-sm mb-8">
                            Entering admin page as <span className="text-white/70 font-medium">{userEmail}</span>
                        </p>

                        <div className="mb-4" onKeyDown={handleKeyDown}>
                            <input
                                type="password"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Enter code"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 text-center focus:outline-none focus:border-white/30 transition-colors"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm mb-4 font-medium">{error}</p>
                        )}

                        <button
                            onClick={handleSubmit}
                            className="w-full bg-white text-black font-semibold rounded-lg py-3 text-sm hover:bg-white/90 transition-colors"
                        >
                            Enter
                        </button>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Admin Access</h1>
                        <p className="text-white/50 text-sm mb-8">Sign in to continue.</p>

                        <button
                            onClick={signIn}
                            className="w-full flex items-center justify-center gap-2.5 bg-white rounded-lg px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-white/90 transition-colors"
                        >
                            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

const navItems = [
    { label: 'Bank Approvals', path: '/admin/bank-approvals', icon: CreditCard },
    { label: 'Submissions', path: '/admin/submissions', icon: FileVideo },
    { label: 'Payouts', path: '/admin/payouts', icon: Banknote },
];

export function AdminLayout() {
    const [isUnlocked, setIsUnlocked] = useState(
        () => sessionStorage.getItem(SESSION_KEY) === 'true'
    );
    const location = useLocation();

    if (location.pathname === '/admin') {
        return <Navigate to="/admin/bank-approvals" replace />;
    }

    if (!isUnlocked) {
        return <AdminGate onUnlock={() => setIsUnlocked(true)} />;
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-60 border-r border-gray-200 bg-white flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-gray-900" />
                        <span className="font-bold text-gray-900 tracking-tight">Youniq Admin</span>
                    </div>
                </div>
                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={() => {
                            sessionStorage.removeItem(SESSION_KEY);
                            setIsUnlocked(false);
                        }}
                        className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Lock session
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 p-8">
                <Outlet />
            </main>
        </div>
    );
}
