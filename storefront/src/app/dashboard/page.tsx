"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Pencil,
  Calendar,
  Clock,
  ArrowUpRight,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useUI } from "@/context/UIContext";
import { API_BASE_URL } from "@/services/api";
import { DashboardSvgIcon } from "@/components/dashboard/DashboardIcons";

interface DashboardOrderSummary {
  id: number;
  orderNumber: string;
  service: string;
  image: string;
  date: string;
  slot: string;
  status: "upcoming" | "completed" | "cancelled";
  total: number;
  paymentFailed: boolean;
}

function mapStatus(raw: string): "upcoming" | "completed" | "cancelled" {
  const s = String(raw || "").toLowerCase();
  if (s === "delivered") return "completed";
  if (s === "cancelled" || s === "refunded") return "cancelled";
  return "upcoming";
}

function statusBadgeLabel(o: DashboardOrderSummary): string {
  if (o.paymentFailed) return "Payment pending";
  if (o.status === "completed") return "Completed";
  if (o.status === "cancelled") return "Cancelled";
  return "Upcoming";
}

export default function DashboardOverviewPage() {
  const { customer, setCustomer } = useUI();
  const [profile, setProfile] = useState<{
    name: string;
    coins_balance: number;
    memberSince: string;
  } | null>(null);
  const [orders, setOrders] = useState<DashboardOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadSeq, setReloadSeq] = useState(0);

  const baseUrl = API_BASE_URL || "http://localhost:8080/api/v1/public";

  useEffect(() => {
    if (!customer?.id) return;
    const ctrl = new AbortController();
    setLoading(true);
    setHasError(false);

    Promise.all([
      fetch(`${baseUrl}/customers/${customer.id}`, { signal: ctrl.signal }).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("profile"))
      ),
      fetch(`${baseUrl}/customers/${customer.id}/orders`, { signal: ctrl.signal }).then(
        (r) => (r.ok ? r.json() : Promise.reject(new Error("orders")))
      ),
    ])
      .then(([prof, ordJson]) => {
        const memberSince = prof?.created_at
          ? new Date(prof.created_at).toLocaleDateString("en-IN", {
              month: "short",
              year: "numeric",
            })
          : "";
        setProfile({
          name: prof?.name || customer.name || "",
          coins_balance: Number(prof?.coins_balance ?? customer.coins_balance ?? 0),
          memberSince,
        });
        if (
          typeof prof?.coins_balance === "number" &&
          prof.coins_balance !== customer.coins_balance
        ) {
          setCustomer({
            ...customer,
            name: prof.name || customer.name,
            phone: prof.phone || customer.phone,
            email: prof.email || customer.email,
            coins_balance: prof.coins_balance,
            created_at: prof.created_at || customer.created_at,
          });
        }
        const items: any[] = Array.isArray(ordJson?.items) ? ordJson.items : [];
        setOrders(
          items.map((o) => {
            const firstItem = Array.isArray(o.items) && o.items[0] ? o.items[0] : null;
            return {
              id: Number(o.id),
              orderNumber: o.order_number || `GL-${o.id}`,
              service:
                firstItem?.product_title_snapshot ||
                firstItem?.product_title ||
                `Order ${o.order_number || ""}`,
              image: o.primary_image_url || "",
              date: o.delivery_date ? String(o.delivery_date).slice(0, 10) : "",
              slot:
                o.slot_label ||
                o.delivery_slot_label ||
                firstItem?.personalization_json?.delivery_slot ||
                "",
              status: mapStatus(o.status),
              total: Math.round((o.total_paise || 0) / 100),
              paymentFailed: String(o.payment_status || "").toLowerCase() === "failed",
            };
          })
        );
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setHasError(true);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [customer?.id, reloadSeq]);

  const rawName = profile?.name?.trim() || customer?.name?.trim() || "there";
  const firstName = rawName.split(/\s+/)[0];
  const initials =
    rawName
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "G";

  const upcomingOrders = orders.filter((o) => o.status === "upcoming");
  const completedOrders = orders.filter((o) => o.status === "completed");
  const latestBooking = upcomingOrders[0];
  const coinsBalance = profile?.coins_balance ?? customer?.coins_balance ?? 0;

  return (
    <div className="grid gap-4">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.1em] text-[#a18e9c] mb-1">
            Your Giftlaya
          </p>
          <h1 className="text-[21px] font-semibold tracking-[-0.035em] leading-[1.4] text-[#352c36]">
            My dashboard
          </h1>
          <p className="text-xs text-[#887c89] mt-1 leading-relaxed">
            Your orders, little rewards &amp; happy moments.
          </p>
        </div>
        <DashboardSvgIcon kind="gift" size={44} />
      </header>

      {/* Welcome & 3-Stat Card */}
      <section
        className="bg-white border border-[#e9e2e9] rounded-[18px] overflow-hidden"
        aria-label="Account overview"
      >
        <div className="flex items-center gap-3.5 px-4 py-5">
          <span className="w-12 h-12 rounded-[16px] bg-[#fceef4] border border-[#f4dbe6] text-[#a82b5b] grid place-items-center text-base font-semibold shrink-0">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-[#8c7c8a] mb-0.5">Welcome back</p>
            <h2 className="text-[18px] font-semibold tracking-[-0.035em] text-[#292229] break-words">
              Hello, {firstName}
            </h2>
            {profile?.memberSince && (
              <small className="block text-[10px] text-[#9c8e9b] mt-1">
                Member since {profile.memberSince}
              </small>
            )}
          </div>
          <Link
            href="/dashboard/account-settings"
            aria-label="Edit your profile"
            className="w-9 h-9 rounded-[11px] border border-[#e8dfe8] grid place-items-center text-[#8f6d86] hover:border-[#dcb9cd] hover:text-[#a72958] shrink-0"
          >
            <Pencil className="w-[15px] h-[15px]" />
          </Link>
        </div>

        <div className="grid grid-cols-3 border-t border-[#f0eaef] py-4">
          {[
            { label: "Total orders", value: orders.length.toLocaleString("en-IN") },
            { label: "Upcoming", value: upcomingOrders.length.toLocaleString("en-IN") },
            { label: "Completed", value: completedOrders.length.toLocaleString("en-IN") },
          ].map((stat, idx) => (
            <div
              key={stat.label}
              className={`px-2 text-center ${idx < 2 ? "border-r border-[#f0eaef]" : ""}`}
            >
              <strong className="block text-sm sm:text-[18px] font-semibold tracking-[-0.025em] text-[#292229]">
                {loading || hasError ? "—" : stat.value}
              </strong>
              <span className="block text-[10px] text-[#938495] mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4 Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { href: "/dashboard/orders", icon: "orders" as const, label: "Track order" },
          {
            href: "/dashboard/account-settings#addresses",
            icon: "address" as const,
            label: "Addresses",
          },
          { href: "/", icon: "gift" as const, label: "Shop gifts" },
          { href: "/dashboard/support", icon: "support" as const, label: "Get help" },
        ].map((q) => (
          <Link
            key={q.label}
            href={q.href}
            className="flex flex-col lg:flex-row items-center justify-center gap-1.5 px-1 lg:px-2 py-3 border border-[#eae3ea] hover:border-[#dcb9cd] bg-white rounded-[14px] text-center text-[10px] lg:text-[11px] text-[#635366]"
          >
            <DashboardSvgIcon kind={q.icon} size={34} />
            <span>{q.label}</span>
          </Link>
        ))}
      </div>

      {hasError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 text-[11px] px-3 py-2.5 rounded-[10px] bg-[#fff1f4] text-[#b4405b]"
        >
          <span>We couldn&apos;t load your account right now.</span>
          <button
            type="button"
            onClick={() => setReloadSeq((n) => n + 1)}
            className="inline-flex items-center gap-1 font-semibold text-[#a72958] cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Main Overview 2-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-4 items-start">
        {/* Left: Latest Booking + Recent Orders */}
        <div className="grid gap-4">
          {loading ? (
            <div
              role="status"
              aria-label="Loading your orders"
              className="bg-white border border-[#e9e2e9] rounded-[18px] p-5 grid gap-3 min-h-[145px]"
            >
              <span className="h-3 rounded-lg bg-[#f3eef3] animate-pulse" />
              <span className="h-3 rounded-lg bg-[#f3eef3] animate-pulse" />
              <span className="h-3 w-2/3 rounded-lg bg-[#f3eef3] animate-pulse" />
            </div>
          ) : !hasError && latestBooking ? (
            <section className="bg-white border border-[#e9e2e9] rounded-[18px] overflow-hidden">
              <div className="px-4 py-3.5 flex items-center justify-between gap-2 border-b border-[#f0eaef]">
                <h2 className="text-[13px] font-semibold text-[#292229]">Latest booking</h2>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] rounded-md px-2 py-1 ${
                    latestBooking.paymentFailed
                      ? "bg-[#fff5e8] text-[#a97a37]"
                      : "bg-[#eef8f3] text-[#62857a]"
                  }`}
                >
                  {statusBadgeLabel(latestBooking)}
                </span>
              </div>

              <div className="flex gap-3 items-center p-4">
                {latestBooking.image ? (
                  <Image
                    src={latestBooking.image}
                    alt={latestBooking.service}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-xl object-cover bg-[#f8f4f8] shrink-0"
                  />
                ) : (
                  <DashboardSvgIcon kind="orders" size={64} />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-semibold text-[#292229] leading-snug">
                    {latestBooking.service}
                  </h3>
                  {latestBooking.date && (
                    <p className="flex items-center gap-1.5 text-[11px] text-[#8c7d90] mt-1">
                      <Calendar className="w-3 h-3" /> {latestBooking.date}
                    </p>
                  )}
                  {latestBooking.slot && (
                    <p className="flex items-center gap-1.5 text-[11px] text-[#8c7d90] mt-0.5">
                      <Clock className="w-3 h-3" /> {latestBooking.slot}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[#f0eaef] px-4 py-3">
                <div>
                  <span className="text-[10px] text-[#8d7b8e]">Order total</span>
                  <strong className="block text-[15px] font-semibold text-[#292229]">
                    ₹{latestBooking.total.toLocaleString("en-IN")}
                  </strong>
                </div>
                <Link
                  href="/dashboard/orders"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#a72958]"
                >
                  <span>View booking</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </section>
          ) : (
            <section className="bg-white border border-[#e9e2e9] rounded-[18px] py-7 px-5 flex flex-col items-center text-center">
              <DashboardSvgIcon kind="gift" size={60} />
              <h2 className="text-sm font-semibold text-[#292229] mt-3">
                Your next happy moment awaits
              </h2>
              <p className="text-xs text-[#918093] leading-relaxed mt-1.5 mb-4 max-w-[270px]">
                No upcoming orders. Find something lovely for someone you love.
              </p>
              <Link
                href="/"
                className="min-h-[44px] rounded-[11px] bg-[#a72055] hover:bg-[#901a48] text-white text-xs font-semibold px-4 inline-flex items-center gap-1.5"
              >
                <span>Explore gifts</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </section>
          )}

          {!loading && !hasError && orders.length > 0 && (
            <section className="bg-white border border-[#e9e2e9] rounded-[18px] p-4">
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-sm font-semibold text-[#292229]">Recent orders</h2>
                <Link
                  href="/dashboard/orders"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#a72958]"
                >
                  <span>View all</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {orders.slice(0, 3).map((ord) => (
                <Link
                  key={ord.id}
                  href="/dashboard/orders"
                  className="flex items-center gap-2.5 py-3 border-t border-[#f1ebf0] hover:bg-[#faf8fa]/60"
                >
                  {ord.image ? (
                    <Image
                      src={ord.image}
                      alt={ord.service}
                      width={42}
                      height={42}
                      className="w-[42px] h-[42px] rounded-[9px] object-cover shrink-0"
                    />
                  ) : (
                    <DashboardSvgIcon kind="orders" size={42} />
                  )}
                  <div className="min-w-0 flex-1">
                    <strong className="block text-xs font-semibold text-[#292229] truncate">
                      {ord.service}
                    </strong>
                    <p className="text-[10px] text-[#908194] mt-0.5">
                      {statusBadgeLabel(ord)}
                      {ord.date ? ` · ${ord.date}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#908194] shrink-0" />
                </Link>
              ))}
            </section>
          )}
        </div>

        {/* Right: Reward Balance + A little help? */}
        <div className="grid gap-4">
          <Link
            href="/dashboard/rewards"
            className="block rounded-[18px] border border-[#f0e2be] bg-gradient-to-br from-[#fff8e7] via-[#fffdf5] to-white p-4 hover:border-[#dfca95] transition-colors"
          >
            <div className="flex items-center gap-3">
              <DashboardSvgIcon kind="coins" size={46} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-[#987e4e]">Your reward balance</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <strong className="text-[22px] font-semibold text-[#775328]">
                    {loading || hasError ? "—" : coinsBalance.toLocaleString("en-IN")}
                  </strong>
                  <small className="text-[11px] text-[#a0875b]">coins</small>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#987e4e] shrink-0" />
            </div>
            <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#f1e6ce] text-[11px] text-[#987f50]">
              <span>Little rewards for happy moments</span>
              <span className="font-semibold">View rewards</span>
            </div>
          </Link>

          <section className="bg-white border border-[#e9e2e9] rounded-[18px] p-4 space-y-3.5">
            <div className="flex items-center gap-3">
              <DashboardSvgIcon kind="support" />
              <div className="min-w-0 flex-1">
                <h2 className="text-[13px] font-semibold text-[#292229]">A little help?</h2>
                <p className="text-[11px] text-[#8c7e91] mt-0.5 leading-relaxed">
                  We&apos;re here for you and your celebrations.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="tel:+918100248353"
                className="flex-1 min-h-[44px] rounded-[11px] border border-[#e4d9e4] bg-white text-[#876680] hover:border-[#dcb9cd] text-xs font-semibold inline-flex items-center justify-center px-3"
              >
                Call our team
              </a>
              <Link
                href="/dashboard/support"
                className="flex-1 min-h-[36px] text-[11px] font-semibold text-[#a72958] inline-flex items-center justify-center gap-1"
              >
                <span>Raise a ticket</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
