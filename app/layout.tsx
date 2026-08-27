import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeStyle } from "@/components/theme/theme-style";
import { DEFAULT_THEME } from "@/lib/theme/types";
import { appBaseUrl } from "@/lib/url";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "JP Studio",
    template: "%s · JP Studio",
  },
  description:
    "Plan, compose, schedule, approve, and publish social content across every platform — from one calm workspace.",
  applicationName: "JP Studio",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "JP Studio" },
  formatDetection: { telephone: false },
  metadataBase: new URL(appBaseUrl()),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f12" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeStyle config={DEFAULT_THEME} id="jp-theme-base" withModeScript />
      </head>
      <body className="min-h-full">
        <Providers theme={DEFAULT_THEME}>{children}</Providers>
      </body>
    </html>
  );
}
