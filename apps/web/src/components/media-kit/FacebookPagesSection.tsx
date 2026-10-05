import { useState } from "react";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Facebook } from "lucide-react";
import { ItemCard } from "./ItemCard";
import { connectionAge } from "../../lib/accountConnectionAge";
import { Button } from "@heroui/react";
import { api } from "../../../../../packages/backend/convex/_generated/api";

export function FacebookPagesSection({
  mode,
  data,
  now,
  onSelected,
  selectedPageId,
  onOpen,
  onDisconnected,
}: {
  mode: "add" | "accounts";
  data: FunctionReturnType<typeof api.facebookPages.getEditor> | undefined;
  now: number;
  selectedPageId?: string;
  onOpen?: (id: string) => void;
  onDisconnected?: () => void;
  onSelected?: () => void;
}) {
  const select = useMutation(api.facebookPages.selectPage);
  const setVisibility = useMutation(api.facebookPages.setVisibility);
  const disconnect = useMutation(api.facebookPages.disconnect);
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
    <section aria-label="Facebook Page insights" className={mode === "add" ? "space-y-4" : "space-y-5"}>
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
        {mode === "accounts" && !selectedPageId && data.pages.map(page => (
          <ItemCard
            key={page.id}
            title={page.name}
            titleIcon={<Facebook size={18} aria-hidden="true" />}
            platformLabel="Facebook"
            visible={page.isVisible ?? true}
            onToggle={() => void run(() => setVisibility({ connectionId: page.id, isVisible: !(page.isVisible ?? true) }))}
            description={page.status === "reconnect_required" ? `${connectionAge(page.connectedAt, now)} · Reconnect required` : connectionAge(page.connectedAt, now)}
            onOpen={() => onOpen?.(page.id)}
            onDelete={() => setRemoving(page.id)}
          />
        ))}
        {mode === "accounts" && data.pages.filter(page => page.id === selectedPageId).map(page => (
          <article key={page.id} className="space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex min-w-0 items-center gap-2 font-medium">
                <Facebook size={18} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{page.name}</span>
                <span className="sr-only">Facebook</span>
              </h3>
            </div>
            <p className="text-xs text-gray-500">
              {connectionAge(page.connectedAt, now)}
            </p>
          </article>
        ))}
        {mode === "accounts" && data.pages.filter(page => page.id === removing).map(page => <div key={page.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 p-3">
            <p className="text-sm">Remove this Page connection and its saved insights?</p>
            <Button type="button" size="sm" variant="danger" isDisabled={busy} onPress={() => void run(async () => { await disconnect({ connectionId: page.id }); setRemoving(null); if (selectedPageId === page.id) onDisconnected?.(); })}>Disconnect Page</Button>
            <Button type="button" size="sm" variant="ghost" onPress={() => setRemoving(null)}>Cancel</Button>
        </div>)}
      </>}
    </section>
  );
}
