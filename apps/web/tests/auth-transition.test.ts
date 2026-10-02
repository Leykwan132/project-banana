import { expect, mock, test } from 'bun:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

let session: { user: { id: string } } | null = null;
let auth = { isLoading: false, isAuthenticated: false };
let records: { businessId: string | null; creatorId: string | null } | null | undefined;
mock.module('../src/lib/auth-client', () => ({ authClient: { useSession: () => ({ data: session, isPending: false }) } }));
mock.module('convex/react', () => ({ useConvexAuth: () => auth, useQuery: () => records }));
const { useWorkspaces } = await import('../src/hooks/useWorkspaces');
function Probe() {
    const state = useWorkspaces();
    return createElement('output', null, JSON.stringify({ loading: state.loading, membership: state.membership }));
}
test('a newly signed-in session waits for Convex verification instead of throwing', () => {
    session = null;
    records = undefined;
    expect(renderToString(createElement(Probe))).toContain('&quot;membership&quot;:null');
    session = { user: { id: 'user-1' } };
    // Convex still has the settled signed-out state before its authentication effect.
    expect(renderToString(createElement(Probe))).toContain('&quot;loading&quot;:true');
    auth = { isLoading: true, isAuthenticated: false };
    expect(renderToString(createElement(Probe))).toContain('&quot;loading&quot;:true');
    auth = { isLoading: false, isAuthenticated: true };
    records = { businessId: null, creatorId: 'creator-1' };
    expect(renderToString(createElement(Probe))).toContain('&quot;loading&quot;:false');
    expect(renderToString(createElement(Probe))).toContain('creator-1');
    session = null;
    auth = { isLoading: false, isAuthenticated: false };
    expect(renderToString(createElement(Probe))).toContain('&quot;membership&quot;:null');
});
