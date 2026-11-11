"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";

export default function CartDrawer() {
  const {
    isCartDrawerOpen,
    closeCartDrawer,
    cart,
    removeFromCart,
    updateQuantity,
    selectedCity,
  } = useApp();

  if (!isCartDrawerOpen) return null;

  const subtotal = cart.reduce(
    (total, item) => total + (Number(item.product.price) || 0) * item.quantity,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity"
        onClick={closeCartDrawer}
      />

      {/* Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your Cart"
        className="relative w-full max-w-[420px] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e9ec]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#9b1b45]" />
            <h2 className="font-heading text-[18px] font-bold text-[#29232a]">
              Your Cart
            </h2>
            <span className="text-[12px] font-bold text-[#9b1b45] bg-[#f8edf2] px-2 py-0.5 rounded-full">
              {cart.reduce((t, i) => t + i.quantity, 0)}
            </span>
          </div>
          <button
            type="button"
            onClick={closeCartDrawer}
            aria-label="Close cart"
            className="w-8 h-8 rounded-full border border-[#eae3e8] flex items-center justify-center text-[#70636c] hover:bg-[#faf3f6] hover:text-[#9b1b45] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {cart.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[#fdf2f5] border border-[#f8c2d2] flex items-center justify-center text-[#9b1b45] mb-4">
              <ShoppingBag className="w-9 h-9" />
            </div>
            <h3 className="font-heading text-[18px] font-bold text-[#29232a]">
              Your cart is empty
            </h3>
            <p className="text-[12px] sm:text-[13px] text-[#70636c] mt-1.5 max-w-xs leading-relaxed">
              Looks like you haven&apos;t added any celebrations yet. Let&apos;s find the perfect gift or decoration for your moment!
            </p>
            <Link
              href="/flowers"
              onClick={closeCartDrawer}
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#9b1b45] hover:bg-[#7d1538] text-white text-[13px] font-bold shadow-md transition-colors"
            >
              <span>Explore Celebrations</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* Cart Items List */
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.map(item => (
                <div
                  key={item.product.id}
                  className="flex gap-3 p-3 rounded-2xl border border-[#f0e8ed] bg-white shadow-sm"
                >
                  <img
                    src={item.product.image}
                    alt={item.product.title}
                    className="w-16 h-16 rounded-xl object-cover bg-gray-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-[12px] font-bold text-[#29232a] line-clamp-2">
                        {item.product.title}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        aria-label="Remove item"
                        className="text-[#9a8996] hover:text-red-600 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[13px] font-extrabold text-[#9b1b45]">
                        ₹{((Number(item.product.price) || 0) * item.quantity).toLocaleString("en-IN")}
                      </span>

                      {/* Quantity Controls */}
                      <div className="flex items-center border border-[#e4dae0] rounded-lg overflow-hidden bg-[#faf7f9]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="w-6 h-6 flex items-center justify-center hover:bg-[#f5eff2] text-[#49333f]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-[12px] font-bold text-[#29232a]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="w-6 h-6 flex items-center justify-center hover:bg-[#f5eff2] text-[#49333f]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Summary & Checkout */}
            <div className="p-5 border-t border-[#f0e9ec] bg-[#faf8f9] space-y-3">
              <div className="flex items-center justify-between text-[12px] text-[#70636c]">
                <span>Delivering to</span>
                <span className="font-semibold text-[#29232a]">{selectedCity}</span>
              </div>
              <div className="flex items-center justify-between text-[13px] text-[#70636c]">
                <span>Subtotal</span>
                <span className="font-bold text-[#29232a]">₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between text-[12px] text-[#47816b] font-medium">
                <span>Standard Delivery</span>
                <span>FREE</span>
              </div>
              <div className="pt-2 border-t border-[#e4dae0] flex items-center justify-between text-[15px] font-extrabold text-[#29232a]">
                <span>Total Amount</span>
                <span className="text-[#9b1b45]">₹{subtotal.toLocaleString("en-IN")}</span>
              </div>

              <Link
                href="/cart"
                onClick={closeCartDrawer}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#9b1b45] hover:bg-[#7d1538] text-white text-[13px] font-bold shadow-md transition-all text-center"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
