import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Shield,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import { adminApi, type SidebarCounts } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  CMS_NAV_SECTIONS,
  MOBILE_BOTTOM_TABS,
  getSidebarBadge,
  hasUrgentBadge,
  requiredPermissionForPath,
} from "@/config/navigation";
import { PermissionGuard } from "@/components/ui/PermissionGuard";

const SEGMENT_TITLES: Record<string, string> = {
  all: "All Orders",
  new: "New Orders",
  processing: "Processing Orders",
  delivered: "Delivered Orders",
  failed: "Failed Orders",
  cancelled: "Cancelled Orders",
  uploads: "Customer Uploads",
  "option-group": "Product Options",
  "info-field-group": "Information Field Group",
  "addon-category": "Addon Category",
  "ai-tags": "AI Tags",
  "care-info": "Care Info",
  faq: "FAQ",
  gst: "GST",
  "meta-pixel": "Meta Setup",
  "database-backup": "Database Backup",
};

function formatBreadcrumb(pathname: string): string[] {
  const parts = pathname.replace(/^\/cms\/?/, "").split("/").filter(Boolean);
  if (parts.length === 0) return ["Dashboard"];
  return parts.map((p) => {
    if (SEGMENT_TITLES[p]) return SEGMENT_TITLES[p];
    return p
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  });
}

function SidebarContent({
  expanded,
  mobileDrawer,
  counts,
  onCloseMobile,
  onToggleExpand,
}: {
  expanded: boolean;
  mobileDrawer?: boolean;
  counts?: SidebarCounts;
  onCloseMobile?: () => void;
  onToggleExpand?: () => void;
}) {
  const { pathname } = useLocation();
  const { currentUser, can, logout } = useAuth();
  const navigate = useNavigate();

  const [openMenu, setOpenMenu] = useState<string>(() => {
    for (const sec of CMS_NAV_SECTIONS) {
      const found = sec.items.find(
        (it) =>
          it.children &&
          (pathname.startsWith(it.href) ||
            it.children.some((c) => pathname === c.href))
      );
      if (found) return found.href;
    }
    return "";
  });

  useEffect(() => {
    for (const sec of CMS_NAV_SECTIONS) {
      const found = sec.items.find(
        (it) =>
          it.children &&
          (pathname === it.href ||
            pathname.startsWith(`${it.href}/`) ||
            it.children.some((c) => pathname === c.href))
      );
      if (found) {
        setOpenMenu(found.href);
        return;
      }
    }
  }, [pathname]);

  const isWide = Boolean(mobileDrawer || expanded);
  const initials = (currentUser?.username || "AD")
    .split(/[\s_]+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/cms/login", { replace: true });
  };

  return (
    <aside
      style={{ width: isWide ? 248 : 64 }}
      className="flex flex-col h-screen bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 z-20 shrink-0 transition-[width] duration-200 overflow-hidden"
    >
      {/* Top Logo & Collapse */}
      {isWide ? (
        <div className="flex items-center h-[60px] px-4 gap-3 shrink-0 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 shrink-0 rounded-xl bg-[#4F6EF7] flex items-center justify-center text-white font-bold text-[11px] tracking-wide select-none shadow-sm">
            GL
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate leading-tight">
              Giftlaya
            </p>
            <p className="text-[10px] text-slate-400 leading-tight">
              Admin Panel
            </p>
          </div>
          {mobileDrawer ? (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close menu"
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleExpand}
              aria-label="Collapse sidebar"
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <PanelLeftClose size={15} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center h-[60px] shrink-0 border-b border-slate-100 dark:border-slate-800 justify-center gap-1">
          <div className="w-8 h-8 rounded-xl bg-[#4F6EF7] flex items-center justify-center text-white font-bold text-[11px] tracking-wide select-none shadow-sm">
            GL
          </div>
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label="Expand sidebar"
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-[#4F6EF7] transition-colors cursor-pointer"
          >
            <PanelLeftOpen size={13} />
          </button>
        </div>
      )}

      {/* User Card */}
      {isWide && currentUser && (
        <div className="mx-3 mt-3 mb-1 flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-[#4F6EF7] to-[#818CF8] flex items-center justify-center text-white text-[10px] font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
              {currentUser.username}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              {currentUser.superuser ? (
                <>
                  <ShieldCheck size={9} className="text-[#4F6EF7]" />
                  <span className="text-[10px] font-medium text-[#4F6EF7] leading-none">
                    Superuser
                  </span>
                </>
              ) : (
                <>
                  <Shield size={9} className="text-slate-400" />
                  <span className="text-[10px] text-slate-400 leading-none truncate">
                    {currentUser.role_name || "Admin"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {CMS_NAV_SECTIONS.map((sec) => {
          const visibleItems = sec.items.filter(
            (it) => !it.permission || can(it.permission)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={sec.label} className="mb-1">
              {isWide && (
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400 select-none">
                  {sec.label}
                </p>
              )}
              <div className="px-2 space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const hasChildren = Boolean(item.children?.length);
                  const isOpen = openMenu === item.href;
                  const active =
                    item.href === "/cms"
                      ? pathname === "/cms"
                      : pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                  const badge = getSidebarBadge(item.href, counts);
                  const urgent = hasUrgentBadge(item.href, counts);

                  return (
                    <div key={item.href}>
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (isWide) {
                              setOpenMenu((prev) =>
                                prev === item.href ? "" : item.href
                              );
                            } else if (onToggleExpand) {
                              onToggleExpand();
                              setOpenMenu(item.href);
                            }
                          }}
                          className={`w-full group relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                            active
                              ? "bg-[#4F6EF7]/10 text-[#4F6EF7]"
                              : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                          }`}
                        >
                          <Icon size={15} className="shrink-0" />
                          {!isWide && urgent && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
                          )}
                          {isWide ? (
                            <>
                              <span className="text-[13px] font-medium flex-1 whitespace-nowrap text-left truncate">
                                {item.label}
                              </span>
                              {badge !== null && (
                                <span
                                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${
                                    urgent
                                      ? "bg-red-500 text-white"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                  }`}
                                >
                                  {badge}
                                </span>
                              )}
                              <ChevronDown
                                size={13}
                                className={`shrink-0 transition-transform duration-150 ${
                                  isOpen ? "rotate-180" : ""
                                }`}
                              />
                            </>
                          ) : (
                            <span className="pointer-events-none absolute left-[58px] whitespace-nowrap bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                              {item.label}
                            </span>
                          )}
                        </button>
                      ) : (
                        <Link
                          to={item.href}
                          onClick={onCloseMobile}
                          className={`w-full group relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-150 ${
                            active
                              ? "bg-[#4F6EF7] text-white shadow-sm shadow-[#4F6EF7]/30"
                              : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                          }`}
                        >
                          <Icon size={15} className="shrink-0" />
                          {!isWide && urgent && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
                          )}
                          {isWide ? (
                            <>
                              <span className="text-[13px] font-medium flex-1 whitespace-nowrap truncate">
                                {item.label}
                              </span>
                              {badge !== null && (
                                <span
                                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${
                                    urgent
                                      ? "bg-red-500 text-white"
                                      : active
                                      ? "bg-white/25 text-white"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                  }`}
                                >
                                  {badge}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="pointer-events-none absolute left-[58px] whitespace-nowrap bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                              {item.label}
                            </span>
                          )}
                        </Link>
                      )}

                      {hasChildren && isWide && isOpen && (
                        <div className="mt-0.5 ml-[34px] pl-3 border-l-2 border-slate-100 dark:border-slate-800 space-y-0.5 pb-1">
                          {item.children!.map((child) => {
                            const cActive = pathname === child.href;
                            const cBadge = getSidebarBadge(child.href, counts);
                            return (
                              <Link
                                key={child.href}
                                to={child.href}
                                onClick={onCloseMobile}
                                className={`flex items-center gap-2 px-2 py-2 rounded-lg text-[12px] transition-all duration-100 ${
                                  cActive
                                    ? "text-[#4F6EF7] font-semibold bg-[#4F6EF7]/8"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                                    cActive
                                      ? "bg-[#4F6EF7]"
                                      : "bg-slate-300 dark:bg-slate-600"
                                  }`}
                                />
                                <span className="flex-1 whitespace-nowrap truncate">
                                  {child.label}
                                </span>
                                {cBadge !== null && (
                                  <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                                    {cBadge}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer Logout */}
      <div className="shrink-0 px-2 py-3 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={handleLogout}
          className="group relative flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 transition-colors duration-150 cursor-pointer"
        >
          <LogOut size={15} className="shrink-0" />
          {isWide ? (
            <span className="text-[13px] font-medium">Logout</span>
          ) : (
            <span className="pointer-events-none absolute left-[58px] whitespace-nowrap bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              Logout
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

export function CmsLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { currentUser, loading, can, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate("/cms/login", { replace: true, state: { from: pathname } });
    }
  }, [loading, currentUser, navigate, pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      } else if (e.key === "Escape") {
        setCmdOpen(false);
        setAccountOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data: counts } = useQuery({
    queryKey: ["cms-sidebar-counts"],
    queryFn: () => adminApi.sidebarCounts(),
    enabled: Boolean(currentUser),
    refetchInterval: 60_000,
  });

  const searchableRoutes = useMemo(() => {
    const list: Array<{ label: string; group: string; href: string }> = [];
    for (const sec of CMS_NAV_SECTIONS) {
      for (const it of sec.items) {
        if (it.permission && !can(it.permission)) continue;
        list.push({ label: it.label, group: sec.label, href: it.href });
        if (it.children) {
          for (const ch of it.children) {
            list.push({
              label: `${it.label} → ${ch.label}`,
              group: sec.label,
              href: ch.href,
            });
          }
        }
      }
    }
    return list;
  }, [can]);

  const filteredCmdRoutes = useMemo(() => {
    const q = cmdQuery.trim().toLowerCase();
    if (!q) return searchableRoutes.slice(0, 10);
    return searchableRoutes
      .filter(
        (r) =>
          r.label.toLowerCase().includes(q) || r.group.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [searchableRoutes, cmdQuery]);

  if (loading || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F1F5F9] dark:bg-slate-950 gap-2 text-slate-400">
        <div className="w-5 h-5 border-2 border-[#4F6EF7] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  const breadcrumbs = formatBreadcrumb(pathname);
  const pageTitle = breadcrumbs[breadcrumbs.length - 1];
  const requiredPerm = requiredPermissionForPath(pathname);
  const initials = (currentUser.username || "AD")
    .split(/[\s_]+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const whatsappUnread = counts?.whatsapp ?? 0;

  return (
    <div className="flex h-screen bg-[#F1F5F9] dark:bg-slate-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-screen shrink-0">
        <SidebarContent
          expanded={expanded}
          counts={counts}
          onToggleExpand={() => setExpanded((v) => !v)}
        />
      </div>

      {/* Mobile Drawer Backdrop */}
      <div
        onClick={() => setMobileOpen(false)}
        className={`lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Mobile Drawer Panel */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          expanded={true}
          mobileDrawer
          counts={counts}
          onCloseMobile={() => setMobileOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="flex items-center gap-3 h-[60px] px-4 md:px-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            <Menu size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 leading-none truncate">
              {pageTitle}
            </h2>
            {breadcrumbs.length > 1 && (
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                <span>CMS</span>
                {breadcrumbs.map((b, i) => (
                  <React.Fragment key={i}>
                    <ChevronRight size={10} />
                    <span
                      className={
                        i === breadcrumbs.length - 1
                          ? "text-slate-600 dark:text-slate-300 font-medium"
                          : ""
                      }
                    >
                      {b}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Search Command Button */}
          <button
            type="button"
            onClick={() => {
              setCmdQuery("");
              setCmdOpen(true);
            }}
            className="hidden md:flex items-center gap-2 w-56 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:border-[#4F6EF7]/30 transition-all duration-150 cursor-pointer"
          >
            <Search size={13} className="shrink-0" />
            <span className="text-[13px] flex-1 text-left">Search…</span>
            <div className="flex items-center gap-0.5">
              <kbd className="text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-slate-300 shadow-2xs">
                ⌘
              </kbd>
              <kbd className="text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-slate-300 shadow-2xs">
                K
              </kbd>
            </div>
          </button>

          {/* Right Quick Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color mode"
              className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Link
              to="/cms/whatsapp"
              aria-label={
                whatsappUnread
                  ? `WhatsApp — ${whatsappUnread} unread`
                  : "WhatsApp"
              }
              className="relative flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <MessageCircle size={17} />
              {whatsappUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] leading-4 text-center font-semibold tabular-nums">
                  {whatsappUnread > 99 ? "99+" : whatsappUnread}
                </span>
              )}
            </Link>

            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                aria-label="Account menu"
                className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4F6EF7] to-[#818CF8] flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm shadow-[#4F6EF7]/20">
                  {initials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                    {currentUser.username}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {currentUser.superuser ? (
                      <>
                        <ShieldCheck size={9} className="text-[#4F6EF7]" />
                        <span className="text-[10px] font-medium text-[#4F6EF7]">
                          Superuser
                        </span>
                      </>
                    ) : (
                      <>
                        <Shield size={9} className="text-slate-400" />
                        <span className="text-[10px] text-slate-400">
                          {currentUser.role_name || "Admin"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronDown
                  size={11}
                  className={`text-slate-400 hidden sm:block transition-transform duration-150 ${
                    accountOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {accountOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setAccountOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl py-1.5 z-40">
                    <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {currentUser.username}
                      </p>
                      <p className="text-[11px] text-[#4F6EF7] mt-0.5">
                        {currentUser.superuser
                          ? "Superuser · Full access"
                          : currentUser.role_name || "Admin"}
                      </p>
                    </div>
                    {currentUser.superuser && (
                      <button
                        type="button"
                        onClick={() => {
                          setAccountOpen(false);
                          navigate("/cms/admin-settings");
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Shield size={14} />
                        Admin Settings
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        setAccountOpen(false);
                        await logout();
                        navigate("/cms/login", { replace: true });
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    >
                      <LogOut size={14} />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Workspace Canvas */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-6 overscroll-y-contain">
          <PermissionGuard module={requiredPerm}>
            <Outlet />
          </PermissionGuard>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-stretch"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {MOBILE_BOTTOM_TABS.filter(
          (t) => !t.permission || can(t.permission)
        ).map((tab) => {
          const Icon = tab.icon;
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={`relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-w-0 ${
                active
                  ? "text-[#4F6EF7]"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#4F6EF7] rounded-b-full" />
              )}
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[9.5px] font-semibold leading-none truncate">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Command Search Palette Modal (Cmd/Ctrl+K) */}
      {cmdOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] p-4">
            <div
              className="fixed inset-0 bg-black/45"
              onClick={() => setCmdOpen(false)}
            />
            <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <Search size={16} className="text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  value={cmdQuery}
                  onChange={(e) => setCmdQuery(e.target.value)}
                  placeholder="Jump to module (Orders, Products, Admin Settings...)"
                  className="flex-1 text-sm bg-transparent outline-none text-slate-800 dark:text-slate-100"
                />
                <kbd className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5">
                  ESC
                </kbd>
              </div>
              <div className="max-h-72 overflow-y-auto p-2 space-y-0.5">
                {filteredCmdRoutes.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No matching CMS route.
                  </p>
                ) : (
                  filteredCmdRoutes.map((r) => (
                    <button
                      key={r.href}
                      type="button"
                      onClick={() => {
                        setCmdOpen(false);
                        navigate(r.href);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <span className="font-medium">{r.label}</span>
                      <span className="text-[10px] text-slate-400">{r.group}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
