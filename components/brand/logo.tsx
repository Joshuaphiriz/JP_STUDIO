import { cn } from "@/lib/utils";

export function Logo({
  className,
  withWordmark = true,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 512 512"
        className="size-7 shrink-0"
        role="img"
        aria-label="JP Studio"
      >
        <defs>
          <linearGradient id="jp-logo-g" x1="96" y1="72" x2="416" y2="440">
            <stop stopColor="var(--brand-400)" />
            <stop offset="1" stopColor="var(--brand-600)" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="116" fill="url(#jp-logo-g)" />
        <path
          d="M188 146h44v134c0 40-25 66-66 66-30 0-52-14-63-38l36-22c5 12 14 19 26 19 15 0 23-9 23-27V146Z"
          fill="#fff"
        />
        <path
          d="M270 146h74c44 0 74 27 74 68s-31 69-75 69h-29v63h-44V146Zm44 39v59h26c19 0 30-11 30-30 0-18-11-29-30-29h-26Z"
          fill="#fff"
        />
      </svg>
      {withWordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
          JP Studio
        </span>
      )}
    </span>
  );
}
