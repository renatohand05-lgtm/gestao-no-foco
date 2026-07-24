import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { AppProviders } from "@/components/platform/app-providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { brandConfig, brandPalette } from "@/config/brand";
import { siteConfig } from "@/config/site";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: brandConfig.name,
    template: `%s | ${brandConfig.name}`,
  },
  description: brandConfig.subtitle,
  applicationName: brandConfig.name,
  keywords: [
    "Gestão",
    "plataforma",
    "ERP",
    "oficina",
    "vendas",
    "financeiro",
  ],
  authors: [{ name: brandConfig.name }],
  creator: brandConfig.name,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteConfig.url,
    siteName: brandConfig.name,
    title: brandConfig.name,
    description: brandConfig.subtitle,
  },
  twitter: {
    card: "summary",
    title: brandConfig.name,
    description: brandConfig.subtitle,
  },
  appleWebApp: {
    capable: true,
    title: brandConfig.name,
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brandPalette.graphite },
    { media: "(prefers-color-scheme: dark)", color: brandPalette.graphite },
  ],
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-gof-theme="light"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <TooltipProvider>
          <AppProviders>{children}</AppProviders>
        </TooltipProvider>
      </body>
    </html>
  );
}
