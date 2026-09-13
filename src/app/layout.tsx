import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "My Assistant Donna · 나의 비서 도나",
  description: "개인 일정, 회사 업무, 프로젝트 Task를 한곳에서 관리하는 개인 비서형 생산성 앱",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Without this, iOS/Android keep the layout viewport at its pre-keyboard size when
  // the on-screen keyboard opens, so fixed-position drawers/dialogs (inset-y-0, 100dvh)
  // get partially covered and their content can't scroll into view above the keyboard.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} h-full antialiased`}>
      <body className="min-h-full overflow-x-hidden bg-neutral-50 font-sans text-black">{children}</body>
    </html>
  );
}
