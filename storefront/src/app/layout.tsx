import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Nunito } from "next/font/google";
import "@/styles/globals.css";

import { UIProvider } from "@/context/UIContext";
import { CityProvider } from "@/context/CityContext";
import { CartProvider } from "@/context/CartContext";

import { SiteChrome } from "@/components/layout/SiteChrome";
import { CityModal } from "@/components/layout/CityModal";
import { SearchModal } from "@/components/layout/SearchModal";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { AuthModal } from "@/components/layout/AuthModal";

import { api } from "@/services/api";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  DEFAULT_DESCRIPTION,
  HOME_TITLE,
  buildLocalBusinessJsonLd,
  getBaseUrl,
} from "@/lib/seo";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: DEFAULT_DESCRIPTION,
  metadataBase: new URL(getBaseUrl()),
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#9b1b45",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [megaMenu, cities, siteSettings] = await Promise.all([
    api.getMegaMenu(),
    api.getCities(),
    api.getPublicSettings(),
  ]);

  return (
    <html lang="en" className={`${jakarta.variable} ${nunito.variable}`}>
      <body className="min-h-screen flex flex-col font-sans antialiased text-[#111827] bg-white selection:bg-[#f6bdce] selection:text-[#7e1538]">
        <JsonLd data={buildLocalBusinessJsonLd()} />
        <UIProvider>
          <CityProvider>
            <CartProvider>
              <SiteChrome
                topStripEnabled={siteSettings.header_config?.top_strip_enabled}
                headerConfig={siteSettings.header_config}
                footerConfig={siteSettings.footer_config}
                megaMenu={megaMenu}
                cities={cities}
              >
                {children}
              </SiteChrome>

              {/* Interactive Modals & Drawers */}
              <CityModal cities={cities} />
              <SearchModal />
              <CartDrawer />
              <AuthModal />
            </CartProvider>
          </CityProvider>
        </UIProvider>
      </body>
    </html>
  );
}
