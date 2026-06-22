import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "스크립트 체인 — 콘텐츠 세계관 지식 그래프",
  description: "드라마, 영화, 소설의 인물·키워드·감성을 연결하는 인터랙티브 시맨틱 지식 그래프 플랫폼",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const enableAdSense = process.env.NEXT_PUBLIC_ENABLE_ADSENSE === 'true';
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-1234567890123456';

  return (
    <html lang="ko" className="h-full">
      <head>
        {enableAdSense && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body className="min-h-full flex flex-col bg-white text-gray-900">{children}</body>
    </html>
  );
}
