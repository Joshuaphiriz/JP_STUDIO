import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-[var(--surface-2)]">
        <WifiOff className="size-7 text-[var(--text-tertiary)]" />
      </span>
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-[var(--text-tertiary)]">
        JP Studio needs a connection for this page. It&apos;ll pick up where you
        left off once you&apos;re back online.
      </p>
    </div>
  );
}
