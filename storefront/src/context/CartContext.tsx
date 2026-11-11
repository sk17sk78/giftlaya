"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { Product, CartItem, CartAddonItem } from "@/types";

export function getCartItemUnitPrice(item: CartItem): number {
  if (typeof item.unitPriceOverride === "number" && item.unitPriceOverride > 0) {
    return item.unitPriceOverride;
  }
  const basePrice =
    typeof item.product.price === "number"
      ? item.product.price
      : parseFloat(String(item.product.price).replace(/[^0-9.]/g, "")) || 0;
  const weightExtra =
    item.selectedWeight === "1 Kg" ? 400 : item.selectedWeight === "2 Kg" ? 1100 : 0;
  const dietExtra = item.dietPreference === "Non-Veg" ? 149 : 0;
  return basePrice + weightExtra + dietExtra;
}

export function getCartItemAddonsTotal(item: CartItem): number {
  return (item.selectedAddons || []).reduce(
    (sum, a) => sum + (a.price || 0) * (a.quantity || 1),
    0
  );
}

export function getCartItemLineTotal(item: CartItem): number {
  return getCartItemUnitPrice(item) * item.quantity + getCartItemAddonsTotal(item);
}

export function getCartItemLineKey(item: {
  product: Product;
  selectedWeight?: string;
  dietPreference?: string;
  unitPriceOverride?: number;
}): string {
  return `${item.product.id}::${item.selectedWeight || ""}::${item.dietPreference || ""}::${item.unitPriceOverride || ""}`;
}

export interface CartAddOptions {
  variantId?: number;
  selectedWeight?: string;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  slotTemplateId?: number;
  slotSurcharge?: number;
  dietPreference?: "Veg" | "Non-Veg";
  message?: string;
  referencePhotoName?: string;
  selectedCity?: string;
  selectedAddons?: CartAddonItem[];
  customInputs?: Record<string, string>;
  unitPriceOverride?: number;
  openDrawer?: boolean;
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  itemsSubtotal: number;
  addonsTotal: number;
  cartTotal: number;
  isCartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  addToCart: (product: Product, quantity?: number, options?: CartAddOptions) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateCartItemSchedule: (
    lineKey: string,
    patch: {
      deliveryDate?: string;
      deliveryTimeSlot?: string;
      slotTemplateId?: number;
      slotSurcharge?: number;
    }
  ) => void;
  updateCartItemMessage: (lineKey: string, message: string) => void;
  addAddonToItem: (lineKey: string, addon: CartAddonItem) => void;
  updateAddonQuantity: (lineKey: string, addonId: number | string, quantity: number) => void;
  removeAddonFromItem: (lineKey: string, addonId: number | string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("giftlaya_cart");
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsCartDrawerOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    try {
      localStorage.setItem("giftlaya_cart", JSON.stringify(newCart));
    } catch {
      // ignore
    }
  };

  const openCartDrawer = () => setIsCartDrawerOpen(true);
  const closeCartDrawer = () => setIsCartDrawerOpen(false);

  const addToCart = (product: Product, quantity = 1, options?: CartAddOptions) => {
    const targetKey = getCartItemLineKey({
      product,
      selectedWeight: options?.selectedWeight,
      dietPreference: options?.dietPreference,
      unitPriceOverride: options?.unitPriceOverride,
    });
    const existingIndex = cart.findIndex((item) => getCartItemLineKey(item) === targetKey);
    let updated: CartItem[];

    const mergeAddons = (prevList: CartAddonItem[] = [], nextList: CartAddonItem[] = []): CartAddonItem[] | undefined => {
      if (prevList.length === 0 && nextList.length === 0) return undefined;
      const byId = new Map<string, CartAddonItem>();
      for (const a of prevList) byId.set(String(a.id), { ...a, quantity: a.quantity || 1 });
      for (const a of nextList) {
        const key = String(a.id);
        const cur = byId.get(key);
        if (cur) {
          byId.set(key, { ...cur, quantity: cur.quantity + (a.quantity || 1) });
        } else {
          byId.set(key, { ...a, quantity: a.quantity || 1 });
        }
      }
      return Array.from(byId.values());
    };

    if (existingIndex > -1) {
      updated = cart.map((item, idx) =>
        idx === existingIndex
          ? {
              ...item,
              ...options,
              quantity: item.quantity + quantity,
              selectedAddons: mergeAddons(item.selectedAddons, options?.selectedAddons),
            }
          : item
      );
    } else {
      updated = [
        ...cart,
        {
          product,
          quantity,
          ...options,
        },
      ];
    }

    saveCart(updated);
    if (options?.openDrawer !== false) {
      setIsCartDrawerOpen(true);
    }
  };

  const removeFromCart = (idOrLineKey: string) => {
    const updated = cart.filter(
      (item) => getCartItemLineKey(item) !== idOrLineKey && item.product.id !== idOrLineKey
    );
    saveCart(updated);
  };

  const updateQuantity = (idOrLineKey: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(idOrLineKey);
      return;
    }
    const updated = cart.map((item) =>
      getCartItemLineKey(item) === idOrLineKey || item.product.id === idOrLineKey
        ? { ...item, quantity }
        : item
    );
    saveCart(updated);
  };

  const updateCartItemSchedule = (
    lineKey: string,
    patch: {
      deliveryDate?: string;
      deliveryTimeSlot?: string;
      slotTemplateId?: number;
      slotSurcharge?: number;
    }
  ) => {
    const updated = cart.map((item) =>
      getCartItemLineKey(item) === lineKey ? { ...item, ...patch } : item
    );
    saveCart(updated);
  };

  const updateCartItemMessage = (lineKey: string, message: string) => {
    const updated = cart.map((item) =>
      getCartItemLineKey(item) === lineKey ? { ...item, message } : item
    );
    saveCart(updated);
  };

  const addAddonToItem = (lineKey: string, addon: CartAddonItem) => {
    const updated = cart.map((item) => {
      if (getCartItemLineKey(item) !== lineKey) return item;
      const list = [...(item.selectedAddons || [])];
      const idx = list.findIndex((a) => String(a.id) === String(addon.id));
      if (idx > -1) {
        list[idx] = { ...list[idx], quantity: (list[idx].quantity || 1) + (addon.quantity || 1) };
      } else {
        list.push({ ...addon, quantity: addon.quantity || 1 });
      }
      return { ...item, selectedAddons: list };
    });
    saveCart(updated);
  };

  const updateAddonQuantity = (lineKey: string, addonId: number | string, quantity: number) => {
    const updated = cart.map((item) => {
      if (getCartItemLineKey(item) !== lineKey) return item;
      const nextAddons = (item.selectedAddons || [])
        .map((a) => (String(a.id) === String(addonId) ? { ...a, quantity } : a))
        .filter((a) => a.quantity > 0);
      return {
        ...item,
        selectedAddons: nextAddons.length > 0 ? nextAddons : undefined,
      };
    });
    saveCart(updated);
  };

  const removeAddonFromItem = (lineKey: string, addonId: number | string) => {
    updateAddonQuantity(lineKey, addonId, 0);
  };

  const clearCart = () => {
    saveCart([]);
    try {
      sessionStorage.removeItem("giftlaya_applied_coupon");
    } catch {
      // ignore
    }
  };

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const itemsSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + getCartItemUnitPrice(item) * item.quantity, 0),
    [cart]
  );

  const addonsTotal = useMemo(
    () => cart.reduce((sum, item) => sum + getCartItemAddonsTotal(item), 0),
    [cart]
  );

  const cartTotal = itemsSubtotal + addonsTotal;

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        itemsSubtotal,
        addonsTotal,
        cartTotal,
        isCartDrawerOpen,
        openCartDrawer,
        closeCartDrawer,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateCartItemSchedule,
        updateCartItemMessage,
        addAddonToItem,
        updateAddonQuantity,
        removeAddonFromItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
