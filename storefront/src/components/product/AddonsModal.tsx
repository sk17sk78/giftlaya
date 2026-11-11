"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Gift, X, Plus, Minus, Check, ArrowRight, Sparkles } from "lucide-react";
import type { ProductAddonOption, CartAddonItem } from "@/types";

interface AddonsModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  basePrice: number;
  addons: ProductAddonOption[];
  categories: { id: number; name: string; slug: string }[];
  loading?: boolean;
  onContinue: (selectedAddons: CartAddonItem[]) => void;
}

export function AddonsModal({
  open,
  onClose,
  productName,
  basePrice,
  addons,
  categories,
  loading = false,
  onContinue,
}: AddonsModalProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [selectedMap, setSelectedMap] = useState<Record<string, CartAddonItem>>({});

  useEffect(() => {
    if (!open) return;
    setActiveFilter("all");
    setSelectedMap({});
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const hasPopular = useMemo(() => addons.some((a) => a.isPopular), [addons]);

  const visibleAddons = useMemo(() => {
    if (activeFilter === "all") return addons;
    if (activeFilter === "popular") return addons.filter((a) => a.isPopular);
    return addons.filter((a) => String(a.addonCategoryId ?? "") === activeFilter);
  }, [addons, activeFilter]);

  const nonEmptyCategories = useMemo(() => {
    const usedCatIds = new Set(
      addons.map((a) => String(a.addonCategoryId ?? "")).filter(Boolean)
    );
    return categories.filter((c) => usedCatIds.has(String(c.id)));
  }, [addons, categories]);

  const selectedList = useMemo(() => Object.values(selectedMap), [selectedMap]);
  const totalAddonQty = selectedList.reduce((s, a) => s + a.quantity, 0);
  const addonsSubtotal = selectedList.reduce((s, a) => s + a.price * a.quantity, 0);
  const grandSubtotal = basePrice + addonsSubtotal;

  if (!open) return null;

  const toggleAdd = (addon: ProductAddonOption) => {
    const key = String(addon.id);
    setSelectedMap((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return {
        ...prev,
        [key]: {
          id: addon.id,
          name: addon.name,
          price: addon.price,
          quantity: 1,
          image: addon.image,
        },
      };
    });
  };

  const setQty = (id: number | string, delta: number) => {
    const key = String(id);
    setSelectedMap((prev) => {
      const cur = prev[key];
      if (!cur) return prev;
      const nextQty = cur.quantity + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return { ...prev, [key]: { ...cur, quantity: nextQty } };
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Make it a little more special add-ons"
    >
      <div
        className="w-full max-w-[1040px] max-h-[92vh] bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 sm:px-7 py-4 sm:py-5 border-b border-[#f0e8ed]">
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="w-11 h-11 rounded-2xl bg-[#fdf2f6] border border-[#f5d5e1] grid place-items-center text-[#9b1b45] shrink-0">
              <Gift className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#a44d6f]">
                THE FINISHING TOUCHES
              </p>
              <h2 className="text-[18px] sm:text-[22px] font-extrabold text-[#292229] leading-tight truncate">
                Make it a little more special
              </h2>
              <p className="text-[12px] text-[#7c6a76]">
                Thoughtful extras for your celebration. Always optional.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add-ons modal"
            className="w-10 h-10 rounded-full border border-[#d8b8c6] text-[#9b1b45] hover:bg-[#fdf2f6] grid place-items-center shrink-0 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content: Two-column desktop split matching giftlaya.com */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_310px] overflow-hidden">
          {/* Left: Filter pills + Addon cards */}
          <div className="flex flex-col min-h-0 overflow-hidden border-r border-[#f0e8ed]">
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-5 sm:px-7 py-3.5 border-b border-[#f5eff3]">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap border transition-colors cursor-pointer ${
                  activeFilter === "all"
                    ? "bg-[#9b1b45] border-[#9b1b45] text-white"
                    : "bg-white border-[#e4dae0] text-[#493f49] hover:border-[#c99cb0]"
                }`}
              >
                All extras
              </button>
              {hasPopular && (
                <button
                  type="button"
                  onClick={() => setActiveFilter("popular")}
                  className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap border transition-colors cursor-pointer ${
                    activeFilter === "popular"
                      ? "bg-[#9b1b45] border-[#9b1b45] text-white"
                      : "bg-white border-[#e4dae0] text-[#493f49] hover:border-[#c99cb0]"
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Popular
                </button>
              )}
              {nonEmptyCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveFilter(String(cat.id))}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap border transition-colors cursor-pointer ${
                    activeFilter === String(cat.id)
                      ? "bg-[#9b1b45] border-[#9b1b45] text-white"
                      : "bg-white border-[#e4dae0] text-[#493f49] hover:border-[#c99cb0]"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Grid Header + Cards */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold text-[#292229]">A little extra joy</h3>
                <span className="text-[11px] font-medium text-[#8a7682]">
                  {visibleAddons.length} options
                </span>
              </div>

              {loading && addons.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8a7682]">
                  Loading celebration extras...
                </div>
              ) : visibleAddons.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8a7682]">
                  No add-ons in this category yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  {visibleAddons.map((addon) => {
                    const selected = selectedMap[String(addon.id)];
                    const isAdded = Boolean(selected);
                    return (
                      <div
                        key={String(addon.id)}
                        className={`rounded-2xl border p-2.5 flex flex-col justify-between transition-all ${
                          isAdded
                            ? "border-[#9b1b45] bg-[#fff9fb] shadow-2xs"
                            : "border-[#eee5e9] bg-white hover:border-[#d8b4c7]"
                        }`}
                      >
                        <div>
                          <div className="relative aspect-square rounded-xl overflow-hidden bg-[#f8f3f6] mb-2.5">
                            {addon.image ? (
                              <img
                                src={addon.image}
                                alt={addon.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full grid place-items-center text-[#9b1b45]/40">
                                <Gift className="w-8 h-8" />
                              </div>
                            )}
                            {addon.isPopular && (
                              <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 text-[#7e5814] text-[10px] font-semibold shadow-2xs">
                                <Sparkles className="w-2.5 h-2.5 text-[#c78d20]" />
                                Popular
                              </span>
                            )}
                            {isAdded && (
                              <span className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-[#9b1b45] text-white grid place-items-center shadow">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] font-semibold text-[#292229] line-clamp-1">
                            {addon.name}
                          </p>
                          <p className="text-[13px] font-extrabold text-[#292229] mt-0.5">
                            ₹{addon.price.toLocaleString("en-IN")}
                            <span className="text-[11px] font-normal text-[#856e7b]"> / add-on</span>
                          </p>
                        </div>

                        {isAdded ? (
                          <div className="mt-2.5 flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border border-[#f0cddb] bg-[#fdf2f6] text-[12px]">
                            <span className="inline-flex items-center gap-1 font-bold text-[#9b1b45]">
                              <Check className="w-3.5 h-3.5" /> Added
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleAdd(addon)}
                              className="text-[11px] font-semibold text-[#745565] hover:text-[#9b1b45] underline cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleAdd(addon)}
                            className="mt-2.5 w-full py-2 rounded-xl border border-[#e3d7dd] bg-white hover:border-[#9b1b45] text-[#9b1b45] text-[12px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Your celebration summary */}
          <aside
            aria-label="Your selection summary"
            className="hidden lg:flex flex-col justify-between p-5 bg-white overflow-y-auto"
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-[15px] font-extrabold text-[#292229]">Your celebration</h3>
                <p className="text-[12px] text-[#7c6a76] mt-0.5 line-clamp-2">{productName}</p>
              </div>

              <div className="flex items-center justify-between text-[13px] pb-3 border-b border-[#f0e8ed]">
                <span className="text-[#7c6a76]">Product</span>
                <strong className="text-[#292229]">₹{basePrice.toLocaleString("en-IN")}</strong>
              </div>

              {selectedList.length === 0 ? (
                <div className="py-6 text-center space-y-1.5 border-b border-[#f0e8ed]">
                  <Gift className="w-7 h-7 text-[#9b1b45]/40 mx-auto" />
                  <p className="text-[12px] font-semibold text-[#3f3139]">
                    A little something extra?
                  </p>
                  <p className="text-[11px] text-[#856e7b]">
                    Your selected add-ons will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 pb-3 border-b border-[#f0e8ed] max-h-60 overflow-y-auto">
                  {selectedList.map((item) => (
                    <div key={String(item.id)} className="flex items-start justify-between gap-2 text-[12px]">
                      <div className="min-w-0">
                        <p className="font-medium text-[#292229] truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="inline-flex items-center border border-[#e6dce1] rounded-lg bg-[#faf7f9]">
                            <button
                              type="button"
                              onClick={() => setQty(item.id, -1)}
                              aria-label={`Decrease ${item.name}`}
                              className="px-1.5 py-0.5 text-[#745565] hover:text-[#9b1b45] cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-1.5 text-[11px] font-bold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => setQty(item.id, 1)}
                              aria-label={`Increase ${item.name}`}
                              className="px-1.5 py-0.5 text-[#745565] hover:text-[#9b1b45] cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[10px] text-[#856e7b]">
                            × ₹{item.price.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <strong className="text-[#292229] shrink-0">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 text-[13px]">
                <div className="flex items-center justify-between text-[#7c6a76]">
                  <span>Add-ons ({totalAddonQty})</span>
                  <strong className="text-[#292229]">₹{addonsSubtotal.toLocaleString("en-IN")}</strong>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#f0e8ed]">
                  <span className="text-[14px] font-bold text-[#292229]">Subtotal</span>
                  <strong className="text-[20px] font-extrabold text-[#292229]">
                    ₹{grandSubtotal.toLocaleString("en-IN")}
                  </strong>
                </div>
                <p className="text-[11px] text-[#856e7b]">
                  Final charges and offers shown in your cart.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-3.5 border-t border-[#f0e8ed] bg-white">
          <div>
            <p className="text-[11px] text-[#7c6a76]">
              {totalAddonQty === 0
                ? "No extras selected"
                : `${totalAddonQty} ${totalAddonQty === 1 ? "extra" : "extras"} · +₹${addonsSubtotal.toLocaleString("en-IN")}`}
            </p>
            <p className="text-[17px] font-extrabold text-[#292229]">
              ₹{grandSubtotal.toLocaleString("en-IN")}{" "}
              <span className="text-[11px] font-normal text-[#7c6a76]">subtotal</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onContinue(selectedList)}
            className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-xl bg-[#9b1b45] hover:bg-[#7e1538] text-white text-[13px] font-bold transition-colors shadow-md cursor-pointer"
          >
            <span>
              {totalAddonQty === 0 ? "Continue without extras" : "Continue to cart"}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

