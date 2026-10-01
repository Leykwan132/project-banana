import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useWorkspaces } from '../hooks/useWorkspaces';
import { loginPath, parseWorkspace, resolveWorkspace } from '../lib/workspace';
import iconDark from "../assets/icon-dark.svg";

export default function AuthRedirect() {
    const { session, loading, membership } = useWorkspaces();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const workspace = parseWorkspace(searchParams.get('workspace'));
    const authError = searchParams.get('error') ?? searchParams.get('error_description');
    useEffect(() => {
        if (loading) return;
        if (authError || !session?.user) {
            navigate(loginPath(workspace, authError ?? undefined), { replace: true });
        } else if (membership) {
            navigate(resolveWorkspace(workspace, membership), { replace: true });
        }
    }, [authError, loading, membership, navigate, session?.user, workspace]);

    return (
        <div className="min-h-screen bg-white">
            <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6">
                <header className="flex h-16 items-center">
                    <Link to="/" className="flex items-center gap-2 font-semibold text-gray-900 transition-opacity hover:opacity-80">
                        <img src={iconDark} alt="Lumina" className="h-8 w-8 object-contain" />
                        <span className="text-xl tracking-tight">Lumina</span>
                    </Link>
                </header>

                <div className="flex flex-1 items-center justify-center">
                    <div className="flex max-w-sm flex-col items-center text-center">
                        <Loader2 className="mb-6 h-8 w-8 animate-spin text-gray-900" />
                        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Logging you in</h1>
                        <p className="mt-2 text-sm text-gray-500">
                            Checking your account and preparing your workspace.
                        </p>
                    </div>
                </div>

                <div className="pb-8 text-center">
                    <p className="text-[11px] font-medium tracking-wide text-gray-400">
                        Terms of Service and Privacy Policy
                    </p>
                </div>
            </div>
        </div>
    );
}
