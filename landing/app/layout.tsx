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
    icon:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🐾%3C/text%3E%3C/svg%3E",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixel.variable} ${term.variable}`}>
      <body>{children}</body>
    </html>
  );
}
