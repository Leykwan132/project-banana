import { Facebook, Instagram } from "lucide-react";
import { FaTiktok } from "react-icons/fa";
export function PlatformIcon({
  platform = "instagram",
  size = 18,
}: {
  platform?: "instagram" | "tiktok" | "facebook";
  size?: number;
}) {
  const Icon = platform === "facebook" ? Facebook : platform === "tiktok" ? FaTiktok : Instagram;
  return <Icon size={size} aria-hidden="true" className="shrink-0" />;
}
