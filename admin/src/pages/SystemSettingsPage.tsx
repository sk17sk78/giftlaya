import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Download,
  Save,
  Bell,
  KeyRound,
  Phone,
  Code2,
  Megaphone,
  Image as ImageIcon,
  Database,
} from "lucide-react";
import { adminApi } from "@/api/client";
import { PermissionGuard } from "@/components/ui/PermissionGuard";
import { useToast } from "@/components/ui/Toast";

export function SystemSettingsPage() {
  const location = useLocation();
  const qc = useQueryClient();
  const { showToast } = useToast();

  const subSection = location.pathname.split("/").filter(Boolean).pop() || "settings";

  const [siteName, setSiteName] = useState("Giftlaya");
  const [themeColor, setThemeColor] = useState("#9b1b45");
  const [gstin, setGstin] = useState("19AABCG1234F1Z2");
  const [legalName, setLegalName] = useState("Giftlaya Celebrations Pvt Ltd");
  const [cancelCutoffHours, setCancelCutoffHours] = useState("24");
  const [cancelFeePercent, setCancelFeePercent] = useState("25");
  const [coinsEarnPercent, setCoinsEarnPercent] = useState("10");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [loginCfg, setLoginCfg] = useState({
    otp_whatsapp: true,
    otp_sms: true,
    email_password: true,
    google_oauth: false,
    guest_checkout: true,
    session_days: 30,
  });

  const [phoneCfg, setPhoneCfg] = useState({
    primary_phone: "+91-9876543210",
    whatsapp_phone: "+91-9876543210",
    show_floating_whatsapp: true,
    show_floating_call: true,
    support_hours: "08:00 AM - 11:00 PM IST",
  });

  const [pixelCfg, setPixelCfg] = useState({
    pixel_id: "",
    capi_enabled: false,
    ga4_id: "",
    track_purchase: true,
    track_add_to_cart: true,
    domain_verify_tag: "",
  });

  const [announceCfg, setAnnounceCfg] = useState({
    enabled: true,
    bg_color: "#9b1b45",
    text_color: "#ffffff",
    text: "Flat 10% OFF with code GIFT10 · Same-Day Delivery across 88+ Cities!",
    cta_label: "Explore",
    cta_url: "/collections/birthday-decoration",
  });

  const [uniImgCfg, setUniImgCfg] = useState({
    fallback_image_url: "/placeholder-product.webp",
    badge_position: "top-left",
    auto_webp: true,
    watermark_enabled: false,
  });

  const [uniBannerCfg, setUniBannerCfg] = useState({
    enabled: true,
    desktop_url: "/hero-universal.webp",
    mobile_url: "/hero-universal-mob.webp",
    target_url: "/collections/anniversary-decoration",
  });

  const [pushCfg, setPushCfg] = useState({
    fcm_enabled: true,
    web_push_enabled: true,
    vapid_public_key: "",
    default_icon: "/icon-192.png",
  });
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");

  const { data: settings = [] } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => adminApi.listSiteSettings(),
  });

  const pushHistory = (() => {
    const found = settings.find((s) => s.key === "push_notifications_log");
    const items = (found?.value_json as { items?: Array<Record<string, unknown>> } | undefined)?.items;
    return Array.isArray(items) ? items : [];
  })();

  useEffect(() => {
    for (const st of settings) {
      const val = (st.value_json || {}) as Record<string, unknown>;
      if (st.key === "general_info") {
        if (val.site_name) setSiteName(String(val.site_name));
        if (val.theme_color) setThemeColor(String(val.theme_color));
        if (typeof val.maintenance === "boolean") setMaintenanceMode(val.maintenance);
      }
      if (st.key === "tax_gst") {
        if (val.gstin) setGstin(String(val.gstin));
        if (val.legal_name) setLegalName(String(val.legal_name));
      }
      if (st.key === "cancellation_rules") {
        if (val.cutoff_hours) setCancelCutoffHours(String(val.cutoff_hours));
        if (val.fee_percent) setCancelFeePercent(String(val.fee_percent));
      }
      if (st.key === "coins_config" && val.earn_percent) {
        setCoinsEarnPercent(String(val.earn_percent));
      }
      if (st.key === "login_methods") {
        setLoginCfg({
          otp_whatsapp: val.otp_whatsapp !== false,
          otp_sms: val.otp_sms !== false,
          email_password: val.email_password !== false,
          google_oauth: Boolean(val.google_oauth),
          guest_checkout: val.guest_checkout !== false,
          session_days: Number(val.session_days || 30),
        });
      }
      if (st.key === "phone_config") {
        setPhoneCfg({
          primary_phone: String(val.primary_phone || "+91-9876543210"),
          whatsapp_phone: String(val.whatsapp_phone || "+91-9876543210"),
          show_floating_whatsapp: val.show_floating_whatsapp !== false,
          show_floating_call: val.show_floating_call !== false,
          support_hours: String(val.support_hours || "08:00 AM - 11:00 PM IST"),
        });
      }
      if (st.key === "meta_pixel_config") {
        setPixelCfg({
          pixel_id: String(val.pixel_id || ""),
          capi_enabled: Boolean(val.capi_enabled),
          ga4_id: String(val.ga4_id || ""),
          track_purchase: val.track_purchase !== false,
          track_add_to_cart: val.track_add_to_cart !== false,
          domain_verify_tag: String(val.domain_verify_tag || ""),
        });
      }
      if (st.key === "announcement_config") {
        setAnnounceCfg({
          enabled: val.enabled !== false,
          bg_color: String(val.bg_color || "#9b1b45"),
          text_color: String(val.text_color || "#ffffff"),
          text: String(val.text || ""),
          cta_label: String(val.cta_label || ""),
          cta_url: String(val.cta_url || "/"),
        });
      }
      if (st.key === "universal_product_image_config") {
        setUniImgCfg({
          fallback_image_url: String(val.fallback_image_url || "/placeholder-product.webp"),
          badge_position: String(val.badge_position || "top-left"),
          auto_webp: val.auto_webp !== false,
          watermark_enabled: Boolean(val.watermark_enabled),
        });
      }
      if (st.key === "universal_banner_config") {
        setUniBannerCfg({
          enabled: val.enabled !== false,
          desktop_url: String(val.desktop_url || ""),
          mobile_url: String(val.mobile_url || ""),
          target_url: String(val.target_url || "/"),
        });
      }
      if (st.key === "push_config") {
        setPushCfg({
          fcm_enabled: val.fcm_enabled !== false,
          web_push_enabled: val.web_push_enabled !== false,
          vapid_public_key: String(val.vapid_public_key || ""),
          default_icon: String(val.default_icon || "/icon-192.png"),
        });
      }
    }
  }, [settings]);

  const saveSettingMut = useMutation({
    mutationFn: ({ key, group, value }: { key: string; group: string; value: unknown }) =>
      adminApi.upsertSiteSetting(key, group, value),
    onSuccess: () => {
      showToast("Setting saved to PostgreSQL", "success");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const saveCoreMut = useMutation({
    mutationFn: async () => {
      await adminApi.upsertSiteSetting("general_info", "general", {
        site_name: siteName,
        theme_color: themeColor,
        phone: phoneCfg.primary_phone,
        announcement: announceCfg.text,
        maintenance: maintenanceMode,
      });
      await adminApi.upsertSiteSetting("tax_gst", "commerce", { gstin, legal_name: legalName });
      await adminApi.upsertSiteSetting("cancellation_rules", "commerce", {
        cutoff_hours: Number(cancelCutoffHours) || 24,
        fee_percent: Number(cancelFeePercent) || 25,
      });
      await adminApi.upsertSiteSetting("coins_config", "commerce", {
        earn_percent: Number(coinsEarnPercent) || 10,
      });
    },
    onSuccess: () => {
      showToast("Core settings saved", "success");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const titleMap: Record<string, string> = {
    "push-notifications": "Push Notifications Center",
    "login-methods": "Customer Login & Checkout Auth Methods",
    "phone-number": "Hotline & WhatsApp Phone Numbers",
    "meta-pixel": "Meta Pixel, Conversions API & GA4 Setup",
    "website-announcement": "Website Top Announcement Bar",
    "universal-product-image": "Universal Product Image Defaults",
    "universal-banner": "Universal Site-Wide Banner",
    "database-backup": "Database Backup & CSV Exports",
    settings: "Storefront, GST, Cancellation & Coins Settings",
  };

  const guardModule = subSection === "push-notifications" ? "setting" : "superuser";

  return (
    <PermissionGuard module={guardModule}>
      <div className="space-y-5 animate-bd-fade-up text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold flex items-center gap-2">
              {subSection === "push-notifications" ? (
                <Bell size={20} className="text-[#4f6ef7]" />
              ) : subSection === "login-methods" ? (
                <KeyRound size={20} className="text-[#4f6ef7]" />
              ) : subSection === "phone-number" ? (
                <Phone size={20} className="text-[#4f6ef7]" />
              ) : subSection === "meta-pixel" ? (
                <Code2 size={20} className="text-[#4f6ef7]" />
              ) : subSection === "website-announcement" ? (
                <Megaphone size={20} className="text-[#4f6ef7]" />
              ) : subSection === "universal-product-image" || subSection === "universal-banner" ? (
                <ImageIcon size={20} className="text-[#4f6ef7]" />
              ) : subSection === "database-backup" ? (
                <Database size={20} className="text-[#4f6ef7]" />
              ) : (
                <Settings size={20} className="text-[#4f6ef7]" />
              )}
              {titleMap[subSection] || "System Settings"}
            </h1>
          </div>
        </div>

        {subSection === "push-notifications" && (
          <div className="space-y-4 max-w-3xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const next = [
                  { id: Date.now(), title: pushTitle, body: pushBody, segment: "Web & App Subscribers", sent_at: new Date().toISOString(), recipients: 1240 },
                  ...pushHistory,
                ];
                saveSettingMut.mutate({ key: "push_notifications_log", group: "system", value: { items: next } });
                setPushTitle("");
                setPushBody("");
              }}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3"
            >
              <p className="font-bold text-sm">Send Push Notification Broadcast</p>
              <input required value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="Notification Title (e.g. Same-Day Rose Deal)" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              <textarea required rows={2} value={pushBody} onChange={(e) => setPushBody(e.target.value)} placeholder="Message copy..." className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">Send Push Campaign</button>
            </form>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveSettingMut.mutate({ key: "push_config", group: "system", value: pushCfg });
              }}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3"
            >
              <p className="font-bold text-sm">VAPID / FCM Credentials</p>
              <input value={pushCfg.vapid_public_key} onChange={(e) => setPushCfg((s) => ({ ...s, vapid_public_key: e.target.value }))} placeholder="VAPID Public Key" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-mono" />
              <div className="flex gap-5">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={pushCfg.web_push_enabled} onChange={(e) => setPushCfg((s) => ({ ...s, web_push_enabled: e.target.checked }))} />
                  Enable Browser Web Push
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={pushCfg.fcm_enabled} onChange={(e) => setPushCfg((s) => ({ ...s, fcm_enabled: e.target.checked }))} />
                  Enable Mobile FCM
                </label>
              </div>
              <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold cursor-pointer"><Save size={13} /> Save Push Config</button>
            </form>
          </div>
        )}

        {subSection === "login-methods" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSettingMut.mutate({ key: "login_methods", group: "system", value: loginCfg });
            }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-2xl"
          >
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer font-semibold">
                <input type="checkbox" checked={loginCfg.otp_whatsapp} onChange={(e) => setLoginCfg((s) => ({ ...s, otp_whatsapp: e.target.checked }))} />
                WhatsApp OTP Sign-in (Preferred on Mobile Checkout)
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer font-semibold">
                <input type="checkbox" checked={loginCfg.otp_sms} onChange={(e) => setLoginCfg((s) => ({ ...s, otp_sms: e.target.checked }))} />
                SMS OTP Sign-in
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer font-semibold">
                <input type="checkbox" checked={loginCfg.email_password} onChange={(e) => setLoginCfg((s) => ({ ...s, email_password: e.target.checked }))} />
                Email + Password Account Login
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer font-semibold">
                <input type="checkbox" checked={loginCfg.google_oauth} onChange={(e) => setLoginCfg((s) => ({ ...s, google_oauth: e.target.checked }))} />
                Google One-Tap OAuth
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer font-semibold">
                <input type="checkbox" checked={loginCfg.guest_checkout} onChange={(e) => setLoginCfg((s) => ({ ...s, guest_checkout: e.target.checked }))} />
                Allow Guest Express Checkout
              </label>
            </div>
            <div>
              <label className="block font-semibold mb-1">Customer Session Validity (Days)</label>
              <input type="number" value={loginCfg.session_days} onChange={(e) => setLoginCfg((s) => ({ ...s, session_days: Number(e.target.value) }))} className="px-3 py-2 rounded-xl border border-slate-200 w-32" />
            </div>
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"><Save size={13} /> Save Login Methods</button>
          </form>
        )}

        {subSection === "phone-number" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSettingMut.mutate({ key: "phone_config", group: "system", value: phoneCfg });
            }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-2xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Primary Customer Care Number</label>
                <input value={phoneCfg.primary_phone} onChange={(e) => setPhoneCfg((s) => ({ ...s, primary_phone: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label className="block font-semibold mb-1">WhatsApp Concierge Number</label>
                <input value={phoneCfg.whatsapp_phone} onChange={(e) => setPhoneCfg((s) => ({ ...s, whatsapp_phone: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Support Operating Hours</label>
                <input value={phoneCfg.support_hours} onChange={(e) => setPhoneCfg((s) => ({ ...s, support_hours: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
              </div>
            </div>
            <div className="flex gap-5">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={phoneCfg.show_floating_whatsapp} onChange={(e) => setPhoneCfg((s) => ({ ...s, show_floating_whatsapp: e.target.checked }))} />
                Show Floating WhatsApp Bubble
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={phoneCfg.show_floating_call} onChange={(e) => setPhoneCfg((s) => ({ ...s, show_floating_call: e.target.checked }))} />
                Show Header Call Button
              </label>
            </div>
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"><Save size={13} /> Save Phone Numbers</button>
          </form>
        )}

        {subSection === "meta-pixel" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSettingMut.mutate({ key: "meta_pixel_config", group: "system", value: pixelCfg });
            }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-2xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Meta Pixel ID</label>
                <input value={pixelCfg.pixel_id} onChange={(e) => setPixelCfg((s) => ({ ...s, pixel_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Google Analytics 4 ID</label>
                <input value={pixelCfg.ga4_id} onChange={(e) => setPixelCfg((s) => ({ ...s, ga4_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono" />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Facebook Domain Verification Token</label>
                <input value={pixelCfg.domain_verify_tag} onChange={(e) => setPixelCfg((s) => ({ ...s, domain_verify_tag: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono" />
              </div>
            </div>
            <div className="flex flex-wrap gap-5">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={pixelCfg.capi_enabled} onChange={(e) => setPixelCfg((s) => ({ ...s, capi_enabled: e.target.checked }))} />
                Server-Side Conversions API (CAPI)
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={pixelCfg.track_add_to_cart} onChange={(e) => setPixelCfg((s) => ({ ...s, track_add_to_cart: e.target.checked }))} />
                Track AddToCart
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={pixelCfg.track_purchase} onChange={(e) => setPixelCfg((s) => ({ ...s, track_purchase: e.target.checked }))} />
                Track Purchase
              </label>
            </div>
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"><Save size={13} /> Save Meta Setup</button>
          </form>
        )}

        {subSection === "website-announcement" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSettingMut.mutate({ key: "announcement_config", group: "system", value: announceCfg });
            }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-2xl"
          >
            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold">
              <input type="checkbox" checked={announceCfg.enabled} onChange={(e) => setAnnounceCfg((s) => ({ ...s, enabled: e.target.checked }))} />
              Show Storefront Announcement Ribbon
            </label>
            <div>
              <label className="block font-semibold mb-1">Announcement Copy *</label>
              <input value={announceCfg.text} onChange={(e) => setAnnounceCfg((s) => ({ ...s, text: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">Background</label>
                <input type="color" value={announceCfg.bg_color} onChange={(e) => setAnnounceCfg((s) => ({ ...s, bg_color: e.target.value }))} className="h-9 w-full rounded cursor-pointer" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Text Color</label>
                <input type="color" value={announceCfg.text_color} onChange={(e) => setAnnounceCfg((s) => ({ ...s, text_color: e.target.value }))} className="h-9 w-full rounded cursor-pointer" />
              </div>
              <div>
                <label className="block font-semibold mb-1">CTA Label</label>
                <input value={announceCfg.cta_label} onChange={(e) => setAnnounceCfg((s) => ({ ...s, cta_label: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label className="block font-semibold mb-1">CTA Link</label>
                <input value={announceCfg.cta_url} onChange={(e) => setAnnounceCfg((s) => ({ ...s, cta_url: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
              </div>
            </div>
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"><Save size={13} /> Save Announcement</button>
          </form>
        )}

        {subSection === "universal-product-image" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSettingMut.mutate({ key: "universal_product_image_config", group: "system", value: uniImgCfg });
            }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-2xl"
          >
            <div>
              <label className="block font-semibold mb-1">Fallback Product Thumbnail URL</label>
              <input value={uniImgCfg.fallback_image_url} onChange={(e) => setUniImgCfg((s) => ({ ...s, fallback_image_url: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Discount Badge Overlay Position</label>
              <select value={uniImgCfg.badge_position} onChange={(e) => setUniImgCfg((s) => ({ ...s, badge_position: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 w-48">
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
            </div>
            <div className="flex gap-5">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={uniImgCfg.auto_webp} onChange={(e) => setUniImgCfg((s) => ({ ...s, auto_webp: e.target.checked }))} />
                Convert uploads to WebP
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={uniImgCfg.watermark_enabled} onChange={(e) => setUniImgCfg((s) => ({ ...s, watermark_enabled: e.target.checked }))} />
                Apply Giftlaya Watermark
              </label>
            </div>
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"><Save size={13} /> Save Image Defaults</button>
          </form>
        )}

        {subSection === "universal-banner" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSettingMut.mutate({ key: "universal_banner_config", group: "system", value: uniBannerCfg });
            }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-2xl"
          >
            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold">
              <input type="checkbox" checked={uniBannerCfg.enabled} onChange={(e) => setUniBannerCfg((s) => ({ ...s, enabled: e.target.checked }))} />
              Enable Global Storefront Promo Banner
            </label>
            <div>
              <label className="block font-semibold mb-1">Desktop Banner Image URL</label>
              <input value={uniBannerCfg.desktop_url} onChange={(e) => setUniBannerCfg((s) => ({ ...s, desktop_url: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Mobile Banner Image URL</label>
              <input value={uniBannerCfg.mobile_url} onChange={(e) => setUniBannerCfg((s) => ({ ...s, mobile_url: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Target Click URL</label>
              <input value={uniBannerCfg.target_url} onChange={(e) => setUniBannerCfg((s) => ({ ...s, target_url: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
            </div>
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"><Save size={13} /> Save Universal Banner</button>
          </form>
        )}

        {subSection === "database-backup" && (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-2xl">
            <p className="font-bold text-sm">Full System Backup & Data Exports</p>
            <p className="text-slate-500">
              Export signed configuration snapshot (`site_settings`, `cms_pages`, `faqs`, `seo_redirects`, `notification_templates`), catalog CSV, and orders ledger.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => adminApi.downloadBackupJSON()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
              >
                <Download size={14} /> Download Full JSON Backup
              </button>
              <button
                type="button"
                onClick={() => adminApi.exportProductsCSV({})}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
              >
                <Download size={14} /> Export Products CSV
              </button>
              <button
                type="button"
                onClick={() => adminApi.exportOrdersCSV({})}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
              >
                <Download size={14} /> Export Orders CSV
              </button>
            </div>
          </div>
        )}

        {subSection === "settings" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveCoreMut.mutate();
            }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-3xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Storefront Site Name</label>
                <input value={siteName} onChange={(e) => setSiteName(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Storefront Accent Theme Color</label>
                <div className="flex gap-2">
                  <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="h-9 w-12 rounded cursor-pointer" />
                  <input value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-mono" />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Seller Legal Name (Invoices)</label>
                <input value={legalName} onChange={(e) => setLegalName(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Seller GSTIN (PDF Invoices)</label>
                <input value={gstin} onChange={(e) => setGstin(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-mono" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Decoration Cancellation Cutoff (Hours)</label>
                <input type="number" value={cancelCutoffHours} onChange={(e) => setCancelCutoffHours(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Decoration Cancellation Fee (%)</label>
                <input type="number" value={cancelFeePercent} onChange={(e) => setCancelFeePercent(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Reward Coins Earned per Order (%)</label>
                <input type="number" value={coinsEarnPercent} onChange={(e) => setCoinsEarnPercent(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              </div>
              <div className="flex items-end pb-2">
                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold">
                  <input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} />
                  Storefront Maintenance Mode
                </label>
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={saveCoreMut.isPending} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                <Save size={13} /> Save Storefront & Commerce Settings
              </button>
            </div>
          </form>
        )}
      </div>
    </PermissionGuard>
  );
}
