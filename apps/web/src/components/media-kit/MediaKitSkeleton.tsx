import { Skeleton } from "@heroui/react";

function PublicSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col items-center gap-4 pt-8">
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="h-10 w-56 max-w-full rounded-lg" />
        <Skeleton className="h-4 w-4/5 max-w-lg rounded-md" />
        <Skeleton className="h-4 w-3/5 max-w-sm rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>
      {[0, 1].map((i) => (
        <div
          key={i}
          className="space-y-6 rounded-3xl border border-gray-100 bg-white p-6"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-40 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {[0, 1, 2].map((j) => (
              <div key={j} className="space-y-2">
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-3 w-24 rounded-md" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((j) => (
              <Skeleton key={j} className="aspect-square w-full rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MediaKitSkeleton({ editor = false }: { editor?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={editor ? "mx-auto max-w-5xl p-5 lg:p-8" : undefined}
    >
      <span className="sr-only">
        {editor ? "Loading your media kit…" : "Loading media kit…"}
      </span>
      <div aria-hidden="true">
        {editor ? (
          <>
            <div className="mb-8 flex flex-wrap justify-between gap-4">
              <div className="space-y-3">
                <Skeleton className="h-8 w-40 rounded-lg" />
                <Skeleton className="h-4 w-64 max-w-full rounded-md" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-24 rounded-xl" />
                <Skeleton className="h-10 w-32 rounded-xl" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex max-w-full flex-wrap gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-11 w-24 shrink-0 rounded-xl" />
                ))}
              </div>
              <div className="space-y-5">
                <Skeleton className="h-5 w-32 rounded-md" />
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-24 rounded-md" />
                    <Skeleton
                      className={`w-full rounded-xl ${i === 3 ? "h-24" : "h-10"}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <PublicSkeleton />
        )}
      </div>
    </div>
  );
}
