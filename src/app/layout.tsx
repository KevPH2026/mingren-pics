import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://mingren.pics'),
  title: '跟名人合影！ | mingren.pics',
  description: '上传自拍，选择名人，3秒生成合影！Pop Art风格的AI合影神器。',
  keywords: ['名人合影', 'AI合影', '明星合影', 'AI生成', 'gpt-image', 'pop art', 'celebrity selfie'],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: '跟名人合影！ | mingren.pics',
    description: '上传自拍，选择名人，3秒生成合影！30+国际名人，Pop Art风格。',
    type: 'website',
    url: 'https://mingren.pics',
    siteName: 'mingren.pics',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'mingren.pics — AI名人合影神器',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '跟名人合影！ | mingren.pics',
    description: '上传自拍，选择名人，3秒生成合影！30+国际名人，Pop Art风格。',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
  },
  alternates: {
    canonical: 'https://mingren.pics',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#f5e6d3] text-black min-h-dvh">
        {children}
      </body>
    </html>
  );
}
