"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";

type Account = {
  id: string;
  name: string;
  platform: string;
  followers: number;
};
type TopPost = {
  postId: string;
  caption: string;
  platform: string;
  permalink: string | null;
  impressions: number;
  likes: number;
  comments: number;
  engagementRate: number;
};

export function AnalyticsClient({
  totalFollowers,
  followerDelta,
  followerSeries,
  accounts,
  topPosts,
  heatmap,
  heatmapSamples,
}: {
  totalFollowers: number;
  followerDelta: number;
  followerSeries: { day: string; followers: number }[];
  accounts: Account[];
  topPosts: TopPost[];
  heatmap: (number | null)[][];
  heatmapSamples: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Total followers"
          value={totalFollowers.toLocaleString()}
          delta={followerDelta}
        />
        <Stat label="Connected accounts" value={String(accounts.length)} />
        <Stat
          label="Tracked posts"
          value={String(topPosts.length)}
          hint="ranked by engagement"
        />
      </div>

      <Card className="p-4">
        <p className="mb-3 text-sm font-medium">Follower growth · 90 days</p>
        {followerSeries.length > 1 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={followerSeries}>
                <defs>
                  <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-0)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="followers"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#fg)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-[var(--text-tertiary)]">
            Not enough history yet.
          </p>
        )}
      </Card>

      <Card className="p-4">
        <p className="mb-3 text-sm font-medium">Accounts</p>
        <ul className="flex flex-col divide-y divide-[var(--border)]">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2.5">
              <span className="flex size-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-[10px] font-semibold uppercase">
                {a.platform.slice(0, 2)}
              </span>
              <span className="flex-1 truncate text-sm">{a.name}</span>
              <span className="text-sm text-[var(--text-secondary)] tabular-nums">
                {a.followers.toLocaleString()}
              </span>
            </li>
          ))}
          {accounts.length === 0 && (
            <li className="py-6 text-center text-sm text-[var(--text-tertiary)]">
              No connected accounts.
            </li>
          )}
        </ul>
      </Card>

      <Card className="p-4">
        <p className="mb-3 text-sm font-medium">Top posts</p>
        {topPosts.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">
            No post metrics collected yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--border)]">
            {topPosts.map((p) => (
              <li key={p.postId + p.platform} className="flex gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13px]">
                    {p.caption || "(no caption)"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                    {p.platform} · {p.impressions.toLocaleString()} impressions
                    · {p.likes.toLocaleString()} likes ·{" "}
                    {p.comments.toLocaleString()} comments
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-[var(--primary)] tabular-nums">
                  {(p.engagementRate * 100).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <p className="mb-1 text-sm font-medium">Best time to post</p>
        <p className="mb-3 text-xs text-[var(--text-tertiary)]">
          Average engagement by day and hour (UTC). Darker = better.
        </p>
        {heatmapSamples < 10 ? (
          <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">
            Needs at least 10 published posts with metrics — {heatmapSamples} so
            far.
          </p>
        ) : (
          <Heatmap grid={heatmap} />
        )}
      </Card>
    </div>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Heatmap({ grid }: { grid: (number | null)[][] }) {
  const values = grid.flat().filter((v): v is number => v != null);
  const max = values.length ? Math.max(...values) : 1;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="mb-1 ml-9 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-px">
          {Array.from({ length: 24 }, (_, h) => (
            <span
              key={h}
              className="text-center text-[9px] text-[var(--text-ghost)]"
            >
              {h % 3 === 0 ? h : ""}
            </span>
          ))}
        </div>
        {grid.map((row, d) => (
          <div key={d} className="flex items-center gap-px">
            <span className="w-9 shrink-0 text-[10px] text-[var(--text-tertiary)]">
              {DAYS[d]}
            </span>
            <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))] gap-px">
              {row.map((v, h) => (
                <span
                  key={h}
                  title={
                    v == null
                      ? `${DAYS[d]} ${h}:00 — no data`
                      : `${DAYS[d]} ${h}:00 — ${(v * 100).toFixed(1)}%`
                  }
                  className="aspect-square rounded-[2px]"
                  style={{
                    background:
                      v == null
                        ? "var(--surface-2)"
                        : `color-mix(in oklch, var(--primary) ${Math.round((v / max) * 100)}%, var(--surface-2))`,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-[var(--text-tertiary)]">{label}</p>
      {delta !== undefined && delta !== 0 && (
        <p
          className={
            "mt-1 flex items-center gap-1 text-xs " +
            (delta > 0 ? "text-[var(--success)]" : "text-[var(--error)]")
          }
        >
          {delta > 0 ? (
            <TrendingUp className="size-3" />
          ) : (
            <TrendingDown className="size-3" />
          )}
          {delta > 0 ? "+" : ""}
          {delta.toLocaleString()} in 90d
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-[var(--text-ghost)]">{hint}</p>}
    </Card>
  );
}
