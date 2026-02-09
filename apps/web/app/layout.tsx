import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Companion System',
  description: 'Offline-first deterministic assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
