import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "My Assistant Donna · 나의 비서 도나",
  description: "개인 일정, 회사 업무, 프로젝트 할 일을 한곳에서 관리하는 개인 비서형 생산성 앱",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} h-full antialiased`}>
      <body className="min-h-full bg-neutral-50 font-sans text-black">{children}</body>
    </html>
  );
}
