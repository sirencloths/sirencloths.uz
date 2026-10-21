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
import VisitorTracker from "@/components/VisitorTracker";
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
  title: { default: "PREVAILEN — Streetwear from Tashkent", template: "%s | PREVAILEN" },
  description: "PREVAILEN is a Tashkent streetwear store for clothing, accessories and new drops.",
  alternates: { canonical: absoluteUrl("/") },
  openGraph: { type: "website", url: absoluteUrl("/"), siteName: "PREVAILEN", title: "PREVAILEN — Streetwear from Tashkent", description: "Clothing, accessories and new drops from PREVAILEN." },
  twitter: { card: "summary", title: "PREVAILEN — Streetwear from Tashkent", description: "Clothing, accessories and new drops from PREVAILEN." },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={gilroy.variable}>
      <body>
        <LanguageProvider>
          <OverlayHistoryProvider><CustomerAuthProvider><FavoriteProvider><SearchProvider><CartProvider><MusicPlayerProvider><VisitorTracker /><SiteChrome />{children}<CartDrawer /><MobileBottomNav /><SiteTestNotice /></MusicPlayerProvider></CartProvider></SearchProvider></FavoriteProvider></CustomerAuthProvider></OverlayHistoryProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
