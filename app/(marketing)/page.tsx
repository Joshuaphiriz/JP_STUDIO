import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Inbox,
  LayoutGrid,
  PenLine,
  Sparkles,
} from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: PenLine,
    title: "Composer with per-platform control",
    body: "Write once, then fine-tune the caption, media, and first comment for each network. Live previews as you type.",
  },
  {
    icon: CalendarClock,
    title: "Calendar & queues",
    body: "Month, week, and day views. Drag to reschedule. Recurring slots and named queues keep the pipeline full.",
  },
  {
    icon: CheckCircle2,
    title: "Approvals & client portal",
    body: "Route posts through internal and client review. Clients approve from a clean, branded portal — no account needed.",
  },
  {
    icon: Inbox,
    title: "Unified inbox",
    body: "Comments, mentions, and DMs from every account in one thread. Assign, reply, and resolve without tab-switching.",
  },
  {
    icon: LayoutGrid,
    title: "Analytics that mean something",
    body: "Follower growth, engagement trends, top posts, and best-time-to-post — per account and across the workspace.",
  },
  {
    icon: Sparkles,
    title: "Yours to theme",
    body: "Every color, font, corner, and density is a token you control. Light or dark, per person and per workspace.",
  },
];

const PLATFORMS = [
  "Facebook",
  "Instagram",
  "LinkedIn",
  "TikTok",
  "YouTube",
  "Telegram",
];

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-5 pt-20 pb-16 sm:pt-28">
        <Reveal>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            <span className="size-1.5 rounded-full bg-[var(--success)]" />A
            calmer way to run social
          </p>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
            Plan, compose, and publish everywhere — from one workspace.
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-5 max-w-xl text-lg text-[var(--text-secondary)]">
            JP Studio is a progressive web app for social media management.
            Schedule content, run approvals with clients, handle the inbox, and
            watch the numbers — with an interface you can make your own.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/sign-in">Start free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#features">See what&apos;s inside</Link>
            </Button>
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--text-tertiary)]">
            <span>Connects directly to:</span>
            {PLATFORMS.map((p) => (
              <span
                key={p}
                className="font-medium text-[var(--text-secondary)]"
              >
                {p}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      <section
        id="features"
        className="border-t border-[var(--border)] bg-[var(--surface-0)] py-16"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.04}>
              <div className="h-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] p-6">
                <f.icon className="size-5 text-[var(--primary)]" />
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-tertiary)]">
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-20 text-center">
        <Reveal>
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Install it. Make it yours.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[var(--text-secondary)]">
            Add JP Studio to your home screen and it behaves like a native app —
            offline-aware, push-enabled, full-screen.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/sign-in">Get started</Link>
          </Button>
        </Reveal>
      </section>
    </>
  );
}
