import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '跟名人合影！ | mingren.pics',
  description: '上传自拍，选择名人，3秒生成合影！Pop Art风格的AI合影神器。',
  keywords: ['名人合影', 'AI合影', '明星合影', 'AI生成', 'gpt-image', 'pop art'],
  openGraph: {
    title: '跟名人合影！ | mingren.pics',
    description: '上传自拍，选择名人，3秒生成合影！',
    type: 'website',
    url: 'https://mingren.pics',
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
