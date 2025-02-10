"use client";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

export default function IIIFDevRefresh() {
  const router = useRouter();
  const params = useParams<{ manifest?: string; collection?: string }>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only runs once.
  useLayoutEffect(() => {
    const ws = new WebSocket("ws://localhost:7111/ws");
    ws.onmessage = (ev) => {
      if (ev.data === "full-rebuild" || ev.data === "file-refresh") {
        router.refresh();
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const fullRebuild = async () => {
    setIsRefreshing(true);
    try {
      await fetch("http://localhost:7111/build", {
        method: "POST",
        body: JSON.stringify({ cache: false }),
      });
      router.refresh();
    } catch (e) {
      console.error(e);
    }
    setIsRefreshing(false);
  };

  return (
    <div className="fixed bottom-2 left-36 flex h-12 items-center bg-white p-3 rounded">
      <div className={twMerge("iiif-logo", isRefreshing && "animate-pulse")} />
      <button
        type="button"
        className={twMerge(
          "ml-2 text-blue-500 underline",
          isRefreshing && "opacity-40",
        )}
        onClick={fullRebuild}
        disabled={isRefreshing}
      >
        Full rebuild
      </button>
    </div>
  );
}
