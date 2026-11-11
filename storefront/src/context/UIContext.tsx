"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CustomerSession {
  id: number;
  name?: string;
  phone?: string;
  email?: string;
  target?: string;
  coins_balance?: number;
  created_at?: string;
}

interface UIContextType {
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;

  isAuthOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;

  isMobileMenuOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;

  isTopAppBarDismissed: boolean;
  dismissTopAppBar: () => void;

  customer: CustomerSession | null;
  setCustomer: (next: CustomerSession | null) => void;
  logoutCustomer: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTopAppBarDismissed, setIsTopAppBarDismissed] = useState(false);
  const [customer, setCustomerState] = useState<CustomerSession | null>(null);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem("giftlaya_topbar_dismissed");
      if (dismissed === "true") setIsTopAppBarDismissed(true);
      const savedCust = localStorage.getItem("giftlaya_customer");
      if (savedCust) setCustomerState(JSON.parse(savedCust));
    } catch {
      // ignore
    }
  }, []);

  const setCustomer = (next: CustomerSession | null) => {
    setCustomerState(next);
    try {
      if (next) localStorage.setItem("giftlaya_customer", JSON.stringify(next));
      else localStorage.removeItem("giftlaya_customer");
    } catch {
      // ignore
    }
  };

  const logoutCustomer = () => {
    setCustomer(null);
    try {
      localStorage.removeItem("giftlaya_saved_addresses");
      localStorage.removeItem("giftlaya_orders");
    } catch {
      // ignore
    }
  };

  const openSearch = () => setIsSearchOpen(true);
  const closeSearch = () => setIsSearchOpen(false);

  const openAuth = () => setIsAuthOpen(true);
  const closeAuth = () => setIsAuthOpen(false);

  const openMobileMenu = () => setIsMobileMenuOpen(true);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const dismissTopAppBar = () => {
    setIsTopAppBarDismissed(true);
    try {
      sessionStorage.setItem("giftlaya_topbar_dismissed", "true");
    } catch {
      // ignore
    }
  };

  // Keyboard shortcut: Ctrl+K / Cmd+K and Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsAuthOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <UIContext.Provider
      value={{
        isSearchOpen,
        openSearch,
        closeSearch,
        isAuthOpen,
        openAuth,
        closeAuth,
        isMobileMenuOpen,
        openMobileMenu,
        closeMobileMenu,
        isTopAppBarDismissed,
        dismissTopAppBar,
        customer,
        setCustomer,
        logoutCustomer,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) {
    throw new Error("useUI must be used within UIProvider");
  }
  return ctx;
}

