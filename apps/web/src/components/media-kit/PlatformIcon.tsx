import { Instagram, Music2 } from "lucide-react";
export function PlatformIcon({
  platform = "instagram",
  size = 18,
}: {
  platform?: "instagram" | "tiktok";
  size?: number;
}) {
  const Icon = platform === "tiktok" ? Music2 : Instagram;
  return <Icon size={size} aria-hidden="true" className="shrink-0" />;
}
