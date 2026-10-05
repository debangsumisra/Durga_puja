import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import '@photo-sphere-viewer/core/index.css';
import './globals.css';

const display = Playfair_Display({ subsets: ['latin'], variable: '--font-display', weight: ['600', '700', '800'] });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'PujoPulse 2026 — Kolkata Pandal Hopping Guide',
  description:
    'Plan the perfect Durga Puja pandal-hopping route in Kolkata: zone clusters, crowd-aware timings, metro/bus/taxi costs, nearby food & stays, and 360° virtual pandal tours.',
};

export const viewport: Viewport = { themeColor: '#140b08', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-ink-900 font-sans text-stone-100 antialiased">{children}</body>
    </html>
  );
}
