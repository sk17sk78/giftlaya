"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { useUI } from "@/context/UIContext";
import { DashboardSvgIcon, type DashboardIconKind } from "@/components/dashboard/DashboardIcons";

const NAV_ITEMS: Array<{
  href: string;
  icon: DashboardIconKind;
  label: string;
  short?: string;
}> = [
  { href: "/dashboard", icon: "overview", label: "Overview" },
  { href: "/dashboard/orders", icon: "orders", label: "My orders" },
  { href: "/dashboard/rewards", icon: "coins", label: "Rewards" },
  { href: "/dashboard/support", icon: "support", label: "Help & Support", short: "Help" },
  { href: "/dashboard/account-settings", icon: "profile", label: "Profile" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { customer, openAuth, logoutCustomer } = useUI();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : Boolean(pathname?.startsWith(href));

  if (!customer) {
    return (
      <div className="min-h-[75vh] bg-[#faf8fa] flex items-center justify-center px-4 py-12 text-[#352c36]">
        <div className="w-full max-w-md bg-white border border-[#e9e2e9] rounded-[20px] p-6 sm:p-8 text-center space-y-4">
          <div className="flex justify-center">
            <DashboardSvgIcon kind="gift" size={52} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a18e9c]">
              YOUR GIFTLAYA
            </p>
            <h1 className="text-xl font-bold text-[#292229] mt-1">
              Sign in to view your account
            </h1>
            <p className="text-xs text-[#887c89] mt-1.5 leading-relaxed">
              Track upcoming celebrations, Giftlaya Coins balance, saved addresses &amp; support tickets across devices.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={openAuth}
              className="flex-1 min-h-[44px] rounded-[11px] bg-[#a72055] hover:bg-[#901a48] text-white text-xs font-semibold px-4 cursor-pointer"
            >
              Sign in with OTP
            </button>
            <Link
              href="/"
              className="flex-1 min-h-[44px] rounded-[11px] bg-white border border-[#e4d9e4] text-[#876680] hover:border-[#dcb9cd] text-xs font-semibold px-4 inline-flex items-center justify-center"
            >
              Explore gifts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    customer.name?.trim() || customer.phone || customer.target || "Your account";
  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "G";

  return (
    <div className="min-h-[75vh] bg-[#faf8fa] text-[#352c36]">
      <div className="max-w-[1168px] mx-auto px-4 lg:px-6 pt-5 pb-24 lg:py-7 flex items-start gap-7">
        {/* Desktop Sidebar matching live giftlaya.com/dashboard */}
        <aside className="hidden lg:block w-[216px] shrink-0 sticky top-[140px]">
          <div className="flex items-center gap-2.5 px-1 pt-1.5 pb-5">
            <span className="w-12 h-12 rounded-[16px] bg-[#fceef4] border border-[#f4dbe6] text-[#a82b5b] grid place-items-center text-base font-semibold shrink-0">
              {initials}
            </span>
            <div className="min-w-0">
              <strong className="block text-[13px] font-semibold text-[#292229] truncate">
                {displayName}
              </strong>
              <p className="text-[10px] text-[#9e8c9d] mt-1">
                A little joy, all in one place
              </p>
            </div>
          </div>

          <nav
            aria-label="Account navigation"
            className="grid gap-1.5 p-[7px] bg-white border border-[#e9e0e9] rounded-[17px]"
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-[11px] p-1.5 text-[12px] transition-colors ${
                    active
                      ? "bg-[#fdf0f6] text-[#a02656] font-semibold"
                      : "text-[#8d778f] hover:bg-[#faf6f9]"
                  }`}
                >
                  <DashboardSvgIcon kind={item.icon} size={32} />
                  <span>{item.label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={logoutCustomer}
            className="flex items-center gap-2.5 text-[#a08c9e] hover:text-[#a02656] text-[12px] p-4 w-full cursor-pointer"
          >
            <LogOut className="w-[15px] h-[15px]" />
            <span>Log out</span>
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Fixed Bottom Navigation on < 1024px matching live giftlaya.com/dashboard */}
      <nav
        aria-label="Account navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#eae1e9] rounded-t-[20px] bg-white px-2 pt-1.5 pb-[calc(7px+env(safe-area-inset-bottom))] grid grid-cols-5"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-0.5 text-[10px] ${
                active ? "text-[#a52056] font-semibold" : "text-[#9a879b]"
              }`}
            >
              <span
                className={`rounded-[13px] px-2.5 py-0.5 ${
                  active ? "bg-[#fbedf4]" : ""
                }`}
              >
                <DashboardSvgIcon kind={item.icon} size={28} />
              </span>
              <span className="truncate max-w-full">{item.short || item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

