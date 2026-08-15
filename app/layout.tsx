import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "An Phong 13 — Horror Tracing Challenge",
  description: "Trace five supernatural sigils before time runs out. Scored by accuracy, coverage, and speed.",
  metadataBase: new URL("https://ca-dem-13.khanh-forget5.chatgpt.site"),
  openGraph: {
    title: "An Phong 13 — Trace. Seal. Survive.",
    description: "One stroke. Twelve seconds. Seal the entity.",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "An Phong 13" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "An Phong 13",
    description: "One stroke. Twelve seconds. Seal the entity.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
