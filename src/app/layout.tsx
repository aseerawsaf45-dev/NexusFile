import '@/styles/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NexusFile - High-Performance Automated File Management & Storage Studio',
  description: 'Intelligent real-time file organization, deep storage analysis, and multi-tier disk cleaning for Windows.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased selection:bg-brand-500/30 selection:text-brand-200">
        {children}
      </body>
    </html>
  );
}
