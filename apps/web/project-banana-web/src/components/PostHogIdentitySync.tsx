import { useEffect, useRef } from 'react';
import { usePostHog } from '@posthog/react';
import { useQuery } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { authClient } from '../lib/auth-client';
import {
    buildUserAnalyticsTraits,
    clearUserScopedAnalyticsContext,
    registerBaseAnalyticsContext,
} from '../lib/analytics';

export function PostHogIdentitySync() {
    const posthog = usePostHog();
    const { data: session, isPending } = authClient.useSession();
    const business = useQuery(api.businesses.getMyBusiness);
    const isAdmin = useQuery(api.admin.checkIsAdmin) ?? false;
    const identifiedUserIdRef = useRef<string | null>(null);
    const userId = session?.user?.id ?? null;
    const userEmail = session?.user?.email ?? null;
    const userName = session?.user?.name ?? null;

    const traits = userId
        ? buildUserAnalyticsTraits({
            user: {
                id: userId,
                email: userEmail,
                name: userName,
            },
            business,
            isAdmin,
        })
        : null;

    useEffect(() => {
        registerBaseAnalyticsContext(posthog);

        if (isPending) {
            return;
        }

        if (!userId || !traits) {
            clearUserScopedAnalyticsContext(posthog);

            if (identifiedUserIdRef.current !== null) {
                posthog.reset(true);
                registerBaseAnalyticsContext(posthog);
                identifiedUserIdRef.current = null;
            }

            posthog.register({ authenticated: false });
            return;
        }

        if (identifiedUserIdRef.current !== userId) {
            posthog.identify(userId, traits, {
                first_identified_on_web_at: new Date().toISOString(),
            });
            identifiedUserIdRef.current = userId;
        } else {
            posthog.setPersonProperties(traits);
        }

        clearUserScopedAnalyticsContext(posthog);
        posthog.register({
            authenticated: true,
            user_role: traits.user_role,
            is_admin: traits.is_admin,
            business_id: traits.business_id ?? undefined,
            business_name: traits.business_name ?? undefined,
            business_industry: traits.business_industry ?? undefined,
            business_size: traits.business_size ?? undefined,
            subscription_plan_type: traits.subscription_plan_type ?? undefined,
            subscription_status: traits.subscription_status ?? undefined,
        });
    }, [isPending, posthog, traits, userId]);

    return null;
}
