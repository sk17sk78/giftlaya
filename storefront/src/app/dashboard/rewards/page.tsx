"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, Sparkles, ArrowUpRight, ArrowDownLeft, Info, Tag } from "lucide-react";
import { useUI } from "@/context/UIContext";
import { API_BASE_URL } from "@/services/api";

interface CoinTx {
  id: number;
  delta: number;
  tx_type: string;
  note: string;
  order_number?: string;
  created_at: string;
  balance_after: number;
}

export default function DashboardRewardsPage() {
  const { customer } = useUI();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(customer?.coins_balance ?? 0);
  const [earnedTotal, setEarnedTotal] = useState(0);
  const [redeemedTotal, setRedeemedTotal] = useState(0);
  const [pendingCoins, setPendingCoins] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [earnPercent, setEarnPercent] = useState(10);
  const [maxRedeemPercent, setMaxRedeemPercent] = useState(25);
  const [transactions, setTransactions] = useState<CoinTx[]>([]);

  const baseUrl = API_BASE_URL || "http://localhost:8080/api/v1/public";

  useEffect(() => {
    if (!customer?.id) return;
    setLoading(true);
    fetch(`${baseUrl}/customers/${customer.id}/coins`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setBalance(Number(d.balance_coins ?? 0));
        setEarnedTotal(Number(d.earned_total ?? 0));
        setRedeemedTotal(Number(d.redeemed_total ?? 0));
        setPendingCoins(Number(d.pending_coins ?? 0));
        setPendingOrdersCount(Number(d.pending_orders_count ?? 0));
        setEarnPercent(Number(d.earn_percent ?? 10));
        setMaxRedeemPercent(Number(d.max_redeem_percent ?? 25));
        setTransactions(Array.isArray(d.transactions) ? d.transactions : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [baseUrl, customer?.id]);

  const txMeta = (type: string) => {
    switch (type) {
      case "redeem":
        return {
          label: "Redeemed on order",
          tint: "bg-[#fceef4]",
          fg: "text-[#a72055]",
          Icon: ArrowUpRight,
        };
      case "refund_clawback":
        return {
          label: "Order adjustment",
          tint: "bg-gray-100",
          fg: "text-gray-600",
          Icon: ArrowUpRight,
        };
      case "admin_adjust":
        return {
          label: "Account reward credit",
          tint: "bg-amber-50",
          fg: "text-amber-600",
          Icon: Sparkles,
        };
      default:
        return {
          label: "Earned coins",
          tint: "bg-emerald-50",
          fg: "text-emerald-600",
          Icon: ArrowDownLeft,
        };
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
          <Coins className="w-[19px] h-[19px] text-amber-500" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h1 className="text-[21px] font-extrabold tracking-tight text-gray-900 leading-tight">
            My Rewards
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Coin balance &amp; statement</p>
        </div>
      </div>

      {/* Deep Maroon Wallet Balance Hero Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#9b1b45] via-[#83153a] to-[#68102d] p-5 shadow-lg">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-1.5 text-white/75 text-[11.5px] font-semibold">
            <Coins className="w-3.5 h-3.5" /> COIN BALANCE
          </div>
          {loading ? (
            <div className="h-9 w-40 mt-2 rounded-full bg-white/20 animate-pulse" />
          ) : (
            <div className="flex items-end gap-2 mt-1.5">
              <p className="text-white text-[34px] font-black leading-none tracking-tight">
                {balance.toLocaleString("en-IN")}
              </p>
              <p className="text-white/75 text-[13px] font-semibold mb-1">coins</p>
            </div>
          )}
          <p className="text-white/70 text-[11.5px] mt-1.5">
            Worth ₹{balance.toLocaleString("en-IN")} · 1 coin = ₹1
          </p>

          {!loading && pendingCoins > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3 py-1.5">
              <Sparkles className="w-3 h-3 text-white/85" />
              <span className="text-white text-xs font-bold">
                +{pendingCoins.toLocaleString("en-IN")} coins on the way
              </span>
            </div>
          )}

          <div className="relative mt-4 grid grid-cols-2 gap-2.5">
            <div className="bg-white/12 border border-white/15 rounded-2xl px-3.5 py-2.5">
              <div className="flex items-center gap-1.5 text-white/70 text-[10px] font-bold uppercase tracking-wide">
                <ArrowDownLeft className="w-3 h-3" /> Earned
              </div>
              <p className="text-white font-extrabold text-base mt-0.5">
                {loading ? "–" : earnedTotal.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-white/12 border border-white/15 rounded-2xl px-3.5 py-2.5">
              <div className="flex items-center gap-1.5 text-white/70 text-[10px] font-bold uppercase tracking-wide">
                <ArrowUpRight className="w-3 h-3" /> Redeemed
              </div>
              <p className="text-white font-extrabold text-base mt-0.5">
                {loading ? "–" : redeemedTotal.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {!loading && pendingCoins > 0 && (
        <section className="flex items-center gap-3.5 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-100 p-4">
          <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shrink-0 shadow-md shadow-amber-200/50">
            <Sparkles className="w-5 h-5 text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11.5px] font-bold text-amber-700 uppercase tracking-wide">
              Coins on the way
            </p>
            <p className="text-[19px] font-extrabold text-gray-900 leading-tight">
              +{pendingCoins.toLocaleString("en-IN")}{" "}
              <span className="text-xs font-semibold text-gray-500">
                coins · ₹{pendingCoins.toLocaleString("en-IN")}
              </span>
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              From {pendingOrdersCount} upcoming order
              {pendingOrdersCount === 1 ? "" : "s"} · credited once completed
            </p>
          </div>
        </section>
      )}

      {/* How coins work */}
      <section className="bg-white rounded-3xl border border-[#e9e2e9] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-3.5 h-3.5 text-[#a72055]" />
          <p className="text-[13px] font-bold text-gray-900">How coins work</p>
        </div>
        <div className="flex flex-col gap-2.5 text-xs text-gray-600">
          <div className="flex items-start gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-[#fdf0f6] flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-[#a72055]" />
            </span>
            <p className="leading-relaxed">
              Earn <b className="text-gray-900">{earnPercent}% coins</b> on every order — credited once it&apos;s <b className="text-gray-900">completed</b>.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-[#fdf0f6] flex items-center justify-center shrink-0">
              <Tag className="w-3.5 h-3.5 text-[#a72055]" />
            </span>
            <p className="leading-relaxed">
              Redeem up to <b className="text-gray-900">{maxRedeemPercent}% of cart value</b> on each new order.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-[#fdf0f6] flex items-center justify-center shrink-0">
              <Coins className="w-3.5 h-3.5 text-[#a72055]" />
            </span>
            <p className="leading-relaxed">
              <b className="text-gray-900">1 coin = ₹1.</b> Coins never expire.
            </p>
          </div>
        </div>
      </section>

      {/* Coin Statement */}
      <section className="bg-white rounded-3xl border border-[#e9e2e9] overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <p className="text-[13.5px] font-bold text-gray-900">Coin Statement</p>
        </div>
        {loading ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3].map((k) => (
              <div key={k} className="px-4 py-3.5 flex justify-between animate-pulse">
                <div className="h-3 w-1/2 bg-gray-100 rounded" />
                <div className="h-3 w-12 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
              <Coins className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-sm font-bold text-gray-700">No coins yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Place an order to start earning {earnPercent}% back in coins
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#a72055] text-white text-[13px] font-bold rounded-xl"
            >
              Browse Decorations
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => {
              const m = txMeta(tx.tx_type);
              const IconComp = m.Icon;
              const isCredit = tx.delta > 0;
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span
                    className={`w-9 h-9 rounded-xl ${m.tint} flex items-center justify-center shrink-0`}
                  >
                    <IconComp className={`w-4 h-4 ${m.fg}`} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 leading-tight">
                      {tx.note || m.label}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {new Date(tx.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {tx.order_number ? ` · #${tx.order_number}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-extrabold ${
                        isCredit ? "text-emerald-600" : "text-gray-900"
                      }`}
                    >
                      {isCredit ? `+${tx.delta}` : tx.delta}
                    </p>
                    <p className="text-[10.5px] text-gray-400 mt-0.5">
                      Bal {tx.balance_after.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

