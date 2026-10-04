import { useEffect, useRef, useState } from "react";
import { Inbox } from "lucide-react";

export function MediaKitPreview({ slug }: { slug?: string }) {
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
  const viewport = 390;
  const scale = Math.min(1, width / viewport);
  return (
    <aside
      aria-label="Mobile media kit preview"
      className="min-w-0 py-4 lg:sticky lg:top-6"
    >
      <div
        className="relative mx-auto w-full"
        style={{ maxWidth: "min(340px, calc((100dvh - 140px) * 9 / 19.5))" }}
      >
        <div className="overflow-hidden rounded-[2rem] border border-gray-700 bg-[#0a0a0a] text-gray-100 shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
          <div
            ref={container}
            className="relative aspect-[9/19.5] overflow-hidden"
          >
            {slug ? (
              <>
                <iframe
                  key={slug}
                  title="Mobile media kit preview"
                  src={`/kit/${encodeURIComponent(slug)}`}
                  style={{
                    width: viewport,
                    height: viewport * (19.5 / 9),
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
      </div>
    </aside>
  );
}
