import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import { brand } from "@/lib/brand";
import "./globals.css";

// Body text uses the device system font: one fewer font download before the hero image can paint.
const display = Fraunces({ variable: "--font-display", subsets: ["latin"], display: "swap", weight: ["500", "600"] });

export const metadata: Metadata = {
  title: { default: `${brand.name} — ${brand.tagline}`, template: `%s | ${brand.name}` },
  description: brand.tagline,
};

export const viewport: Viewport = { themeColor: "#faf6ee" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Font variables sit on <html> because the base font-family is set there.
  return (
    <html lang="en" className={display.variable}>
      <body>{children}</body>
    </html>
  );
}
