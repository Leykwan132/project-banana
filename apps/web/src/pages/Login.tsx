import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { authClient } from "../lib/auth-client";
import iconDark from "../assets/icon-dark.svg";
import iconCreator from "../assets/icon.svg";
import { RedirectingStatus } from "../components/RedirectingStatus";

import { useWorkspaces } from '../hooks/useWorkspaces';
import { callbackPath, loginPath, resolveWorkspace } from '../lib/workspace';
import type { Workspace } from '../lib/workspace';

export default function Login({ workspace = 'business' }: { workspace?: Workspace }) {
    const { session, loading, membership } = useWorkspaces();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [signInError, setSignInError] = useState(false);
    const loginError = searchParams.get('error') || signInError;
    useEffect(() => {
        if (!loading && session?.user && membership) {
            navigate(resolveWorkspace(workspace, membership), { replace: true });
        }
    }, [loading, session?.user, membership, workspace, navigate]);

    const signIn = async () => {
        setSignInError(false);
        setIsSigningIn(true);
        try {
            const result = await authClient.signIn.social({
                provider: "google",
                callbackURL: callbackPath(workspace),
                errorCallbackURL: loginPath(workspace),
            });
            if (result.error) { setSignInError(true); setIsSigningIn(false); }
        } catch {
            setSignInError(true);
            setIsSigningIn(false);
        }
    };

    const isBusy = isSigningIn || loading || !!session?.user;

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 relative">
            <div className="absolute top-6 left-6 md:top-10 md:left-10 flex items-center gap-2 font-semibold">
                <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
                    <img src={workspace === 'creator' ? iconCreator : iconDark} alt="" className="h-8 w-8 shrink-0 object-contain" />
                    <div>
                        <span className="text-xl font-semibold tracking-tight text-gray-900">Lumina</span>
                        <p className="text-xs font-normal text-gray-400">{workspace === 'creator' ? 'Creator' : 'Business'}</p>
                    </div>
                </Link>
            </div>

            <div className="w-full max-w-[320px] text-center">
                {isSigningIn || session?.user ? <RedirectingStatus /> : <>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">{workspace === 'business' ? 'Business login' : 'Creator login'}</h1>
                <p className="text-[15px] text-gray-500 mb-8 mt-1">{workspace === 'business' ? 'Sign in or create your business account.' : 'Sign in to your creator workspace.'}</p>
                {loginError ? (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                        Login failed. Please try again.
                    </div>
                ) : null}

                <div className="flex flex-col gap-2.5">
                    <button
                        onClick={signIn}
                        disabled={isBusy}
                        aria-busy={isBusy}
                        className="w-full flex items-center justify-center gap-2.5 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isBusy ? (
                            <>
                                <Loader2 className="h-[18px] w-[18px] animate-spin" />
                                Logging in
                            </>
                        ) : (
                            <>
                                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </button>
                </div>
                <Link to={loginPath(workspace === 'business' ? 'creator' : 'business')} className="mt-6 inline-block text-sm text-gray-600 underline">
                    {workspace === 'business' ? 'Looking for creator login?' : 'Looking for business login?'}
                </Link>
                </>}
            </div>

            <div className="absolute bottom-6 md:bottom-8 text-center w-full">
                <p className="text-[11px] text-gray-400 font-medium tracking-wide">
                    Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    );
}
