export type NavItem = {
  label: string;
  segment: string;
  /** key into components/shell/icon.tsx MAP */
  icon: string;
  /** false → destination is a placeholder until a later phase */
  ready?: boolean;
};

/** Workspace-scoped navigation. Hrefs are built as /app/<workspace>/<segment>. */
export const WORKSPACE_NAV: NavItem[] = [
  { label: "Overview", segment: "", icon: "Home", ready: true },
  { label: "Composer", segment: "composer", icon: "PenSquare", ready: true },
  {
    label: "Calendar",
    segment: "calendar",
    icon: "CalendarClock",
    ready: true,
  },
  { label: "Queue", segment: "queue", icon: "ListChecks" },
  { label: "Approvals", segment: "approvals", icon: "ListChecks", ready: true },
  { label: "Inbox", segment: "inbox", icon: "Inbox", ready: true },
  { label: "Analytics", segment: "analytics", icon: "LineChart" },
  { label: "Media", segment: "media", icon: "ImageIcon", ready: true },
  { label: "Accounts", segment: "accounts", icon: "Plug", ready: true },
  { label: "Members", segment: "members", icon: "Users", ready: true },
  { label: "Settings", segment: "settings", icon: "Settings", ready: true },
];
