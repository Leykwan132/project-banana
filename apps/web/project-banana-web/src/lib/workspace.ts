export type Workspace = 'business' | 'creator';
export type Membership = { businessId: string | null; creatorId: string | null };

export function parseWorkspace(value: string | null): Workspace {
    return value === 'creator' ? 'creator' : 'business';
}

export function loginPath(workspace: Workspace, error?: string) {
    return `/${workspace}/login${error ? `?error=${encodeURIComponent(error)}` : ''}`;
}

export function callbackPath(workspace: Workspace) {
    return `/auth-redirect?workspace=${workspace}`;
}

export function resolveWorkspace(workspace: Workspace, membership: Membership) {
    if (workspace === 'creator') {
        return membership.creatorId ? '/creator/campaigns' : '/workspace-access?workspace=creator';
    }
    if (membership.businessId) return '/overview';
    return membership.creatorId ? '/workspace-access?workspace=business' : '/onboarding';
}

// undefined means membership is still loading; null means signed out.
export function protectedWorkspacePath(workspace: Workspace, membership: Membership | null | undefined) {
    if (membership === undefined) return null;
    if (membership === null) return loginPath(workspace);
    if (workspace === 'business' ? membership.businessId : membership.creatorId) return null;
    return `/workspace-access?workspace=${workspace}`;
}
