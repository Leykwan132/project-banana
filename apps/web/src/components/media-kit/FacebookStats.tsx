import { useEffect, useMemo, useRef } from "react";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip as ChartTooltip } from "chart.js";
import { Heart, MessageCircle, TrendingUp, Users } from "lucide-react";
import { Stat } from "./InstagramStats";
import type { KitView } from "./MediaKitView";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, ChartTooltip);
type Account = KitView["accounts"][number];
const format = (value: number) => Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

function CountryChart({ countries }: { countries: NonNullable<Account["audienceCountry"]> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { total, rows, labels, percentages } = useMemo(() => {
  const total = countries.reduce((sum, country) => sum + country.value, 0);
  const sorted = [...countries].sort((a, b) => b.value - a.value);
  const shown = sorted.slice(0, 4);
  const other = sorted.slice(4).reduce((sum, country) => sum + country.value, 0);
  const rows = [...shown, ...(other > 0 ? [{ country: "Other", value: other }] : [])];
  const labels = rows.map(row => row.country === "Other" ? "Other" : countryNames.of(row.country) ?? row.country);
  const percentages = rows.map(row => total > 0 ? row.value / total * 100 : 0);
  return { total, rows, labels, percentages };
  }, [countries]);
  useEffect(() => {
    if (!canvas.current || total <= 0) return;
    const chart = new Chart(canvas.current, {
      type: "bar",
      data: { labels, datasets: [{ data: percentages, backgroundColor: "#3b82f6", borderRadius: 5, barThickness: 16 }] },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { label: context => `${Number(context.raw).toFixed(1)}% of returned audience` } } },
        scales: { x: { min: 0, max: 100, grid: { color: "#ffffff0d" }, ticks: { color: "#9ca3af", callback: value => `${value}%` }, border: { display: false } }, y: { grid: { display: false }, border: { display: false }, ticks: { color: "#d1d5db" } } },
      },
    });
    return () => chart.destroy();
  }, [labels, percentages, total]);
  if (!total) return null;
  return <>
    <div style={{ height: Math.max(180, rows.length * 44) }}><canvas ref={canvas} role="img" aria-label="Follower distribution by country" /></div>
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-400">{rows.map((row, index) => <li key={row.country}>{labels[index]} {percentages[index].toFixed(1)}%</li>)}</ul>
  </>;
}

export function FacebookStats({ account }: { account: Account }) {
  const sample = account.postSampleSize ?? "available";
  const hasPrimary = account.followers !== undefined || account.engagementRate !== undefined || account.pageLikes !== undefined;
  const hasAverages = account.averageLikes !== undefined || account.averageReactions !== undefined;
  const hasCountries = !!account.audienceCountry?.some(country => country.value > 0);
  if (!hasPrimary && !hasAverages && !hasCountries) return null;
  return <section aria-label="Facebook Page statistics" className="space-y-5 pt-5">
    <h4 className="font-semibold">Page Statistics</h4>
    {hasPrimary && <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 sm:gap-4">
      {account.followers !== undefined && <Stat label="Followers" value={format(account.followers)} icon={Users} help="Current Page follower count." />}
      {account.engagementRate !== undefined && <Stat label="Engagement rate" value={`${account.engagementRate.toFixed(2)}%`} icon={TrendingUp} help={`Average reactions, comments, and shares per post divided by current followers, multiplied by 100. Based on lifetime counts on ${sample} recent posts.`} />}
      {account.pageLikes !== undefined && <Stat label="Page likes" value={format(account.pageLikes)} icon={Heart} help="Current number of people who like this Page." />}
    </div>}
    {hasAverages && <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-4">
      {account.averageLikes !== undefined && <Stat label="Avg likes" value={format(account.averageLikes)} icon={Heart} help={`Lifetime likes averaged over ${sample} recent Page posts.`} />}
      {account.averageReactions !== undefined && <Stat label="Avg reactions" value={format(account.averageReactions)} icon={MessageCircle} help={`Lifetime reactions averaged over ${sample} recent Page posts. Includes likes and other reaction types.`} />}
    </div>}
    {hasCountries && <div className="space-y-4 rounded-2xl bg-white/5 p-4 sm:p-5">
      <h5 className="text-sm font-medium">Audience Country</h5>
      <CountryChart countries={account.audienceCountry!} />
    </div>}
  </section>;
}
