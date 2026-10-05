import type { ReactNode } from "react";
import { Button, Tooltip } from "@heroui/react";
import { Eye, EyeOff, Trash2 } from "lucide-react";

export function ItemCard({
  title,
  icon,
  titleIcon,
  platformLabel,
  description,
  visible,
  onOpen,
  onToggle,
  onDelete,
}: {
  title: string;
  icon?: ReactNode;
  titleIcon?: ReactNode;
  platformLabel?: string;
  description: string;
  visible?: boolean;
  onOpen: () => void;
  onToggle?: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50 focus-within:border-gray-300 focus-within:bg-gray-50">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={onOpen}
      >
        {icon && (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gray-100 text-gray-700">
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-2 font-medium">
            {titleIcon && <span className="shrink-0 text-gray-700">{titleIcon}</span>}
            <span className="truncate">{title}</span>
            {platformLabel && <span className="sr-only">{platformLabel}</span>}
          </p>
          <p className="mt-1 truncate text-sm text-gray-500">{description}</p>
        </div>
      </button>

      {onToggle && <Tooltip delay={300}>
        <Tooltip.Trigger>
          <Button
            isIconOnly
            variant="ghost"
            aria-label={visible ? `Hide ${title}` : `Show ${title}`}
            className="text-black"
            onPress={onToggle}
          >
            {visible ? <Eye size={18} /> : <EyeOff size={18} />}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content
          placement="top"
          showArrow
          className="rounded-xl bg-[#171717] px-3 py-2 text-xs font-medium text-white shadow-lg"
        >
          {visible ? "Hide in Media Kit" : "Show in Media Kit"}
        </Tooltip.Content>
      </Tooltip>}
      <Button
        isIconOnly
        variant="ghost"
        aria-label={`Delete ${title}`}
        className="text-red-600"
        onPress={onDelete}
      >
        <Trash2 size={18} />
      </Button>
    </div>
  );
}
