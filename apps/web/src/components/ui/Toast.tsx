import type { ReactNode } from "react";
import { Toast, toast as heroToast } from "@heroui/react";
import { CircleCheck, CircleAlert, TriangleAlert, Info } from "lucide-react";

type ToastVariant = "success" | "danger" | "warning" | "info";
interface ToastOptions {
  title: string;
  description?: string;
  color?: ToastVariant;
  duration?: number;
}
type AddToastFn = (options: ToastOptions) => void;
const icons = {
  success: CircleCheck,
  danger: CircleAlert,
  warning: TriangleAlert,
  info: Info,
};

/** Preserve the app's existing notification API while using HeroUI's queue. */
export function toast(options: ToastOptions): void {
  const Icon = icons[options.color ?? "info"];
  heroToast(options.title, {
    description: options.description,
    timeout: options.duration ?? 3000,
    variant: "default",
    indicator: <Icon className="size-5 text-gray-600" aria-hidden="true" />,
  });
}
export function useToast(): AddToastFn {
  return toast;
}
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toast.Provider
        placement="bottom"
        width="min(420px, calc(100vw - 32px))"
        className="z-[99999]"
      >
        {({ toast: notification }) => (
          <Toast
            toast={notification}
            variant="default"
            className="border border-gray-200 bg-gray-50 text-gray-900 shadow-sm"
          >
            <Toast.Indicator className="text-gray-600">
              {notification.content.indicator}
            </Toast.Indicator>
            <Toast.Content>
              <Toast.Title className="font-medium text-gray-900">
                {notification.content.title}
              </Toast.Title>
              {notification.content.description && (
                <Toast.Description className="text-gray-600">
                  {notification.content.description}
                </Toast.Description>
              )}
            </Toast.Content>
            <Toast.CloseButton className="text-gray-500" />
          </Toast>
        )}
      </Toast.Provider>
    </>
  );
}
