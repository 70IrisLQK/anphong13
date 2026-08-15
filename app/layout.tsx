import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Ca Đêm 13 — Horror Shop Simulator",
  description: "Bán hàng, tiếp kệ và phát hiện kẻ dị thường trong ca trực 90 giây.",
  metadataBase: new URL("https://ca-dem-13.khanh-forget5.chatgpt.site"),
  openGraph: {
    title: "Ca Đêm 13 — Night Shift Protocol",
    description: "Một ca trực 90 giây. Đừng phục vụ kẻ không phải người.",
    type: "website",
    locale: "vi_VN",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Ca Đêm 13 — Night Shift Protocol" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ca Đêm 13 — Night Shift Protocol",
    description: "Một ca trực 90 giây. Đừng phục vụ kẻ không phải người.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
