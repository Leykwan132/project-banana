import * as React from "react";

import { storage } from "@/lib/storage";
import { ConvexQueryClient } from "@convex-dev/react-query";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";

interface ProvidersProps {
    children: React.ReactNode;
}

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
    unsavedChangesWarning: false,
});
const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            queryKeyHashFn: convexQueryClient.hashFn(),
            queryFn: convexQueryClient.queryFn(),
        },
    },
});
convexQueryClient.connect(queryClient);

export function Providers({ children }: ProvidersProps) {
    return (
        <ConvexProviderWithAuth client={convex} useAuth={useWorkosConvexAuth}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </ConvexProviderWithAuth>
    );
}

function useWorkosConvexAuth() {
    const [isLoading, setIsLoading] = React.useState(true);
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);

    React.useEffect(() => {
        async function init() {
            const accessToken = await storage.getItem("accessToken");
            if (accessToken) {
                setIsAuthenticated(true);
            }
            setIsLoading(false);
        }
        init();
    }, []);

    const fetchAccessToken = React.useCallback(
        async ({
            forceRefreshToken: _forceRefreshToken,
        }: {
            forceRefreshToken: boolean;
        }) => {
            // TODO: handle refresh token
            return storage.getItem("accessToken");
        },
        []
    );

    return React.useMemo(
        () => ({
            isLoading,
            isAuthenticated,
            fetchAccessToken,
        }),
        [isLoading, isAuthenticated, fetchAccessToken]
    );
}