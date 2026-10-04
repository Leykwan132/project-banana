import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useParams } from "react-router-dom";
import { api } from "../../../../packages/backend/convex/_generated/api";
import { MediaKitView } from "../components/media-kit/MediaKitView";
export default function MediaKit() {
  const { slug } = useParams();
  const kit = useQuery(api.mediaKits.getPublic, { slug: slug ?? "" });
  useEffect(() => {
    const previous = document.title;
    document.title = kit
      ? `${kit.displayName} | Lumina Media Kit`
      : "Media Kit | Lumina";
    return () => {
      document.title = previous;
    };
  }, [kit]);
  return (
    <main className="min-h-screen bg-[#fafaf8] px-5 py-8">
      {kit === undefined ? (
        <p role="status" className="text-center py-20 text-gray-500">
          Loading media kit…
        </p>
      ) : kit === null ? (
        <div className="text-center py-24">
          <h1 className="text-2xl font-semibold">Media kit unavailable</h1>
          <p className="mt-3 text-gray-500">
            This page is not published or no longer exists.
          </p>
          <a href="/" className="inline-block mt-6">
            Visit Lumina
          </a>
        </div>
      ) : (
        <MediaKitView kit={kit} />
      )}
    </main>
  );
}
