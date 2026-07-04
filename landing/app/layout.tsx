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

const title = "Claude Code Pet — a pixel companion for Claude Code";
const description =
  "A floating pixel pet for macOS & Windows that reacts to Claude Code in real time — live sessions, activity, and alerts on your desktop. Free & open source.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://claude-code-pet.vercel.app"),
  openGraph: { title, description, type: "website", images: ["/demo.gif"] },
  twitter: { card: "summary_large_image", title, description, images: ["/demo.gif"] },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixel.variable} ${term.variable}`}>
      <body>{children}</body>
    </html>
  );
}
