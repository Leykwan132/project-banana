import { useState } from "react";
import { Activity, Bookmark, Eye, Heart, Info, MessageCircle, Share2, Target, TrendingUp, Users } from "lucide-react";
import { Tooltip } from "@heroui/react";
import type { KitView } from "./MediaKitView";

type Account = KitView["accounts"][number];
const format = (value: number) => Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const metrics = [
  ["engagementRate", "Engagement rate", TrendingUp, "Total interactions divided by views for this period, multiplied by 100. This measures interactions per view."],
  ["views", "Views", Eye, "Times content was played or displayed during this period."],
  ["reach", "Reach", Target, "Unique accounts reached during this period. This is an estimated metric."],
  ["likes", "Likes", Heart, "Likes received during this period, including on older content."],
  ["comments", "Comments", MessageCircle, "Comments received during this period."],
  ["shares", "Shares", Share2, "Shares received during this period."],
  ["saves", "Saves", Bookmark, "Saves received during this period."],
  ["totalInteractions", "Total interactions", Activity, "Total content interactions reported for this period."],
  ["accountsEngaged", "Accounts engaged", Users, "Unique accounts that interacted with content during this period."],
] as const;

export function Stat({ label, value, icon: Icon, help }: { label: string; value: string; icon: typeof Users; help: string }) {
  const [isHelpOpen, setHelpOpen] = useState(false);
  return <div className="rounded-2xl bg-white/5 p-4 sm:p-5">
    <div className="flex items-center gap-2 text-sm text-gray-300">
      <Icon size={15} aria-hidden="true" /><span>{label}</span>
      <Tooltip isOpen={isHelpOpen} onOpenChange={setHelpOpen}><Tooltip.Trigger<"button"> render={props => <button {...props} />} type="button" aria-label={`About ${label.toLowerCase()}`} onClick={() => setHelpOpen(open => !open)} className="ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:text-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2"><Info size={14} aria-hidden="true" /></Tooltip.Trigger>
        <Tooltip.Content placement="top" className="max-w-64 rounded-xl bg-neutral-800 px-3 py-2 text-xs text-gray-100">{help}</Tooltip.Content>
      </Tooltip>
    </div>
    <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
  </div>;
}

export function InstagramStats({ account }: { account: Account }) {
  const [selectedDays, setSelectedDays] = useState(7);
  const windows = account.insightWindows ?? [];
  const selected = windows.find(window => window.days === selectedDays) ?? windows.find(window => window.days === 7) ?? windows[0];
  if (!selected) return null;
  return <section aria-label="Instagram account statistics" className="space-y-5 pt-5">
    <h4 className="font-semibold">Page Statistics</h4>
    <div className="flex w-full flex-wrap gap-2" role="group" aria-label="Statistics date range">
        {[...windows].sort((a, b) => a.days - b.days).map(window => <button key={window.days} type="button" aria-pressed={selected.days === window.days} onClick={() => setSelectedDays(window.days)} className={`min-w-0 flex-1 rounded-full px-3 py-2.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${selected.days === window.days ? "bg-gray-200 text-black" : "text-gray-400 hover:text-gray-100"}`}>Past {window.days}d</button>)}
    </div>
    <div className="grid grid-cols-1 gap-3 sm:gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3">
      {account.followers !== undefined && <Stat label="Followers" value={format(account.followers)} icon={Users} help="Current follower count. This total does not change with the selected period." />}
      {metrics.filter(([key]) => selected.visibleMetrics.includes(key)).map(([key, label, Icon, help]) => <Stat key={key} label={label} value={selected[key] === undefined ? "Unavailable" : key === "engagementRate" ? `${selected[key].toFixed(2)}%` : format(selected[key])} icon={Icon} help={help} />)}

        {account.averageLikes !== undefined && <Stat label="Avg likes" value={format(account.averageLikes)} icon={Heart} help={`Lifetime likes averaged over ${account.likesSampleSize ?? "available"} recent posts. These are sample averages, independent of the selected account-insights period.`} />}
        {account.averageComments !== undefined && <Stat label="Avg comments" value={format(account.averageComments)} icon={MessageCircle} help={`Lifetime comments averaged over ${account.commentsSampleSize ?? "available"} recent posts. These are sample averages, independent of the selected account-insights period.`} />}
    </div>
  </section>;
}
