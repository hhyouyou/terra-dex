import type { Metadata } from 'next';
import Link from 'next/link';
import { Leaf } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '地球online图鉴',
    template: '%s | 地球online图鉴',
  },
  description: '拍照、识图、记录你的自然图鉴',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <header className="sticky top-0 z-50 border-b border-border bg-background">
          <nav className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
            <Link
              href="/"
              className="flex items-center gap-2 font-serif text-lg font-bold"
            >
              <Leaf className="size-5 text-primary" />
              <span>地球online图鉴</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                首页
              </Link>
              <Link
                href="/codex"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                图鉴
              </Link>
              <Link
                href="/map"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                地图
              </Link>
            </div>
          </nav>
        </header>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
