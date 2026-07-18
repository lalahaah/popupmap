import type { Metadata } from "next";
import { Archivo_Black, IBM_Plex_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const display = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});
const mono = IBM_Plex_Mono({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});
const body = Noto_Sans_KR({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "팝업맵 — 지금 열려있는 팝업만",
  description: "전국 팝업스토어 오픈/마감 일정을 지도로 확인하세요.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={`${display.variable} ${mono.variable} ${body.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
