"use client";

import React, { useState } from "react";
import Link from "next/link";
import { NavItem } from "@/types";
import { useApp } from "@/context/AppContext";
import { ChevronDown, ChevronRight, X, UserRound, Phone, MessageCircle } from "lucide-react";

interface MegaMenuProps {
  items: NavItem[];
}

export default function MegaMenu({ items }: MegaMenuProps) {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const { isMobileMenuOpen, closeMobileMenu, openAuth } = useApp();
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  const toggleMobileGroup = (title: string) => {
    setMobileExpanded(prev => (prev === title ? null : title));
  };

  return (
    <>
      {/* DESKTOP MEGA MENU NAVIGATION */}
      <nav
        aria-label="Categories navigation"
        className="hidden lg:block relative bg-white border-b border-[#f0e9ec] z-30"
      >
        <div className="max-w-[1168px] mx-auto px-4">
          <ul className="flex items-center justify-between gap-1 py-1">
            {items.map(item => {
              const hasDropdown = Boolean(item.columns && item.columns.length > 0);
              const isOpen = activeItem === item.title;

              return (
                <li
                  key={item.title}
                  className="relative group"
                  onMouseEnter={() => hasDropdown && setActiveItem(item.title)}
                  onMouseLeave={() => setActiveItem(null)}
                >
                  <Link
                    href={item.href || "#"}
                    className={`flex items-center gap-1 px-2.5 py-2 rounded-lg text-[12px] font-semibold tracking-tight transition-colors ${
                      isOpen
                        ? "text-[#9b1b45] bg-[#f8edf2]"
                        : "text-[#49333f] hover:text-[#9b1b45] hover:bg-[#faf3f6]"
                    }`}
                  >
                    <span>{item.title}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#9b1b45] text-white">
                        {item.badge}
                      </span>
                    )}
                    {hasDropdown && (
                      <ChevronDown
                        className={`w-3 h-3 text-[#8d7b87] transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-[#9b1b45]" : ""
                        }`}
                      />
                    )}
                  </Link>

                  {/* Mega Menu Dropdown */}
                  {hasDropdown && isOpen && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 top-full pt-1.5 z-50 w-screen max-w-[1100px]"
                      onMouseEnter={() => setActiveItem(item.title)}
                      onMouseLeave={() => setActiveItem(null)}
                    >
                      <div className="bg-white border border-[#e9dfe6] rounded-2xl shadow-[0_12px_36px_rgba(57,32,51,0.14)] p-6 max-h-[calc(100vh-140px)] overflow-y-auto">
                        <div
                          className="grid gap-6 items-start"
                          style={{
                            gridTemplateColumns: `repeat(${Math.min(
                              item.columns?.length || 4,
                              4
                            )}, minmax(0, 1fr))`,
                          }}
                        >
                          {item.columns?.map(col => (
                            <div key={col.title} className="flex flex-col gap-2.5 min-w-0">
                              <h4 className="text-[12px] font-bold text-[#29232a] tracking-tight uppercase border-b border-[#f0e9ec] pb-1.5">
                                {col.title}
                              </h4>
                              <ul className="flex flex-col gap-1.5">
                                {col.links.map(link => (
                                  <li key={link.label}>
                                    <Link
                                      href={link.href}
                                      className="group/link flex items-center gap-2 text-[12px] text-[#554750] hover:text-[#9b1b45] hover:translate-x-0.5 transition-all py-0.5"
                                    >
                                      <span
                                        className="w-1.5 h-1.5 rounded-full bg-[#dfd5da] group-hover/link:bg-[#9b1b45] transition-colors shrink-0"
                                        aria-hidden="true"
                                      />
                                      <span className="truncate">{link.label}</span>
                                      {link.badge && (
                                        <span className="text-[9px] font-semibold text-[#9b1b45] bg-[#f8edf2] px-1 py-0.5 rounded">
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
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* MOBILE SIDEBAR DRAWER (< 1024px) */}
      {isMobileMenuOpen && (
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
              {/* Sign in card */}
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

              {/* Navigation Accordion */}
              <div className="space-y-1 pt-1">
                {items.map(item => {
                  const hasDropdown = Boolean(item.columns && item.columns.length > 0);
                  const isExpanded = mobileExpanded === item.title;

                  if (!hasDropdown) {
                    return (
                      <Link
                        key={item.title}
                        href={item.href || "#"}
                        onClick={closeMobileMenu}
                        className="flex items-center justify-between py-2.5 px-3 rounded-xl text-[13px] font-semibold text-[#49333f] hover:bg-[#faf3f6] hover:text-[#9b1b45] transition-colors"
                      >
                        <span>{item.title}</span>
                      </Link>
                    );
                  }

                  return (
                    <div key={item.title} className="border-b border-[#f7f2f5] last:border-0">
                      <button
                        type="button"
                        onClick={() => toggleMobileGroup(item.title)}
                        className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-[13px] font-semibold text-[#49333f] hover:bg-[#faf3f6] hover:text-[#9b1b45] transition-colors"
                      >
                        <span>{item.title}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-[#8d7b87] transition-transform duration-200 ${
                            isExpanded ? "rotate-180 text-[#9b1b45]" : ""
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="pl-4 pr-2 pb-3 space-y-3 pt-1">
                          {item.columns?.map(col => (
                            <div key={col.title} className="space-y-1">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#9b7d91]">
                                {col.title}
                              </span>
                              <div className="flex flex-col gap-1 pl-2">
                                {col.links.map(link => (
                                  <Link
                                    key={link.label}
                                    href={link.href}
                                    onClick={closeMobileMenu}
                                    className="text-[12px] text-[#554750] py-1 hover:text-[#9b1b45] transition-colors truncate"
                                  >
                                    {link.label}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Direct Help shortcuts in Mobile Menu */}
              <div className="pt-3 border-t border-[#f0e9ec] space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#9b7d91] px-1">
                  Need Help?
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="https://wa.me/918100248353"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 p-2 rounded-xl bg-[#eefaf4] text-[#1f7a4d] text-[11px] font-semibold"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href="tel:+918100248353"
                    className="flex items-center gap-1.5 p-2 rounded-xl bg-[#faf3f6] text-[#9b1b45] text-[11px] font-semibold"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Us</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
