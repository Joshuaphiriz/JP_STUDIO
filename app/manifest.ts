import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JP Studio",
    short_name: "JP Studio",
    description:
      "Plan, compose, schedule, approve, and publish social content from one calm workspace.",
    id: "/app",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#0d0f12",
    theme_color: "#0d0f12",
    categories: ["productivity", "business", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Composer", url: "/app?compose=1", short_name: "Compose" },
      { name: "Calendar", url: "/app/calendar" },
      { name: "Inbox", url: "/app/inbox" },
    ],
  };
}
