import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { LanguageProvider } from "@/components/LanguageProvider";
import { SearchProvider } from "@/components/SearchProvider";
import { FavoriteProvider } from "@/components/FavoriteContext";
import MobileBottomNav from "@/components/MobileBottomNav";
import CartDrawer from "@/components/CartDrawer";
import { CustomerAuthProvider } from "@/components/CustomerAuthProvider";
import { MusicPlayerProvider } from "@/components/MusicPlayer";

const gilroy = localFont({
  src: "../public/fonts/Gilroy-Extrabold.ttf",
  weight: "800",
  style: "normal",
  display: "swap",
  variable: "--font-gilroy",
});

export const metadata: Metadata = {
  title: "SIREN",
  description: "SIREN — новая коллекция одежды, аксессуаров и мерча.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={gilroy.variable}>
      <body>
        <LanguageProvider>
          <FavoriteProvider><SearchProvider><CustomerAuthProvider><CartProvider><MusicPlayerProvider>{children}<CartDrawer /><MobileBottomNav /><aside className="site-test-notice" role="status">САЙТ ТЕСТИРУЕТСЯ</aside></MusicPlayerProvider></CartProvider></CustomerAuthProvider></SearchProvider></FavoriteProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
