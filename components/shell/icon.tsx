import {
  CalendarClock,
  Home,
  Image as ImageIcon,
  Inbox,
  LineChart,
  ListChecks,
  Palette,
  PenSquare,
  Plug,
  Plus,
  Settings,
  Users,
  type LucideProps,
} from "lucide-react";

const MAP = {
  Home,
  PenSquare,
  CalendarClock,
  ListChecks,
  Inbox,
  LineChart,
  ImageIcon,
  Plug,
  Plus,
  Users,
  Settings,
  Palette,
} as const;

export type IconName = keyof typeof MAP;

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = MAP[name as IconName] ?? Home;
  return <Cmp {...props} />;
}
