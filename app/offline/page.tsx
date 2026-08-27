"use client";

import { useEffect } from "react";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  useEffect(() => {
    // If we can reach the network, get out of here.
    const recover = () => {
      if (navigator.onLine) window.location.replace("/app");
    };
    recover();
    window.addEventListener("online", recover);
    const t = setInterval(recover, 3000);
    return () => {
      window.removeEventListener("online", recover);
      clearInterval(t);
    };
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-[var(--surface-2)]">
        <WifiOff className="size-7 text-[var(--text-tertiary)]" />
      </span>
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-[var(--text-tertiary)]">
        JP Studio needs a connection. This page will reload itself once
        you&apos;re back online.
      </p>
      <Button onClick={() => window.location.replace("/app")}>Try again</Button>
    </div>
  );
}
