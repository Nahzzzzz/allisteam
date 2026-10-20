import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { BottomNav, DesktopNav } from '@/components/bottom-nav';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'AllieTeam · 找搭子找队友',
  description: '发布一个局，找到同一时间、同一场合、玩得来的人。',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#08090a',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <div className="mx-auto flex min-h-dvh w-full max-w-md md:max-w-5xl">
            <DesktopNav />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
