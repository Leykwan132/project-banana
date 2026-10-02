import { Navigate } from 'react-router-dom';
import { useWorkspaces } from '../hooks/useWorkspaces';
import Onboarding from '../pages/Onboarding';

// Reaching onboarding is an explicit registration action, including for creators.
export function BusinessOnboarding() {
    const { loading, membership } = useWorkspaces();
    if (loading) return <p className="p-10" role="status">Checking your account…</p>;
    if (!membership) return <Navigate to="/business/login" replace />;
    return <Onboarding />;
}
