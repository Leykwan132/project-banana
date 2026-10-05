export type Workspace = 'business' | 'creator';
export type Membership = { businessId: string | null; creatorId: string | null };
type WorkspaceStorage = Pick<Storage, 'getItem' | 'setItem'>;

const workspaceStorageKey = (userId: string) => `lumina:last-workspace:${encodeURIComponent(userId)}`;

function getBrowserStorage(): WorkspaceStorage | null {
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
        return null;
    }
}

export function parseWorkspace(value: string | null): Workspace {
    return value === 'creator' ? 'creator' : 'business';
}

export function loginPath(workspace: Workspace, error?: string) {
    return `/${workspace}/login${error ? `?error=${encodeURIComponent(error)}` : ''}`;
}

export function callbackPath(workspace: Workspace) {
    return `/auth-redirect?workspace=${workspace}`;
}

export function switchWorkspacePath(workspace: Workspace) {
    return `${callbackPath(workspace)}&switch=true`;
}

export function getLastWorkspace(userId: string | undefined, storage: WorkspaceStorage | null = getBrowserStorage()): Workspace | undefined {
    if (!userId || !storage) return undefined;
    try {
        const workspace = storage.getItem(workspaceStorageKey(userId));
        return workspace === 'business' || workspace === 'creator' ? workspace : undefined;
    } catch {
        return undefined;
    }
}

export function rememberWorkspace(userId: string | undefined, workspace: Workspace, storage: WorkspaceStorage | null = getBrowserStorage()) {
    if (!userId || !storage) return;
    try {
        storage.setItem(workspaceStorageKey(userId), workspace);
    } catch {
        // Keep workspace navigation working when browser storage is unavailable.
    }
}

// The entry page determines the destination; old callers may still pass a saved preference.
export function resolveWorkspace(workspace: Workspace, membership: Membership, _lastUsedWorkspace?: Workspace) {
    if (membership.businessId && membership.creatorId) {
        return workspace === 'creator' ? '/creator/campaigns' : '/overview';
    }
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
