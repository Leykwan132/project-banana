import { useState } from "react";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Facebook } from "lucide-react";
import { ItemCard } from "./ItemCard";
import { connectionAge } from "../../lib/accountConnectionAge";
import { Button, Switch, Label, CheckboxGroup, Checkbox } from "@heroui/react";
import { api } from "../../../../../packages/backend/convex/_generated/api";

export function FacebookPagesSection({
  mode,
  data,
  now,
  selectedPageIds = [],
  onSelectionChange,
  isSelecting = false,
  selectedPageId,
  onOpen,
  onDelete,
  onReconnect,
}: {
  mode: "add" | "accounts";
  data: FunctionReturnType<typeof api.facebookPages.getEditor> | undefined;
  now: number;
  selectedPageId?: string;
  onOpen?: (id: string) => void;
  onDelete?: (page: NonNullable<FunctionReturnType<typeof api.facebookPages.getEditor>>["pages"][number]) => void;
  onReconnect?: () => void;
  selectedPageIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  isSelecting?: boolean;
}) {
  const setVisibility = useMutation(api.facebookPages.setVisibility);
  const setMetrics = useMutation(api.facebookPages.setMetricVisibility);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      {mode === "add" && !data?.choices.length && <p className="text-xs text-gray-500">Sign in to Facebook, then choose a Page you manage to see its insights. Data refreshes every 24 hours. Connect up to five Pages.</p>}
      {!data ? <p className="text-sm text-gray-500">Loading Facebook Pages…</p> : <>
        {!data.configured && <p className="text-sm text-gray-500">Facebook Page connection is awaiting app configuration.</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {mode === "add" && data.choices.length > 0 && <CheckboxGroup aria-label="Choose your Pages" value={selectedPageIds} onChange={onSelectionChange} isDisabled={isSelecting} className="space-y-3">
          {data.choices.map(page => {
            const connected = data.pages.some(item => item.pageId === page.id);
            const newSelections = selectedPageIds.filter(id => !data.pages.some(item => item.pageId === id)).length;
            return <Checkbox key={page.id} value={page.id} isDisabled={!connected && !selectedPageIds.includes(page.id) && data.pages.length + newSelections >= 5} className="w-full rounded-xl border border-gray-200 p-4">
              <Checkbox.Content className="flex w-full items-center gap-3">
                <Checkbox.Control className="shrink-0"><Checkbox.Indicator /></Checkbox.Control>
                <Label className="min-w-0 text-sm">{page.name}</Label>
              </Checkbox.Content>
            </Checkbox>;
          })}
        </CheckboxGroup>}
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
            onDelete={() => onDelete?.(page)}
          />
        ))}
        {mode === "accounts" && data.pages.filter(page => page.id === selectedPageId).map(page => (
          <article key={page.id} className="space-y-5">
            <div className="space-y-1 border-b border-gray-100 pb-5">
              <h3 className="flex min-w-0 items-center gap-2 font-medium">
                <Facebook size={18} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{page.name}</span>
                <span className="sr-only">Facebook</span>
              </h3>
              <p className="text-xs text-gray-500">
                {connectionAge(page.connectedAt, now)}
              </p>
            </div>
            {([
              ["followers", "Followers"],
              ["pageLikes", "Page likes"],
              ["engagementRate", "Engagement rate"],
              ["averageLikes", "Average likes"],
              ["averageReactions", "Average reactions"],
              ["audienceCountry", "Audience countries"],
            ] as const).map(([key, label]) => (
              <Switch key={key} isSelected={page.metricVisibility[key] ?? true} isDisabled={busy}
                onChange={(value) => void run(() => setMetrics({ connectionId: page.id, metricVisibility: { ...page.metricVisibility, [key]: value } }))}
                className="w-full">
                <Switch.Content className="flex w-full items-center justify-between gap-3">
                  <Label className="min-w-0">{label}</Label>
                  <Switch.Control className="shrink-0"><Switch.Thumb /></Switch.Control>
                </Switch.Content>
              </Switch>
            ))}
            {page.status === "reconnect_required" && <Button variant="secondary" onPress={onReconnect}>Reconnect Facebook</Button>}
            {page.error && <p role="alert" className="text-sm text-red-600">{page.error}</p>}
          </article>
        ))}
      </>}
    </section>
  );
}
