import { useEffect, useRef, useState } from "react";
import { Button, Skeleton } from "@heroui/react";
import { ExternalLink, Inbox } from "lucide-react";

export function MediaKitPreview({ slug }: { slug?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [width, setWidth] = useState(360);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(1, entry.contentRect.width)),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => setLoaded(false), [slug]);
  const viewport = 390;
  const scale = Math.min(1, width / viewport);
  return (
    <aside
      aria-label="Mobile media kit preview"
      className="min-w-0 py-6 lg:sticky lg:top-6 lg:py-10"
    >
      <div className="relative mx-auto w-full max-w-[340px] px-4 sm:px-0">
        <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-gray-100 shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
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
                  key={slug}
                  title="Mobile media kit preview"
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
        {slug && (
          <Button
            isIconOnly
            variant="ghost"
            className="absolute -right-2 top-1/2 rounded-full bg-gray-200 text-black sm:-right-12"
            aria-label="Open media kit in new tab"
            onPress={() =>
              window.open(
                `/kit/${encodeURIComponent(slug)}`,
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            <ExternalLink size={18} />
          </Button>
        )}
      </div>
    </aside>
  );
}
