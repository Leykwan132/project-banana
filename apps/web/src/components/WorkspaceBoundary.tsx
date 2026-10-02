import { Component } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authClient } from '../lib/auth-client';

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() {
        if (this.state.failed) return (
            <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
                <h1 className="text-2xl font-semibold">We couldn’t load your workspace</h1>
                <p className="text-gray-600">Please retry. If this continues, sign in again or contact support.</p>
                <button className="rounded-full bg-black px-6 py-3 text-white" onClick={() => window.location.reload()}>Retry</button>
                <button className="text-sm underline" onClick={async () => { await authClient.signOut(); window.location.reload(); }}>Sign out and retry</button>
                <Link to="/support" className="underline">Contact support</Link>
            </div>
        );
        return this.props.children;
    }
}

export function WorkspaceBoundary({ children }: { children: ReactNode }) {
    const location = useLocation();
    return <Boundary key={location.pathname + location.search}>{children}</Boundary>;
}
