import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useWorkspaces } from '../hooks/useWorkspaces';
import { getLastWorkspace, loginPath, parseWorkspace, resolveWorkspace } from '../lib/workspace';
import iconDark from "../assets/icon-dark.svg";
import iconCreator from "../assets/icon.svg";
import { RedirectingStatus } from "../components/RedirectingStatus";

export default function AuthRedirect() {
    const { session, loading, membership } = useWorkspaces();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const workspace = parseWorkspace(searchParams.get('workspace'));
    const isSwitchingWorkspace = searchParams.get('switch') === 'true';
    const authError = searchParams.get('error') ?? searchParams.get('error_description');
    useEffect(() => {
        if (loading) return;
        if (authError || !session?.user) {
            navigate(loginPath(workspace, authError ?? undefined), { replace: true });
        } else if (membership) {
            const lastUsedWorkspace = isSwitchingWorkspace ? workspace : getLastWorkspace(session.user.id);
            navigate(resolveWorkspace(workspace, membership, lastUsedWorkspace), { replace: true });
        }
    }, [authError, isSwitchingWorkspace, loading, membership, navigate, session?.user, workspace]);

    return (
        <div className="min-h-screen bg-white">
            <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6">
                <header className="flex h-16 items-center">
                    <Link to="/" className="flex items-center gap-3 font-semibold text-gray-900 transition-opacity hover:opacity-80">
                        <img src={workspace === 'creator' ? iconCreator : iconDark} alt="" className="h-8 w-8 shrink-0 object-contain" />
                        <div>
                            <span className="text-xl tracking-tight">Lumina</span>
                            <p className="text-xs font-normal text-gray-400">{workspace === 'creator' ? 'Creator' : 'Business'}</p>
                        </div>
                    </Link>
                </header>

                <div className="flex flex-1 items-center justify-center">
                    <RedirectingStatus />
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
