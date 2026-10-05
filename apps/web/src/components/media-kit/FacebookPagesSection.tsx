import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@heroui/react";
import { api } from "../../../../../packages/backend/convex/_generated/api";

export function FacebookPagesSection({ mode, onSelected, onPageCountChange, onConfiguredChange }: { mode: "add" | "accounts"; onSelected?: () => void; onPageCountChange?: (count: number) => void; onConfiguredChange?: (configured: boolean) => void }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  const data = useQuery(api.facebookPages.getEditor, { now });
  const pageCount = data?.pages.length;
  useEffect(() => { if (pageCount !== undefined) onPageCountChange?.(pageCount); }, [pageCount, onPageCountChange]);
  const configured = data?.configured;
  useEffect(() => { if (configured !== undefined) onConfiguredChange?.(configured); }, [configured, onConfiguredChange]);
  const select = useMutation(api.facebookPages.selectPage);
  const disconnect = useMutation(api.facebookPages.disconnect);
  const refresh = useMutation(api.facebookPages.requestRefresh);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Please try again."); }
    finally { setBusy(false); }
  }
  if (mode === "accounts" && !data?.pages.length) return null;
  return (
    <section aria-label="Facebook Page insights" className={mode === "add" ? "space-y-4" : "space-y-4 border-t border-gray-200 pt-6"}>
      {mode === "add" && <p className="text-xs text-gray-500">Sign in to Facebook, then choose a Page you manage to see its insights. Data refreshes every 24 hours. Connect up to five Pages.</p>}
      {!data ? <p className="text-sm text-gray-500">Loading Facebook Pages…</p> : <>
        {!data.configured && <p className="text-sm text-gray-500">Facebook Page connection is awaiting app configuration.</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {mode === "add" && data.choices.length > 0 && <div className="space-y-2 rounded-2xl bg-gray-50 p-4">
          <h3 className="text-sm font-medium">Choose a Page</h3>
          <p className="text-xs text-gray-500">This selection expires after ten minutes. Connect Facebook again if it expires.</p>
          {data.choices.map(page => <div key={page.id} className="flex items-center justify-between gap-3">
            <span className="text-sm">{page.name}</span>
            <Button type="button" size="sm" variant="secondary" isDisabled={busy} onPress={() => void run(async () => { await select({ pageId: page.id }); onSelected?.(); })}>
              {data.pages.some(connected => connected.pageId === page.id) ? "Reconnect Page" : "Connect Page"}
            </Button>
          </div>)}
        </div>}
        {mode === "accounts" && data.pages.map(page => <article key={page.id} className="space-y-3 rounded-2xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-medium">{page.name}</h3><p className="mt-1 text-xs text-gray-500">{page.refreshing ? "Updating insights…" : page.status === "reconnect_required" ? "Reconnect required" : "Connected · Official Facebook data"}</p></div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" isDisabled={busy || page.refreshing || page.status !== "connected" || page.refreshAvailableAt > now} onPress={() => void run(() => refresh({ connectionId: page.id }))}>Refresh</Button>
              <Button type="button" size="sm" variant="ghost" isDisabled={busy} onPress={() => setRemoving(page.id)}>Disconnect</Button>
            </div>
          </div>
          {removing === page.id && <div className="flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 p-3">
            <p className="text-sm">Remove this Page connection and its saved insights?</p>
            <Button type="button" size="sm" variant="danger" isDisabled={busy} onPress={() => void run(async () => { await disconnect({ connectionId: page.id }); setRemoving(null); })}>Disconnect Page</Button>
            <Button type="button" size="sm" variant="ghost" onPress={() => setRemoving(null)}>Cancel</Button>
          </div>}
          {page.error && <p role="alert" className="text-sm text-red-600">{page.error}</p>}
          {page.snapshot && <>
            <p className="text-xs text-gray-500">Updated {new Date(page.snapshot.fetched_at).toLocaleString()}. Views: {new Date(page.snapshot.since * 1000).toLocaleDateString()}–{new Date(page.snapshot.until * 1000).toLocaleDateString()} (UTC).</p>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div><dt className="text-xs text-gray-500">Current followers</dt><dd className="font-medium">{page.snapshot.followers?.toLocaleString() ?? "Unavailable"}</dd></div>
              <div><dt className="text-xs text-gray-500">Current Page likes</dt><dd className="font-medium">{page.snapshot.page_likes?.toLocaleString() ?? "Unavailable"}</dd></div>
              <div><dt className="text-xs text-gray-500">Media views · reported days</dt><dd className="font-medium">{page.snapshot.media_views?.toLocaleString() ?? "Unavailable"}</dd></div>
            </dl>
            {page.snapshot.daily_views.length > 0 && <p className="text-xs text-gray-500">Total of {page.snapshot.daily_views.length} daily values returned by Facebook within this window. Missing metrics remain unavailable.</p>}
          </>}
        </article>)}
      </>}
    </section>
  );
}
