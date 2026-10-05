import { Loader2 } from "lucide-react";

export function RedirectingStatus() {
    return (
        <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col items-center text-center">
            <Loader2 className="mb-6 h-8 w-8 animate-spin text-gray-900 motion-reduce:animate-none" aria-hidden="true" />
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Redirecting</h1>
            <p className="mt-2 text-sm text-gray-500">You are being redirected… Please wait…</p>
        </div>
    );
}
