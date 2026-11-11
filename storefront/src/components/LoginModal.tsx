"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { sendOtp } from "@/lib/api";
import { X, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LoginModal() {
  const { isAuthOpen, closeAuth } = useApp();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "success">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isAuthOpen) return null;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setError("");
    setLoading(true);
    await sendOtp(phone);
    setLoading(false);
    setStep("otp");
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      setError("Please enter the 4-digit code");
      return;
    }
    setError("");
    setStep("success");
    setTimeout(() => {
      closeAuth();
      setStep("phone");
      setPhone("");
      setOtp("");
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity"
        onClick={closeAuth}
      />

      {/* Dialog Shell */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sign in"
        className="relative w-full max-w-[440px] bg-white rounded-3xl shadow-2xl flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-[#f0e9ec]">
          <span className="text-[20px] font-black tracking-tight text-[#9b1b45]">
            giftlaya
          </span>
          <button
            type="button"
            onClick={closeAuth}
            aria-label="Close sign-in"
            className="w-8 h-8 rounded-full border border-[#eae3e8] flex items-center justify-center text-[#70636c] hover:bg-[#faf3f6] hover:text-[#9b1b45] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === "phone" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="text-center flex flex-col items-center">
                {/* Smartphone illustration */}
                <div className="w-16 h-16 rounded-2xl bg-[#fdf2f5] border border-[#f8c2d2] flex items-center justify-center mb-3">
                  <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                    <rect x="9" y="4" width="27" height="39" rx="8" fill="#F3EBFA" stroke="#A382BB" strokeWidth="1.5" />
                    <path d="M19 9h7M21 38h3" stroke="#A382BB" strokeWidth="2" />
                    <rect x="15" y="16" width="27" height="17" rx="5" fill="#FFF6DF" stroke="#D5A24D" strokeWidth="1.5" />
                    <circle cx="23" cy="24.5" r="1.5" fill="#C99845" />
                    <circle cx="29" cy="24.5" r="1.5" fill="#C99845" />
                    <circle cx="35" cy="24.5" r="1.5" fill="#C99845" />
                    <path d="m40 5 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" fill="#DA87A8" />
                    <circle cx="5" cy="33" r="2" fill="#DA87A8" />
                  </svg>
                </div>

                <h2 className="font-heading text-[19px] font-bold text-[#29232a]">
                  Welcome to Giftlaya
                </h2>
                <p className="text-[12px] text-[#70636c] mt-1 max-w-xs">
                  Sign in to track your orders and plan your next surprise.
                </p>
              </div>

              {/* WhatsApp notice */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#1f7a4d] bg-[#eefaf4] py-1.5 px-3 rounded-xl border border-[#d2f3e3]">
                <span>We&apos;ll send a verification code via WhatsApp</span>
              </div>

              {/* Input field */}
              <div>
                <label htmlFor="login-phone" className="block text-[12px] font-semibold text-[#34212a] mb-1.5">
                  Mobile number
                </label>
                <div className="flex items-center border border-[#e4dae0] rounded-2xl overflow-hidden focus-within:border-[#9b1b45] focus-within:ring-1 focus-within:ring-[#9b1b45] bg-[#faf7f9] transition-all">
                  <span className="px-3.5 py-3 text-[13px] font-bold text-[#49333f] border-r border-[#e4dae0] bg-[#f5eff2]">
                    <span className="text-[10px] text-[#8d7b87] mr-1">IN</span>+91
                  </span>
                  <input
                    id="login-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit mobile number"
                    className="flex-1 px-3.5 py-3 bg-transparent text-[14px] text-[#29232a] focus:outline-none"
                  />
                </div>
                {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#9b1b45] hover:bg-[#7d1538] text-white text-[13px] font-bold transition-all shadow-md disabled:opacity-50"
              >
                <span>{loading ? "Sending code..." : "Send verification code"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[10px] text-center text-[#8d7b87] leading-relaxed pt-2">
                By continuing, you agree to our Terms of Service &amp; Privacy Policy.
              </p>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center">
                <h3 className="font-heading text-[18px] font-bold text-[#29232a]">
                  Verify your number
                </h3>
                <p className="text-[12px] text-[#70636c] mt-1">
                  Enter the 4-digit code sent to <strong>+91 {phone}</strong>
                </p>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter code"
                  className="w-full text-center tracking-[0.5em] text-[20px] font-bold py-3 rounded-2xl border border-[#e4dae0] focus:border-[#9b1b45] focus:outline-none bg-[#faf7f9]"
                />
                {error && <p className="text-[11px] text-red-600 mt-1 text-center">{error}</p>}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-[#9b1b45] hover:bg-[#7d1538] text-white text-[13px] font-bold transition-all shadow-md"
              >
                Confirm &amp; Continue
              </button>

              <button
                type="button"
                onClick={() => setStep("phone")}
                className="w-full text-[11px] text-[#9b1b45] font-semibold hover:underline text-center block"
              >
                Change mobile number
              </button>
            </form>
          )}

          {step === "success" && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-[#47816b] mx-auto animate-bounce" />
              <h3 className="text-[18px] font-bold text-[#29232a]">
                Signed In Successfully!
              </h3>
              <p className="text-[12px] text-[#70636c]">
                Welcome back to Giftlaya.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
