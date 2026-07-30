import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { AppProviders } from "@/components/platform/app-providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { brandAssets, brandConfig, brandPalette } from "@/config/brand";
import { siteConfig } from "@/config/site";
import {
  GOF_THEME_DEFAULT,
  GOF_THEME_HTML_ATTR,
} from "@/lib/design-system/theme";

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
  description: siteConfig.description,
  applicationName: brandConfig.name,
  keywords: [
    "Gestão",
    "Gestão no Foco",
    "plataforma",
    "ERP",
    "oficina",
    "vendas",
    "financeiro",
    "estoque",
    "CRM",
    "BI",
  ],
  authors: [{ name: brandConfig.legalName }],
  creator: brandConfig.legalName,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: brandAssets.faviconSvg, type: "image/svg+xml" },
      { url: brandAssets.favicon32, sizes: "32x32", type: "image/png" },
      { url: brandAssets.favicon16, sizes: "16x16", type: "image/png" },
      { url: brandAssets.icon192, sizes: "192x192", type: "image/png" },
      { url: brandAssets.icon512, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: brandAssets.appleTouchIcon, sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteConfig.url,
    siteName: brandConfig.legalName,
    title: `${brandConfig.legalName} — ${brandConfig.subtitle}`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: brandConfig.legalName,
    description: brandConfig.positioning,
  },
  appleWebApp: {
    capable: true,
    title: brandConfig.name,
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brandPalette.navy },
    { media: "(prefers-color-scheme: dark)", color: brandPalette.navy },
  ],
  colorScheme: "dark light",
};

const themeBootScript = `
(function(){
  try {
    var k="gof-theme-preference";
    var pref=localStorage.getItem(k)||"${GOF_THEME_DEFAULT}";
    var dark=true;
    if(pref==="light") dark=false;
    else if(pref==="dark") dark=true;
    else if(pref==="system") dark=window.matchMedia("(prefers-color-scheme: dark)").matches;
    var mode=dark?"dark":"light";
    var el=document.documentElement;
    el.setAttribute("${GOF_THEME_HTML_ATTR}", mode);
    el.classList.toggle("dark", dark);
    el.style.colorScheme=mode;
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-gof-theme={GOF_THEME_DEFAULT}
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full dark`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <TooltipProvider>
          <AppProviders>{children}</AppProviders>
        </TooltipProvider>
      </body>
    </html>
  );
}
