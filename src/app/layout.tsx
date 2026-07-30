import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mayuko Chat',
  description: 'みんなのチャットアプリ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
