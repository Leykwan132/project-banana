import { Mail, Globe, Instagram } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

export function ContactIcon({
  kind,
  size = 18,
}: {
  kind: string;
  size?: number;
}) {
  const Icon =
    kind === "email"
      ? Mail
      : kind === "whatsapp"
        ? FaWhatsapp
        : kind === "instagram"
          ? Instagram
          : Globe;
  return <Icon size={size} aria-hidden="true" className="shrink-0" />;
}
