import type { Metadata } from "next";
import "./globals.css";
import AppProviders from "./components/AppProviders";

export const metadata: Metadata = {
  title: "HomeBase",
  description: "Structure your wellbeing, growth, and connections",
  manifest: "/manifest.json",
  themeColor: "#111827",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HomeBase",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#111827" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HomeBase" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
