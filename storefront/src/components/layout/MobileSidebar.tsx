"use client";

import React, { useState } from "react";
import Link from "next/link";
import { NavItem } from "@/types";
import { useUI } from "@/context/UIContext";
import { ChevronDown, ChevronRight, X, UserRound, Phone, MessageCircle } from "lucide-react";

interface MobileSidebarProps {
  items: NavItem[];
}

export function MobileSidebar({ items }: MobileSidebarProps) {
  const { isMobileMenuOpen, closeMobileMenu, openAuth, customer } = useUI();
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  const toggleGroup = (title: string) => {
    setMobileExpanded((prev) => (prev === title ? null : title));
  };

  if (!isMobileMenuOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={closeMobileMenu}
      />

      {/* Drawer Panel */}
      <div className="relative w-[320px] max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#f0e9ec]">
          <span className="text-[20px] font-black tracking-tight text-[#9b1b45]">
            giftlaya
          </span>
          <button
            type="button"
            onClick={closeMobileMenu}
            aria-label="Close menu"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#eae3e8] text-[#796575] hover:bg-[#faf3f6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Account / Sign in card */}
          {customer ? (
            <Link
              href="/dashboard"
              onClick={closeMobileMenu}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#fff5f8] border border-[#f0dce5] text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-[#fceaf2] border border-[#f2d8e3] text-[#9b1b45] flex items-center justify-center font-bold text-sm shrink-0">
                <UserRound className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <strong className="block text-[13px] font-bold text-[#4a3242] truncate">
                  {customer.name || customer.phone || customer.target || "My Account"}
                </strong>
                <span className="block text-[10px] text-[#9b1b45]">
                  {customer.coins_balance ?? 0} Coins · View orders
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#b889a1] shrink-0" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                closeMobileMenu();
                openAuth();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#fffbfd] border border-[#ece2e9] text-left hover:border-[#dcb4c5] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-[#fceaf2] border border-[#f2d8e3] text-[#9b1b45] flex items-center justify-center font-bold text-sm shrink-0">
                <UserRound className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <strong className="block text-[13px] font-bold text-[#4a3242]">
                  Sign in / Register
                </strong>
                <span className="block text-[10px] text-[#9b7d91]">
                  Track orders &amp; plan surprises
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#b889a1] shrink-0" />
            </button>
          )}

          {/* Navigation Accordion */}
          <div className="space-y-1 pt-1">
            {items.map((item) => {
              const hasDropdown = Boolean(item.columns && item.columns.length > 0);
              const isExpanded = mobileExpanded === item.title;

              if (!hasDropdown) {
                return (
                  <Link
                    key={item.title}
                    href={item.href || "#"}
                    onClick={closeMobileMenu}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#34212a] hover:bg-[#faf3f6] hover:text-[#9b1b45] transition-colors"
                  >
                    <span>{item.title}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold text-white bg-[#9b1b45] px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              }

              return (
                <div key={item.title} className="border-b border-[#f6edf2] last:border-b-0 pb-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.title)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#34212a] hover:bg-[#faf3f6] transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span>{item.title}</span>
                      {item.badge && (
                        <span className="text-[9px] font-bold text-white bg-[#9b1b45] px-1.5 py-0.5 rounded">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-[#9b8090] transition-transform duration-200 ${
                        isExpanded ? "rotate-180 text-[#9b1b45]" : ""
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="pl-4 pr-2 py-2 space-y-3 bg-[#fdfafd] rounded-xl my-1">
                      {item.columns?.map((col) => (
                        <div key={col.title} className="space-y-1.5">
                          <span className="text-[10px] font-bold tracking-wide uppercase text-[#9b7d91] block">
                            {col.title}
                          </span>
                          <ul className="space-y-1 pl-1 border-l-2 border-[#f0e2ea]">
                            {col.links.map((link) => (
                              <li key={link.label}>
                                <Link
                                  href={link.href}
                                  onClick={closeMobileMenu}
                                  className="flex items-center justify-between py-1 px-2 text-[12px] text-[#554750] hover:text-[#9b1b45] transition-colors"
                                >
                                  <span>{link.label}</span>
                                  {link.badge && (
                                    <span className="text-[9px] text-[#9b1b45] bg-[#fceaf2] px-1 py-0.5 rounded font-medium">
                                      {link.badge}
                                    </span>
                                  )}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Links Strip */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {[
              { label: "My Orders", href: "/orders" },
              { label: "Track Cart", href: "/cart" },
              { label: "About Us", href: "/about-us" },
              { label: "Franchise", href: "/franchise/request" },
              { label: "Seller Login", href: "/seller/login" },
              { label: "FAQs", href: "/pages/faqs" },
            ].map((q) => (
              <Link
                key={q.href}
                href={q.href}
                onClick={closeMobileMenu}
                className="px-3 py-2 rounded-xl bg-[#faf7f9] border border-[#f0e8ed] text-[11px] font-semibold text-[#34212a] hover:border-[#9b1b45] hover:text-[#9b1b45] text-center transition-colors"
              >
                {q.label}
              </Link>
            ))}
          </div>

          {/* Quick Support Contacts */}
          <div className="pt-3 border-t border-[#f0e9ec] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9b7d91] px-2 block">
              Need assistance?
            </span>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="https://wa.me/918100248353"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-xl bg-[#eefaf4] text-[#1c7447] text-[11px] font-semibold"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                <span>WhatsApp</span>
              </a>
              <a
                href="tel:+918100248353"
                className="flex items-center gap-2 p-2 rounded-xl bg-[#fdf2f5] text-[#9b1b45] text-[11px] font-semibold"
              >
                <Phone className="w-4 h-4" />
                <span>Call Us</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileSidebar;

