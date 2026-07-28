import type { Metadata, Viewport } from "next";
import { bancoBrand, bancoCssVariables, bancoGoogleFontsUrl } from "@workspace/design-tokens";
import { SearchAnalyticsBootstrap } from "../components/SearchAnalyticsBootstrap";
import { ApiClientBootstrap } from "../components/ApiClientBootstrap";
import { ClerkAppProvider } from "../components/ClerkAppProvider";
import { SiteChrome } from "../components/SiteChrome";
import { SkipToMain } from "../components/SkipToMain";
import { JsonLd } from "../components/JsonLd";
import { websiteJsonLd } from "../lib/structured-data";
import {
  buildCanonicalUrl,
  buildHreflangAlternates,
  PRIMARY_LOCALE,
  SITE_HTML_DIR,
  SITE_HTML_LANG,
} from "../lib/site-i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BANCO — سيارات وعقارات وصناعي",
    template: "%s | BANCO",
  },
  description: "تصفّح سيارات وعقارات ومنشآت صناعية في مصر — موقع BANCO التكميلي",
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  alternates: {
    canonical: buildCanonicalUrl("/"),
    languages: buildHreflangAlternates("/"),
  },
  openGraph: {
    locale: PRIMARY_LOCALE.replace("-", "_"),
    alternateLocale: ["en_US"],
    type: "website",
    url: buildCanonicalUrl("/"),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: bancoBrand.red,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={SITE_HTML_LANG} dir={SITE_HTML_DIR}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: bancoCssVariables }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link href={bancoGoogleFontsUrl} rel="stylesheet" />
      </head>
      <body>
        <SkipToMain />
        <JsonLd data={websiteJsonLd()} />
        <ClerkAppProvider>
          <ApiClientBootstrap>
            <SearchAnalyticsBootstrap />
            <SiteChrome>{children}</SiteChrome>
          </ApiClientBootstrap>
        </ClerkAppProvider>
      </body>
    </html>
  );
}
