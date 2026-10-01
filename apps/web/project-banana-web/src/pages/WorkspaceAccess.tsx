import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { authClient } from '../lib/auth-client';
import { callbackPath, loginPath, parseWorkspace } from '../lib/workspace';

export default function WorkspaceAccess() {
    const [params] = useSearchParams();
    const workspace = parseWorkspace(params.get('workspace'));
    const { loading, membership } = useWorkspaces();
    if (loading) return <p className="p-10" role="status">Checking your account…</p>;
    if (!membership) return <Navigate to={loginPath(workspace)} replace />;
    if (workspace === 'business' ? membership.businessId : membership.creatorId) return <Navigate to={callbackPath(workspace)} replace />;
    return (
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-6 text-center">
            <Link to="/" className="text-xl font-semibold">Lumina</Link>
            <h1 className="text-3xl font-semibold">{workspace === 'creator' ? 'Creator access is by invitation' : 'You’re signed in as a creator'}</h1>
            <p className="text-gray-600">{workspace === 'creator' ? 'This account doesn’t have an active creator profile. Use the account connected to your creator profile, or contact the Lumina team about an invitation.' : 'Open your creator workspace, or choose to register a business with this account.'}</p>
            {membership.creatorId && <Link className="rounded-full bg-black px-6 py-3 text-white" to="/creator/campaigns">Open creator workspace</Link>}
            {membership.businessId && <Link className="rounded-full bg-black px-6 py-3 text-white" to="/overview">Open business workspace</Link>}
            {workspace === 'business' && <Link to="/onboarding" className="underline">Register a business</Link>}
            <Link to="/support" className="underline">Contact support</Link>
            <button className="text-sm underline" onClick={async () => { await authClient.signOut(); window.location.assign(loginPath(workspace)); }}>Sign out and use another account</button>
        </div>
    );
}
