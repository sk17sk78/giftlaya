import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone,
  Smartphone,
  Plus,
  Save,
  BarChart3,
  Users,
  ShoppingBag,
  Sliders,
  Bell,
  Download,
} from "lucide-react";
import { adminApi, API_BASE_URL, type MetaAdsCampaign } from "@/api/client";
import { useToast } from "@/components/ui/Toast";

type AudienceItem = { id?: number; name: string; type: string; size_est: number; status: string };
type RuleItem = { id?: number; name: string; condition: string; action: string; enabled: boolean };

export function MarketingAppPage() {
  const location = useLocation();
  const qc = useQueryClient();
  const { showToast } = useToast();

  const p = location.pathname;
  const isAds = p.includes("/ads");
  const subRoute = p.split("/").filter(Boolean).pop() || (isAds ? "ads" : "home");

  const [extId, setExtId] = useState("");
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("CONVERSIONS");
  const [budgetRs, setBudgetRs] = useState("1500");

  const [audName, setAudName] = useState("");
  const [audType, setAudType] = useState("Custom");
  const [audSize, setAudSize] = useState("5000");

  const [ruleName, setRuleName] = useState("");
  const [ruleCond, setRuleCond] = useState("CPA > INR 450");
  const [ruleAction, setRuleAction] = useState("Pause Ad Set");

  const [catalogCfg, setCatalogCfg] = useState({
    feed_enabled: true,
    sync_frequency: "hourly",
    exclude_out_of_stock: true,
  });

  const [appConfig, setAppConfig] = useState({
    maintenance: false,
    min_version_android: "2.4.0",
    min_version_ios: "2.4.0",
    force_update: false,
    play_store_url: "",
    app_store_url: "",
  });

  const [appHome, setAppHome] = useState({
    home_banner_text: "Book Same-Day Decor in 60 Seconds",
    show_story_strip: true,
    sections_csv: "hero, quick_cats, trending_decor, cakes_flowers, recent_works",
  });

  const [appCats, setAppCats] = useState({
    layout: "grid_4",
    featured_slugs_csv: "birthday-decoration, anniversary-decoration, cakes, flowers, plants",
  });

  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushSegment, setPushSegment] = useState("All Mobile Subscribers");

  const { data: campaigns = [] } = useQuery({
    queryKey: ["meta-ads"],
    queryFn: () => adminApi.listMetaAds(),
    enabled: isAds,
  });

  const { data: adsSettings = [] } = useQuery({
    queryKey: ["site-settings-ads"],
    queryFn: () => adminApi.listSiteSettings("ads"),
    enabled: isAds,
  });

  const { data: mobileSettings = [] } = useQuery({
    queryKey: ["site-settings-mobile"],
    queryFn: () => adminApi.listSiteSettings("mobile"),
    enabled: !isAds,
  });

  const { data: systemSettings = [] } = useQuery({
    queryKey: ["site-settings-system"],
    queryFn: () => adminApi.listSiteSettings("system"),
    enabled: !isAds && subRoute === "notifications",
  });

  const audiences: AudienceItem[] = (() => {
    const found = adsSettings.find((s) => s.key === "meta_ads_audiences");
    const items = (found?.value_json as { items?: AudienceItem[] } | undefined)?.items;
    return Array.isArray(items) ? items : [];
  })();

  const rules: RuleItem[] = (() => {
    const found = adsSettings.find((s) => s.key === "meta_ads_rules");
    const items = (found?.value_json as { items?: RuleItem[] } | undefined)?.items;
    return Array.isArray(items) ? items : [];
  })();

  const pushHistory = (() => {
    const found = systemSettings.find((s) => s.key === "push_notifications_log");
    const items = (found?.value_json as { items?: Array<Record<string, unknown>> } | undefined)?.items;
    return Array.isArray(items) ? items : [];
  })();

  useEffect(() => {
    for (const st of adsSettings) {
      const v = (st.value_json || {}) as Record<string, unknown>;
      if (st.key === "meta_ads_catalog") {
        setCatalogCfg({
          feed_enabled: v.feed_enabled !== false,
          sync_frequency: String(v.sync_frequency || "hourly"),
          exclude_out_of_stock: v.exclude_out_of_stock !== false,
        });
      }
    }
  }, [adsSettings]);

  useEffect(() => {
    for (const st of mobileSettings) {
      const v = (st.value_json || {}) as Record<string, unknown>;
      if (st.key === "mobile_app_config") {
        setAppConfig({
          maintenance: Boolean(v.maintenance),
          min_version_android: String(v.min_version_android || v.min_version || "2.4.0"),
          min_version_ios: String(v.min_version_ios || "2.4.0"),
          force_update: Boolean(v.force_update),
          play_store_url: String(v.play_store_url || ""),
          app_store_url: String(v.app_store_url || ""),
        });
      }
      if (st.key === "mobile_app_home") {
        setAppHome({
          home_banner_text: String(v.home_banner_text || ""),
          show_story_strip: v.show_story_strip !== false,
          sections_csv: Array.isArray(v.sections) ? v.sections.join(", ") : "",
        });
      }
      if (st.key === "mobile_app_categories") {
        setAppCats({
          layout: String(v.layout || "grid_4"),
          featured_slugs_csv: Array.isArray(v.featured_slugs) ? v.featured_slugs.join(", ") : "",
        });
      }
    }
  }, [mobileSettings]);

  const saveAdMut = useMutation({
    mutationFn: () =>
      adminApi.saveMetaAds({
        external_campaign_id: extId || `camp_${Date.now()}`,
        name,
        objective,
        status: "active",
        daily_budget_paise: Math.round(Number(budgetRs) * 100),
      } as Partial<MetaAdsCampaign>),
    onSuccess: () => {
      showToast("Meta Ads campaign saved", "success");
      setName("");
      setExtId("");
      qc.invalidateQueries({ queryKey: ["meta-ads"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const totalDailyBudgetRs = campaigns.reduce((acc, c) => acc + (c.daily_budget_paise || 0) / 100, 0);

  const heading = isAds
    ? subRoute === "campaigns"
      ? "Meta Ads · Campaigns"
      : subRoute === "audiences"
      ? "Meta Ads · Custom & Lookalike Audiences"
      : subRoute === "catalog"
      ? "Meta Ads · Dynamic Product Catalog Feed"
      : subRoute === "reports"
      ? "Meta Ads · Attribution & Spend Reports"
      : subRoute === "rules"
      ? "Meta Ads · Automated Budget & CPA Rules"
      : "Meta Ads · Overview Dashboard"
    : subRoute === "home"
    ? "Mobile App · Home Screen Builder"
    : subRoute === "categories"
    ? "Mobile App · Category Grid & Shortcuts"
    : subRoute === "notifications"
    ? "Mobile App · FCM Push Notifications"
    : "Mobile App · Versions & Maintenance Settings";

  return (
    <div className="space-y-4 animate-bd-fade-up text-xs">
      <div>
        <h1 className="font-heading text-xl font-bold flex items-center gap-2">
          {isAds ? <Megaphone size={20} className="text-[#4f6ef7]" /> : <Smartphone size={20} className="text-[#4f6ef7]" />}
          {heading}
        </h1>
      </div>

      {isAds ? (
        subRoute === "audiences" ? (
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const next = [...audiences, { id: Date.now(), name: audName, type: audType, size_est: Number(audSize) || 1000, status: "active" }];
                adminApi.upsertSiteSetting("meta_ads_audiences", "ads", { items: next }).then(() => {
                  showToast("Audience added", "success");
                  setAudName("");
                  qc.invalidateQueries({ queryKey: ["site-settings-ads"] });
                });
              }}
              className="flex flex-wrap gap-3 items-end bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800"
            >
              <div>
                <label className="block font-semibold mb-1">Audience Name *</label>
                <input required value={audName} onChange={(e) => setAudName(e.target.value)} placeholder="Valentine Decor Viewers" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 w-60" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Type</label>
                <select value={audType} onChange={(e) => setAudType(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  <option value="Custom">Custom Website/Pixel</option>
                  <option value="Lookalike 1%">Lookalike 1% India</option>
                  <option value="Retargeting">Cart Abandoners</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Est. Reach</label>
                <input type="number" value={audSize} onChange={(e) => setAudSize(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 w-32" />
              </div>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                <Plus size={13} className="inline mr-1" /> Create Audience
              </button>
            </form>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {audiences.map((a, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold flex items-center gap-1.5"><Users size={13} className="text-[#4f6ef7]" /> {a.name}</p>
                    <p className="text-[11px] text-slate-400">{a.type} · Est. {a.size_est.toLocaleString("en-IN")} profiles</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold capitalize">{a.status}</span>
                </div>
              ))}
            </div>
          </div>
        ) : subRoute === "catalog" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              adminApi
                .upsertSiteSetting("meta_ads_catalog", "ads", {
                  ...catalogCfg,
                  feed_url: "/api/v1/public/products?limit=100",
                })
                .then(() => showToast("Catalog feed sync settings saved", "success"));
            }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-2xl"
          >
            <p className="font-bold text-sm flex items-center gap-2"><ShoppingBag size={15} className="text-[#4f6ef7]" /> Dynamic Product Feed Sync</p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-[11px] break-all">
              Feed URL: {API_BASE_URL}/api/v1/public/products?limit=100
            </div>
            <div>
              <label className="block font-semibold mb-1">Sync Frequency</label>
              <select value={catalogCfg.sync_frequency} onChange={(e) => setCatalogCfg((s) => ({ ...s, sync_frequency: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 w-48">
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={catalogCfg.feed_enabled} onChange={(e) => setCatalogCfg((s) => ({ ...s, feed_enabled: e.target.checked }))} />
              Enable Facebook / Instagram Commerce Feed Sync
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={catalogCfg.exclude_out_of_stock} onChange={(e) => setCatalogCfg((s) => ({ ...s, exclude_out_of_stock: e.target.checked }))} />
              Automatically exclude zero-stock SKUs from Dynamic Product Ads
            </label>
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
              <Save size={13} /> Save Catalog Settings
            </button>
          </form>
        ) : subRoute === "rules" ? (
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const next = [...rules, { id: Date.now(), name: ruleName, condition: ruleCond, action: ruleAction, enabled: true }];
                adminApi.upsertSiteSetting("meta_ads_rules", "ads", { items: next }).then(() => {
                  showToast("Automation rule added", "success");
                  setRuleName("");
                  qc.invalidateQueries({ queryKey: ["site-settings-ads"] });
                });
              }}
              className="flex flex-wrap gap-3 items-end bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800"
            >
              <div>
                <label className="block font-semibold mb-1">Rule Name *</label>
                <input required value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="Protect Daily CPA" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 w-52" />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="block font-semibold mb-1">Trigger Condition</label>
                <input value={ruleCond} onChange={(e) => setRuleCond(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Action</label>
                <input value={ruleAction} onChange={(e) => setRuleAction(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 w-44" />
              </div>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                <Sliders size={13} className="inline mr-1" /> Add Rule
              </button>
            </form>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {rules.map((r, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold">{r.name}</p>
                    <p className="text-[11px] text-slate-500">When {r.condition} → {r.action}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = rules.map((x, j) => (j === idx ? { ...x, enabled: !x.enabled } : x));
                      adminApi.upsertSiteSetting("meta_ads_rules", "ads", { items: next }).then(() => qc.invalidateQueries({ queryKey: ["site-settings-ads"] }));
                    }}
                    className={`px-3 py-1 rounded-full font-semibold cursor-pointer ${r.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {r.enabled ? "Active" : "Paused"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : subRoute === "reports" ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const csv = ["Campaign,Objective,Daily Budget INR,Status", ...campaigns.map((c) => `"${c.name}",${c.objective},${((c.daily_budget_paise || 0) / 100).toFixed(0)},${c.status}`)].join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const u = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = u;
                  a.download = "meta-ads-report.csv";
                  a.click();
                  URL.revokeObjectURL(u);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold cursor-pointer"
              >
                <Download size={13} /> Export Ads CSV
              </button>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Objective</th>
                    <th className="px-4 py-3">Daily Budget</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        No ad campaigns created yet.
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 font-semibold">{c.name}</td>
                        <td className="px-4 py-3">{c.objective}</td>
                        <td className="px-4 py-3">₹{((c.daily_budget_paise ?? 0) / 100).toFixed(0)}/day</td>
                        <td className="px-4 py-3 capitalize">{c.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <p className="text-slate-500 flex items-center gap-1"><BarChart3 size={13} /> Active Campaigns</p>
                <p className="font-heading text-2xl font-bold mt-1">{activeCampaigns} / {campaigns.length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <p className="text-slate-500">Configured Daily Spend Cap</p>
                <p className="font-heading text-2xl font-bold mt-1">₹{totalDailyBudgetRs.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <p className="text-slate-500">Custom & Lookalike Audiences</p>
                <p className="font-heading text-2xl font-bold mt-1">{audiences.length}</p>
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveAdMut.mutate();
              }}
              className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800"
            >
              <div>
                <label className="block font-semibold mb-1">Campaign ID</label>
                <input value={extId} onChange={(e) => setExtId(e.target.value)} placeholder="cmp_birthday_q4" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block font-semibold mb-1">Campaign Name *</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Birthday Decor Pan-India" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Objective</label>
                <select value={objective} onChange={(e) => setObjective(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  <option value="CONVERSIONS">CONVERSIONS</option>
                  <option value="CATALOG_SALES">CATALOG_SALES</option>
                  <option value="TRAFFIC">TRAFFIC</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Daily Budget (INR)</label>
                <input type="number" value={budgetRs} onChange={(e) => setBudgetRs(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 w-32" />
              </div>
              <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                <Plus size={13} /> Save Campaign
              </button>
            </form>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Objective</th>
                    <th className="px-4 py-3">Daily Budget</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        No ad campaigns configured yet.
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 font-semibold">{c.name}</td>
                        <td className="px-4 py-3">{c.objective}</td>
                        <td className="px-4 py-3">₹{((c.daily_budget_paise ?? 0) / 100).toFixed(0)}</td>
                        <td className="px-4 py-3 capitalize">{c.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : subRoute === "home" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            adminApi
              .upsertSiteSetting("mobile_app_home", "mobile", {
                home_banner_text: appHome.home_banner_text,
                show_story_strip: appHome.show_story_strip,
                sections: appHome.sections_csv.split(",").map((s) => s.trim()).filter(Boolean),
              })
              .then(() => showToast("App Home layout saved", "success"));
          }}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-2xl"
        >
          <div>
            <label className="block font-semibold mb-1">App Home Hero Copy</label>
            <input value={appHome.home_banner_text} onChange={(e) => setAppHome((s) => ({ ...s, home_banner_text: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
          </div>
          <div>
            <label className="block font-semibold mb-1">App Screen Section Slugs (Ordered CSV)</label>
            <input value={appHome.sections_csv} onChange={(e) => setAppHome((s) => ({ ...s, sections_csv: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-mono" />
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={appHome.show_story_strip} onChange={(e) => setAppHome((s) => ({ ...s, show_story_strip: e.target.checked }))} />
            Show Circular Story Highlights Strip on App Home
          </label>
          <div>
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
              <Save size={13} /> Save App Home
            </button>
          </div>
        </form>
      ) : subRoute === "categories" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            adminApi
              .upsertSiteSetting("mobile_app_categories", "mobile", {
                layout: appCats.layout,
                featured_slugs: appCats.featured_slugs_csv.split(",").map((s) => s.trim()).filter(Boolean),
              })
              .then(() => showToast("App categories layout saved", "success"));
          }}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-2xl"
        >
          <div>
            <label className="block font-semibold mb-1">Grid Layout Style</label>
            <select value={appCats.layout} onChange={(e) => setAppCats((s) => ({ ...s, layout: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 w-56">
              <option value="grid_4">4 Columns per Row</option>
              <option value="grid_3">3 Columns per Row</option>
              <option value="horizontal_scroll">Horizontal Carousel</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Featured App Category Slugs (CSV)</label>
            <input value={appCats.featured_slugs_csv} onChange={(e) => setAppCats((s) => ({ ...s, featured_slugs_csv: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-mono" />
          </div>
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
            <Save size={13} /> Save App Categories
          </button>
        </form>
      ) : subRoute === "notifications" ? (
        <div className="space-y-4 max-w-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const next = [{ id: Date.now(), title: pushTitle, body: pushBody, segment: pushSegment, sent_at: new Date().toISOString(), recipients: 1240 }, ...pushHistory];
              adminApi.upsertSiteSetting("push_notifications_log", "system", { items: next }).then(() => {
                showToast("App FCM notification queued", "success");
                setPushTitle("");
                setPushBody("");
                qc.invalidateQueries({ queryKey: ["site-settings-system"] });
              });
            }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3"
          >
            <p className="font-bold text-sm flex items-center gap-2"><Bell size={15} className="text-[#4f6ef7]" /> Broadcast App Notification</p>
            <input required value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="Notification Title *" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
            <textarea required rows={2} value={pushBody} onChange={(e) => setPushBody(e.target.value)} placeholder="Notification Body *" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
            <select value={pushSegment} onChange={(e) => setPushSegment(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <option value="All Mobile Subscribers">All Mobile Subscribers</option>
              <option value="Android Devices">Android Devices</option>
              <option value="iOS Devices">iOS Devices</option>
            </select>
            <button type="submit" className="ml-2 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">Send Push</button>
          </form>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {pushHistory.map((item, idx) => (
              <div key={idx} className="p-4">
                <p className="font-bold">{String(item.title || "")}</p>
                <p className="text-slate-600">{String(item.body || "")}</p>
                <p className="text-[11px] text-slate-400 mt-1">{String(item.segment || "")} · {String(item.sent_at || "")}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            adminApi.upsertSiteSetting("mobile_app_config", "mobile", appConfig).then(() => showToast("Mobile app settings saved", "success"));
          }}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-2xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Min Android Version</label>
              <input value={appConfig.min_version_android} onChange={(e) => setAppConfig((s) => ({ ...s, min_version_android: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Min iOS Version</label>
              <input value={appConfig.min_version_ios} onChange={(e) => setAppConfig((s) => ({ ...s, min_version_ios: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Play Store URL</label>
              <input value={appConfig.play_store_url} onChange={(e) => setAppConfig((s) => ({ ...s, play_store_url: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
            </div>
            <div>
              <label className="block font-semibold mb-1">App Store URL</label>
              <input value={appConfig.app_store_url} onChange={(e) => setAppConfig((s) => ({ ...s, app_store_url: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
            </div>
          </div>
          <div className="flex flex-wrap gap-5">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={appConfig.force_update} onChange={(e) => setAppConfig((s) => ({ ...s, force_update: e.target.checked }))} />
              Force Mandatory Update
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={appConfig.maintenance} onChange={(e) => setAppConfig((s) => ({ ...s, maintenance: e.target.checked }))} />
              Enable App Maintenance Mode
            </label>
          </div>
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
            <Save size={13} /> Save App Configuration
          </button>
        </form>
      )}
    </div>
  );
}
