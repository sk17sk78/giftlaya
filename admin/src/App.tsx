import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import { LoginPage } from "@/pages/LoginPage";
import { CmsLayout } from "@/components/layout/CmsLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { AdminSettingsPage } from "@/pages/AdminSettingsPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { ProductsPage } from "@/pages/ProductsPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { HomepageBuilderPage } from "@/pages/HomepageBuilderPage";
import { PresetsGeoPage } from "@/pages/PresetsGeoPage";
import { CouponsPage } from "@/pages/CouponsPage";
import { CustomersPage } from "@/pages/CustomersPage";
import { PaymentsRefundsPage } from "@/pages/PaymentsRefundsPage";
import { SellersMarketplacePage } from "@/pages/SellersMarketplacePage";
import { ContentManagerPage } from "@/pages/ContentManagerPage";
import { MediaLibraryPage } from "@/pages/MediaLibraryPage";
import { InboxSupportPage } from "@/pages/InboxSupportPage";
import { MarketingAppPage } from "@/pages/MarketingAppPage";
import { SystemSettingsPage } from "@/pages/SystemSettingsPage";
import { ModulePlaceholderPage } from "@/pages/ModulePlaceholderPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/cms/login" element={<LoginPage />} />
                <Route path="/cms" element={<CmsLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="orders/*" element={<OrdersPage />} />
                  <Route path="manual-orders" element={<OrdersPage />} />
                  <Route path="calendar" element={<OrdersPage />} />
                  <Route path="payment-links" element={<OrdersPage />} />
                  <Route path="invoices" element={<OrdersPage />} />
                  <Route path="payments" element={<PaymentsRefundsPage />} />
                  <Route path="services/*" element={<ProductsPage />} />
                  <Route path="category/*" element={<CategoriesPage />} />
                  <Route path="presets/*" element={<PresetsGeoPage />} />
                  <Route path="coupons" element={<CouponsPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="page/homepage" element={<HomepageBuilderPage />} />
                  <Route path="page/header" element={<HomepageBuilderPage />} />
                  <Route path="page/footer" element={<HomepageBuilderPage />} />
                  <Route path="page/category" element={<CategoriesPage />} />
                  <Route path="page/mobile-categories" element={<CategoriesPage />} />
                  <Route path="page/dynamic-page" element={<ContentManagerPage />} />
                  <Route path="blog/*" element={<ContentManagerPage />} />
                  <Route path="recent-work/*" element={<ContentManagerPage />} />
                  <Route path="sitemap" element={<ContentManagerPage />} />
                  <Route path="reviews" element={<ContentManagerPage />} />
                  <Route path="images" element={<MediaLibraryPage />} />
                  <Route path="sellers" element={<SellersMarketplacePage />} />
                  <Route path="seller-requests" element={<SellersMarketplacePage />} />
                  <Route path="seller-products" element={<SellersMarketplacePage />} />
                  <Route path="seller-payouts" element={<SellersMarketplacePage />} />
                  <Route path="seller-categories" element={<CategoriesPage />} />
                  <Route path="seller-orders" element={<OrdersPage />} />
                  <Route path="seller-tickets" element={<InboxSupportPage />} />
                  <Route path="seller-audit" element={<AdminSettingsPage />} />
                  <Route path="franchise" element={<SellersMarketplacePage />} />
                  <Route path="vendors" element={<SellersMarketplacePage />} />
                  <Route path="vendor-requests" element={<SellersMarketplacePage />} />
                  <Route path="whatsapp/*" element={<InboxSupportPage />} />
                  <Route path="user/contact-forms" element={<InboxSupportPage />} />
                  <Route path="product-inquiries" element={<InboxSupportPage />} />
                  <Route path="support" element={<InboxSupportPage />} />
                  <Route path="email-management" element={<InboxSupportPage />} />
                  <Route path="ads/*" element={<MarketingAppPage />} />
                  <Route path="app/*" element={<MarketingAppPage />} />
                  <Route path="settings/*" element={<SystemSettingsPage />} />
                  <Route
                    path="admin-settings"
                    element={<AdminSettingsPage />}
                  />
                  <Route path="*" element={<ModulePlaceholderPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/cms" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

