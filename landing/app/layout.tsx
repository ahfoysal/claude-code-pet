import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});
const term = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-term",
  display: "swap",
});

const SITE = "https://claudecodepet.vercel.app";
const title = "Claude Code Pet — a pixel desktop companion for Claude Code";
const description =
  "A free, open-source pixel pet for macOS & Windows that reacts to Claude Code in real time — showing live sessions, activity, tokens, and alerts on your desktop. Like Codex Pets, for Claude Code.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title,
  description,
  applicationName: "Claude Code Pet",
  keywords: [
    "Claude Code",
    "Claude Code Pet",
    "desktop pet",
    "pixel pet",
    "Codex Pets",
    "AI coding agent",
    "Anthropic Claude",
    "developer tools",
    "macOS",
    "Windows",
    "coding companion",
    "Tauri",
    "open source",
  ],
  authors: [{ name: "ahfoysal", url: "https://github.com/ahfoysal" }],
  creator: "ahfoysal",
  publisher: "ahfoysal",
  alternates: { canonical: "/" },
  category: "technology",
  openGraph: {
    title,
    description,
    url: SITE,
    siteName: "Claude Code Pet",
    type: "website",
    locale: "en_US",
    images: [{ url: "/demo.gif", width: 440, height: 300, alt: "Claude Code Pet reacting to Claude Code" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/demo.gif"],
    creator: "@ahfoysal",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

// Structured data for rich results (a free software application).
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Claude Code Pet",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "macOS, Windows",
  description,
  url: SITE,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@type": "Person", name: "ahfoysal", url: "https://github.com/ahfoysal" },
  license: "https://opensource.org/licenses/MIT",
  softwareVersion: "1.0.0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixel.variable} ${term.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
