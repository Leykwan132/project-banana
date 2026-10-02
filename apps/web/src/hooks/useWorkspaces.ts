import { useEffect, useState } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../../../packages/backend/convex/_generated/api';
import { authClient } from '../lib/auth-client';

export function useWorkspaces() {
    const { data: session, isPending } = authClient.useSession();
    const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
    const records = useQuery(api.users.getMyWorkspaces, session?.user && isAuthenticated ? {} : 'skip');
    const userId = session?.user.id;
    const waiting = !!userId && (isAuthLoading || !isAuthenticated || !records);
    const [timedOutUserId, setTimedOutUserId] = useState<string | null>(null);

    // Better Auth may establish the session before Convex starts verifying its token.
    // Give that transition time to settle, with a recoverable error if it stalls.
    useEffect(() => {
        if (!userId || !waiting || isPending) return;
        const timeout = window.setTimeout(() => setTimedOutUserId(userId), 15_000);
        return () => window.clearTimeout(timeout);
    }, [userId, waiting, isPending]);

    if (waiting && timedOutUserId === userId) {
        throw new Error('Your account could not be verified. Please retry or sign in again.');
    }
    const loading = isPending || waiting;
    return { session, loading, membership: loading ? undefined : session?.user ? records : null };
}
