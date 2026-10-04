import { useEffect, useRef, useState } from "react";
import { Button, Skeleton } from "@heroui/react";
import { Monitor, Smartphone, Inbox } from "lucide-react";

export function MediaKitPreview({ slug }: { slug?: string }) {
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [loaded, setLoaded] = useState(false);
  const [width, setWidth] = useState(360);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => setLoaded(false), [slug, device]);
  const viewport = device === "phone" ? 390 : 1024;
  const scale = Math.min(1, width / viewport);
  return (
    <aside className="min-w-0 rounded-3xl bg-gray-100 p-5 lg:sticky lg:top-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Preview</h2>
          <p className="mt-1 text-xs text-gray-500">Your saved media kit</p>
        </div>
        <div className="flex gap-1 rounded-full bg-gray-200 p-1">
          <Button
            isIconOnly
            variant="ghost"
            aria-label="Phone preview"
            aria-pressed={device === "phone"}
            className={`rounded-full text-black ${device === "phone" ? "bg-white shadow-sm" : ""}`}
            onPress={() => setDevice("phone")}
          >
            <Smartphone size={17} />
          </Button>
          <Button
            isIconOnly
            variant="ghost"
            aria-label="Desktop preview"
            aria-pressed={device === "desktop"}
            className={`rounded-full text-black ${device === "desktop" ? "bg-white shadow-sm" : ""}`}
            onPress={() => setDevice("desktop")}
          >
            <Monitor size={17} />
          </Button>
        </div>
      </div>
      <div
        className={`mx-auto overflow-hidden border border-gray-300 bg-white shadow-sm ${device === "phone" ? "max-w-[390px] rounded-[2.5rem] border-[6px]" : "rounded-xl border-[4px]"}`}
      >
        <div className="flex h-7 items-center justify-center border-b border-gray-100 bg-white">
          {device === "phone" ? (
            <span className="h-1 w-12 rounded-full bg-gray-300" />
          ) : (
            <span className="text-[10px] text-gray-500">
              lumina · media kit
            </span>
          )}
        </div>
        <div ref={container} className="relative h-[620px] overflow-hidden">
          {slug ? (
            <>
              {!loaded && (
                <div className="absolute inset-0 z-10 space-y-5 bg-white p-6">
                  <Skeleton className="mx-auto size-20 rounded-full" />
                  <Skeleton className="h-8 w-full rounded-xl" />
                  <Skeleton className="h-56 w-full rounded-2xl" />
                </div>
              )}
              <iframe
                key={`${slug}-${device}`}
                title={`${device === "phone" ? "Phone" : "Desktop"} media kit preview`}
                src={`/kit/${encodeURIComponent(slug)}`}
                onLoad={() => setLoaded(true)}
                style={{
                  width: viewport,
                  height: 620 / scale,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  border: 0,
                }}
              />
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <Inbox className="size-9 text-gray-400" />
              <h3 className="font-medium">Your media kit preview</h3>
              <p className="text-sm text-gray-500">
                Confirm your first account to see your public page here.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
