import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Ấn Phong 13 — Horror Tracing Challenge",
  description: "Đồ 5 ấn chú trước khi đồng hồ về 0. Chấm điểm theo độ chính xác, độ phủ và tốc độ.",
  metadataBase: new URL("https://ca-dem-13.khanh-forget5.chatgpt.site"),
  openGraph: {
    title: "Ấn Phong 13 — Vẽ ấn. Khóa dị thể.",
    description: "Một nét, 12 giây, không được run tay.",
    type: "website",
    locale: "vi_VN",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Ấn Phong 13" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ấn Phong 13",
    description: "Một nét, 12 giây, không được run tay.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
