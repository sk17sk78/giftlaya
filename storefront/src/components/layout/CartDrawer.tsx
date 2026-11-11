"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart, getCartItemUnitPrice, getCartItemLineTotal, getCartItemLineKey } from "@/context/CartContext";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";

export function CartDrawer() {
  const {
    isCartDrawerOpen,
    closeCartDrawer,
    cart,
    removeFromCart,
    updateQuantity,
    cartTotal,
  } = useCart();

  if (!isCartDrawerOpen) return null;

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
        aria-label="Your shopping cart"
        className="relative w-full max-w-[420px] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e9ec] bg-[#fffbfd]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#9b1b45]" />
            <h2 className="font-heading text-[16px] font-bold text-[#29232a]">
              Your Cart ({cart.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCartDrawer}
            aria-label="Close cart"
            className="w-8 h-8 rounded-full border border-[#ebe5e9] flex items-center justify-center text-[#70636c] hover:bg-[#faf3f6] hover:text-[#9b1b45] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Free Delivery Promo Strip */}
        <div className="bg-[#fdf2f5] border-b border-[#f8c2d2] px-5 py-2 text-[11px] text-[#7d1538] flex items-center justify-between">
          <span>{cartTotal >= 999 ? "🎉 Free Delivery Unlocked!" : `Add ₹${Math.max(0, 999 - cartTotal)} more for FREE Delivery!`}</span>
          <span className="font-bold">₹999 Min</span>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {cart.length === 0 ? (
            <div className="py-16 text-center text-[#70636c]">
              <div className="w-16 h-16 rounded-3xl bg-[#faf3f6] text-[#9b1b45] flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-8 h-8 opacity-70" />
              </div>
              <p className="text-[14px] font-bold text-[#34212a]">Your cart is empty</p>
              <p className="text-[12px] text-[#8d7b87] mt-1 max-w-[220px] mx-auto">
                Explore delicious cakes, fresh blooms &amp; personalized surprises!
              </p>
              <button
                type="button"
                onClick={closeCartDrawer}
                className="mt-4 px-4 py-2 rounded-xl bg-[#9b1b45] text-white text-[12px] font-semibold hover:bg-[#7e1538] transition-colors"
              >
                Start Gifting
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const priceNum = getCartItemUnitPrice(item);
              const lineTotalNum = getCartItemLineTotal(item);
              const lineKey = getCartItemLineKey(item);
              const title = item.product.title || item.product.name || "Gift Item";

              return (
                <div
                  key={lineKey}
                  className="flex gap-3 p-3 rounded-2xl border border-[#f0e8ed] bg-white hover:border-[#dcb4c5] transition-colors"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#faf3f6] shrink-0 border border-[#f5edf2]">
                    <Image
                      src={item.product.image}
                      alt={title}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-[13px] font-semibold text-[#34212a] line-clamp-1">
                          {title}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeFromCart(lineKey)}
                          aria-label="Remove item"
                          className="text-[#a4919e] hover:text-[#d32f2f] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-[#856e7b]">
                        {item.selectedWeight && <span>{item.selectedWeight}</span>}
                        {item.dietPreference && <span>· {item.dietPreference}</span>}
                        {item.selectedCity && <span>· {item.selectedCity}</span>}
                        {item.selectedAddons?.map((ad) => (
                          <span key={String(ad.id)} className="px-1.5 py-0.5 rounded bg-[#fcf2f6] text-[#9b1b45]">
                            +{ad.name} {ad.quantity > 1 ? `×${ad.quantity}` : ""} (₹{(ad.price * (ad.quantity || 1)).toLocaleString("en-IN")})
                          </span>
                        ))}
                        {item.deliveryDate && (
                          <span className="text-[#246448] font-medium block w-full truncate">
                            {item.deliveryDate}
                            {item.deliveryTimeSlot ? ` (${item.deliveryTimeSlot})` : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <strong className="text-[14px] font-extrabold text-[#34212a]">
                        ₹{lineTotalNum.toLocaleString("en-IN")}
                      </strong>

                      {/* Quantity Selector */}
                      <div className="flex items-center gap-2 border border-[#eee4ea] rounded-lg px-2 py-0.5 bg-[#faf8f9]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(lineKey, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="text-[#70636c] hover:text-[#9b1b45]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-[12px] font-bold text-[#34212a] min-w-[14px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(lineKey, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="text-[#70636c] hover:text-[#9b1b45]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Checkout Summary */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-[#f0e9ec] bg-[#fffbfd] space-y-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#70636c]">Subtotal</span>
              <strong className="text-[16px] font-extrabold text-[#29232a]">
                ₹{cartTotal.toLocaleString("en-IN")}
              </strong>
            </div>
            <p className="text-[10px] text-[#9b8090]">
              Taxes &amp; delivery charges calculated at checkout.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/cart"
                onClick={closeCartDrawer}
                className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-[#9b1b45] text-[#9b1b45] font-bold text-[13px] hover:bg-[#fdf2f5] transition-colors"
              >
                <span>View Cart</span>
              </Link>
              <Link
                href="/cart"
                onClick={closeCartDrawer}
                className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#9b1b45] text-white font-bold text-[13px] hover:bg-[#7e1538] transition-colors shadow-md"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CartDrawer;

