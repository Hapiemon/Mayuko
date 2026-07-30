import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mayuko Chat',
  description: 'みんなのチャットアプリ',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mayuko Chat',
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Mayuko Chat" />
        <meta name="theme-color" content="#7C3AED" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="icon" href="/icon.png" />
      </head>
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
