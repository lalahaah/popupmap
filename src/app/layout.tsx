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
  metadataBase: new URL('https://popupmap-blush.vercel.app'),
  title: "팝업맵 | 전국 팝업스토어 실시간 지도",
  description: "성수동, 홍대, 한남동부터 전국 진행 중인 팝업스토어를 지도에서 한눈에. 마감 임박 정보까지 실시간으로 확인하세요.",
  openGraph: {
    title: "팝업맵 | 전국 팝업스토어 실시간 지도",
    description: "성수동, 홍대, 한남동부터 전국 진행 중인 팝업스토어를 지도에서 한눈에. 마감 임박 정보까지 실시간으로 확인하세요.",
    images: ['/og-image.png'],
    url: 'https://popupmap-blush.vercel.app',
    siteName: "팝업맵",
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "팝업맵 | 전국 팝업스토어 실시간 지도",
    description: "성수동, 홍대, 한남동부터 전국 진행 중인 팝업스토어를 지도에서 한눈에. 마감 임박 정보까지 실시간으로 확인하세요.",
    images: ['/og-image.png'],
  },
  verification: {
    google: "CPysx2ERXBLCxjoV6pZGsa7x2mGZsYrYnFiBQep4Buc"
  },
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
