"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Store, User, Lock, Eye, EyeOff, CheckCircle2, KeyRound } from "lucide-react";

const ADMIN_API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1/public").replace(/\/public$/, "/admin");
const ADMIN_WEB_URL = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:5173";

export default function SellerLoginPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${ADMIN_API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginId.trim(),
          password,
          code: accessCode.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Invalid seller credentials or access code.");
      }
      setStatusMsg({ type: "ok", text: "Signed in! Redirecting to Partner Admin Console..." });
      const targetUrl =
        json?.tokens?.access_token && json?.tokens?.refresh_token
          ? `${ADMIN_WEB_URL}/cms#cms_auth=${encodeURIComponent(JSON.stringify(json.tokens))}`
          : `${ADMIN_WEB_URL}/cms/login`;
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 600);
    } catch (err) {
      setStatusMsg({
        type: "err",
        text: (err as Error).message || "Invalid seller credentials.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] bg-[#f7f6fa] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Badge Icon */}
        <div className="w-12 h-12 rounded-2xl bg-[#a7194b] text-white grid place-items-center mx-auto shadow-md">
          <Store className="w-6 h-6" />
        </div>

        <div>
          <h1 className="font-heading text-2xl font-extrabold text-[#292229]">
            Giftlaya Seller Portal
          </h1>
          <p className="text-xs sm:text-sm text-[#79717c] mt-1">
            Sign in to manage your catalog and orders.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-[#eae5e9] rounded-3xl p-6 sm:p-7 shadow-sm text-left space-y-4">
          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                statusMsg.type === "ok"
                  ? "bg-[#edf8f2] border-[#b9e2cb] text-[#194c35]"
                  : "bg-rose-50 border-rose-200 text-rose-700"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="relative">
              <User className="w-4 h-4 text-[#8d7b87] absolute left-3.5 top-3.5" />
              <input
                required
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Login ID or email"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e3dee6] bg-[#faf9fb] text-sm outline-none focus:border-[#9b1b45] focus:bg-white transition-colors"
              />
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 text-[#8d7b87] absolute left-3.5 top-3.5" />
              <input
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#e3dee6] bg-[#faf9fb] text-sm outline-none focus:border-[#9b1b45] focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label="Toggle password visibility"
                className="absolute right-3.5 top-3.5 text-[#8d7b87] hover:text-[#292229]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#8d7b87] absolute left-3.5 top-3.5" />
              <input
                required
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Partner Access Code"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e3dee6] bg-[#faf9fb] text-sm outline-none focus:border-[#9b1b45] focus:bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#a7194b] hover:bg-[#89113b] text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-xs text-[#79717c] pt-1">
            Forgot your password?{" "}
            <Link href="/contact-us" className="text-[#9b1b45] font-semibold hover:underline">
              Contact partner support
            </Link>
          </p>
        </div>

        <div className="space-y-1.5 text-xs text-[#79717c]">
          <p>
            Not a seller yet?{" "}
            <Link href="/seller/registration" className="text-[#9b1b45] font-bold hover:underline">
              Apply to sell on Giftlaya
            </Link>
          </p>
          <p>
            <Link href="/about-us" className="hover:underline">
              How selling on Giftlaya works
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

