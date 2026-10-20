import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'AllieTeam · 找搭子找队友',
  description: '发布一个局，找到同一时间、同一场合、玩得来的人。',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <div className="mx-auto min-h-screen w-full max-w-md pb-20">{children}</div>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
