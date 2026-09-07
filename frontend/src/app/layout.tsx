import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import Providers from './providers';
import { GlobalNav } from '@/components/GlobalNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Powered ATS - Elite Hiring Platform',
  description: 'Enterprise AI-Driven Applicant Tracking System',
  icons: {
    icon: '/favicon.png?v=2',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50`}>
        <Providers>
          <GlobalNav />
          <main className="min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
