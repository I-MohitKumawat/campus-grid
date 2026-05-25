/**
 * app/layout.jsx
 *
 * Root layout for the CampusGrid Next.js application.
 */

import './globals.css';
import ThemeProvider from '@/components/layout/ThemeProvider';

export const metadata = {
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased scroll-smooth scroll-pt-20" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-white dark:bg-zinc-950">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
