"use client";

import React from "react";
import Link from "next/link";
import { useUI } from "@/context/UIContext";
import { Package, Coins, MapPin, User, LogOut } from "lucide-react";

export function CustomerAccountSummary() {
  const { customer, openAuth, logoutCustomer } = useUI();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#fff9fb] border border-[#f0dce5] rounded-2xl px-4 py-3 text-xs">
        <div>
          {customer ? (
            <p className="font-semibold text-[#292229]">
              Signed in as{" "}
              <span className="text-[#9b1b45] font-bold">
                {customer.name || customer.target || `Customer #${customer.id}`}
              </span>
            </p>
          ) : (
            <p className="text-[#625865]">
              Sign in with OTP to sync your orders and Giftlaya Coins across devices.
            </p>
          )}
        </div>
        {customer ? (
          <button
            type="button"
            onClick={logoutCustomer}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3d7dd] bg-white text-[#79717c] hover:text-[#9b1b45] font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        ) : (
          <button
            type="button"
            onClick={openAuth}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#9b1b45] text-white font-semibold cursor-pointer"
          >
            Sign in with OTP
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/dashboard/orders"
          className="p-4 rounded-2xl border border-[#9b1b45] bg-[#fff5f8] flex items-center gap-3"
        >
          <Package className="w-5 h-5 text-[#9b1b45]" />
          <div>
            <strong className="block text-xs sm:text-sm font-bold text-[#292229]">My Orders</strong>
            <span className="text-[10px] text-[#79717c]">Live status &amp; tracking</span>
          </div>
        </Link>

        <div className="p-4 rounded-2xl border border-[#eee5e9] bg-white flex items-center gap-3">
          <Coins className="w-5 h-5 text-amber-500" />
          <div>
            <strong className="block text-xs sm:text-sm font-bold text-[#292229]">
              {customer ? `${customer.coins_balance ?? 0} Coins` : "Giftlaya Coins"}
            </strong>
            <span className="text-[10px] text-[#79717c]">
              {customer ? "Wallet balance" : "Sign in to view coins"}
            </span>
          </div>
        </div>

        <Link
          href="/cart"
          className="p-4 rounded-2xl border border-[#eee5e9] bg-white flex items-center gap-3 hover:border-[#9b1b45]"
        >
          <MapPin className="w-5 h-5 text-[#9b1b45]" />
          <div>
            <strong className="block text-xs sm:text-sm font-bold text-[#292229]">Shopping Cart</strong>
            <span className="text-[10px] text-[#79717c]">Review saved gifts</span>
          </div>
        </Link>

        <Link
          href="/contact-us"
          className="p-4 rounded-2xl border border-[#eee5e9] bg-white flex items-center gap-3 hover:border-[#9b1b45]"
        >
          <User className="w-5 h-5 text-blue-600" />
          <div>
            <strong className="block text-xs sm:text-sm font-bold text-[#292229]">Help &amp; Support</strong>
            <span className="text-[10px] text-[#79717c]">+91 81002 48353</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

