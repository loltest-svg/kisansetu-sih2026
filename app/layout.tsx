import type { Metadata, Viewport } from "next";
import "./globals.css";
// UX4G stylesheet — the design-system authority for this project.
// Import order matches docs/UX4G.md: UX4G after Tailwind so Tailwind's
// reset never wins a specificity fight against UX4G component styles.
import "ux4g-web-components/styles.css";
import Ux4gRuntime from "@/components/Ux4gRuntime";

export const metadata: Metadata = {
  title: "Smart MSP Procurement Coordination Platform",
  description:
    "Coordination layer matching farmer arrivals to real procurement-centre capacity — SIH26032 prototype.",
  manifest: "/manifest.webmanifest",
  // app/favicon.ico is auto-detected by Next.js; only the apple-touch
  // icon (not covered by that convention) needs declaring here.
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // UX4G's own primary token (--ux4g-color-primary-600), not an invented
  // brand colour — the manifest/meta theme-color spec requires a literal
  // hex value and cannot reference a CSS custom property.
  themeColor: "#4A2BC2",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-theme is the required UX4G theme switch (Design.md §10) —
    // components have no fallback theme without it. Default UX4G theme
    // per project decision (docs/UX4G.md): "light", no custom overrides.
    <html lang="en" data-theme="light">
      <body>
        <Ux4gRuntime />
        {children}
      </body>
    </html>
  );
}
