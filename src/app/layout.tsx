import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

import { THEME_STORAGE_KEY } from "@/lib/theme";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "СпівДія — B2B платформа кооперації",
  description: "Платформа прямого обміну ресурсами між виробниками. Знайдіть партнерів для кооперації та закрийте дефіцити бізнесу.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning className={`${inter.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <Script id="spivdia-theme-init" strategy="beforeInteractive">
          {`(function(){try{var k=localStorage.getItem("${THEME_STORAGE_KEY}");var p=window.matchMedia("(prefers-color-scheme: dark)").matches;var d=k==="dark"||(k!=="light"&&p);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`}
        </Script>
        {children}
      </body>
    </html>
  );
}
