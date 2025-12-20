import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import { Toaster } from "sonner";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AppTVN - Gestionale Aziendale",
  description: "Gestionale completo per la tua azienda",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AppTVN',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#059669',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakarta.className}>
      <body className="antialiased">
        <ScrollToTop />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
