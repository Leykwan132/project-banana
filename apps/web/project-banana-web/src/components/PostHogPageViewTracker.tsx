import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePostHog } from '@posthog/react';

export function PostHogPageViewTracker() {
    const location = useLocation();
    const posthog = usePostHog();
    const lastTrackedUrlRef = useRef<string | null>(null);

    useEffect(() => {
        const url = `${window.location.origin}${location.pathname}${location.search}${location.hash}`;

        if (lastTrackedUrlRef.current === url) {
            return;
        }

        posthog.capture('$pageview', {
            $current_url: url,
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
            page_title: document.title,
        });

        lastTrackedUrlRef.current = url;
    }, [location.hash, location.pathname, location.search, posthog]);

    return null;
}
