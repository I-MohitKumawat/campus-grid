/**
 * app/layout.tsx
 *
 * Root layout for the CampusGrid Next.js application.
 * Wraps all pages with ClerkProvider for session management.
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | CampusGrid',
    default: 'CampusGrid — Your Campus, Connected',
  },
  description:
    'CampusGrid is the student platform for discovering clubs, attending events, building your campus profile, and connecting with peers.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    siteName: 'CampusGrid',
    locale: 'en_IN',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-white dark:bg-zinc-950">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
