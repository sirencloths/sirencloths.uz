import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./header-mobile.css";
import "./home-mobile.css";
import "./search-ui.css";
import { CartProvider } from "@/components/CartContext";
import { LanguageProvider } from "@/components/LanguageProvider";
import { SearchProvider } from "@/components/SearchProvider";
import { FavoriteProvider } from "@/components/FavoriteContext";
import MobileBottomNav from "@/components/MobileBottomNav";
import CartDrawer from "@/components/CartDrawer";
import { CustomerAuthProvider } from "@/components/CustomerAuthProvider";
import { MusicPlayerProvider } from "@/components/MusicPlayer";
import { OverlayHistoryProvider } from "@/components/OverlayHistoryProvider";
import SiteChrome from "@/components/SiteChrome";
import SiteTestNotice from "@/components/SiteTestNotice";
import { absoluteUrl, siteUrl } from "@/lib/seo";

const gilroy = localFont({
  src: "../public/fonts/Gilroy-Extrabold.ttf",
  weight: "800",
  style: "normal",
  display: "swap",
  variable: "--font-gilroy",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "SIREN — Streetwear from Tashkent", template: "%s | SIREN" },
  description: "SIREN is a Tashkent streetwear store for clothing, accessories and new drops.",
  alternates: { canonical: absoluteUrl("/") },
  openGraph: { type: "website", url: absoluteUrl("/"), siteName: "SIREN", title: "SIREN — Streetwear from Tashkent", description: "Clothing, accessories and new drops from SIREN." },
  twitter: { card: "summary", title: "SIREN — Streetwear from Tashkent", description: "Clothing, accessories and new drops from SIREN." },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={gilroy.variable}>
      <body>
        <LanguageProvider>
          <FavoriteProvider><OverlayHistoryProvider><CustomerAuthProvider><SearchProvider><CartProvider><MusicPlayerProvider><SiteChrome />{children}<CartDrawer /><MobileBottomNav /><SiteTestNotice /></MusicPlayerProvider></CartProvider></SearchProvider></CustomerAuthProvider></OverlayHistoryProvider></FavoriteProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
