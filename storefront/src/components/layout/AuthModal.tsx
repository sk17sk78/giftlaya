"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { postPublicAPI } from "@/services/api";
import { X, ArrowRight, CheckCircle2, MessageSquare, Mail, MessageCircle } from "lucide-react";

type AuthChannel = "whatsapp" | "sms" | "email";

export function AuthModal() {
  const { isAuthOpen, closeAuth, setCustomer } = useApp();
  const [channel, setChannel] = useState<AuthChannel>("whatsapp");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"input" | "otp" | "success">("input");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isAuthOpen) return null;

  const channelLabel =
    channel === "whatsapp" ? "WhatsApp" : channel === "sms" ? "SMS" : "Email";

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = channel === "email" ? email.trim() : phone.trim();
    if (channel === "email") {
      if (!target.includes("@")) {
        setError("Please enter a valid email address");
        return;
      }
    } else if (target.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await postPublicAPI<{ dev_otp?: string }>("/auth/otp/request", {
        channel,
        target,
      });
      if (res?.dev_otp) setOtp(res.dev_otp);
      setStep("otp");
    } catch {
      setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      setError("Please enter a valid OTP");
      return;
    }
    setError("");
    setLoading(true);
    const target = channel === "email" ? email.trim() : phone.trim();
    try {
      const res = await postPublicAPI<{ customer?: any }>("/auth/otp/verify", {
        channel,
        target,
        otp,
      });
      if (res?.customer) {
        setCustomer(res.customer);
      }
      setStep("success");
      setTimeout(() => {
        closeAuth();
        setStep("input");
        setPhone("");
        setEmail("");
        setOtp("");
      }, 900);
    } catch (err) {
      setError((err as Error).message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const otherChannels = (["whatsapp", "sms", "email"] as AuthChannel[]).filter(
    (c) => c !== channel
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[rgba(37,23,35,0.5)] backdrop-blur-[4px]"
        onClick={closeAuth}
        aria-hidden="true"
      />

      {/* Modal Dialog Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className="relative w-full max-w-[420px] bg-white rounded-[24px] shadow-2xl z-10 overflow-hidden border border-[#f0e9ec]"
      >
        {/* Top Brand + Close Header matching Giftlaya */}
        <header className="flex items-center justify-between px-6 pt-5 pb-3">
          <span className="font-heading text-[20px] font-extrabold tracking-tight text-[#9b1b45]">
            giftlaya
          </span>
          <button
            type="button"
            onClick={closeAuth}
            aria-label="Close sign in"
            className="w-9 h-9 rounded-xl border border-[#e3d7dd] flex items-center justify-center text-[#70636c] hover:bg-[#faf3f6] hover:text-[#9b1b45] transition-colors cursor-pointer"
          >
            <X className="w-[17px] h-[17px]" />
          </button>
        </header>

        <div className="px-6 pb-6 pt-1">
          {step === "input" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              {/* Illustration + Heading */}
              <div>
                <div className="mb-3">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                <h2 id="login-title" className="font-heading text-[22px] font-bold text-[#29232a] tracking-tight">
                  Welcome to Giftlaya
                </h2>
                <p className="text-[12px] sm:text-[13px] text-[#70636c] mt-1">
                  Sign in to track your orders and plan your next surprise.
                </p>
              </div>

              {/* Channel note */}
              <p className="flex items-center gap-2 text-[12px] font-medium text-[#6f5e69]">
                {channel === "whatsapp" ? (
                  <MessageCircle className="w-4 h-4 text-[#7c61a3]" />
                ) : channel === "sms" ? (
                  <MessageSquare className="w-4 h-4 text-[#9b1b45]" />
                ) : (
                  <Mail className="w-4 h-4 text-[#9b1b45]" />
                )}
                <span>We&apos;ll send a code via {channelLabel}</span>
              </p>

              {/* Input field */}
              <div>
                <label className="block text-[12px] font-semibold text-[#3f303a] mb-1.5">
                  {channel === "email" ? "Email address" : "Mobile number"}
                </label>
                {channel === "email" ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-3.5 py-3 text-[14px] text-[#29232a] rounded-xl border border-[#e2d7dd] bg-white focus:outline-none focus:border-[#9b1b45]"
                  />
                ) : (
                  <div className="flex items-center rounded-xl border border-[#e2d7dd] bg-white overflow-hidden focus-within:border-[#9b1b45]">
                    <span className="px-3.5 py-3 text-[13px] font-semibold text-[#503d49] border-r border-[#eee5ea] flex items-center gap-1.5 shrink-0">
                      <small className="text-[10px] font-bold text-[#9a8692]">IN</small>
                      <span>+91</span>
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="10-digit mobile number"
                      required
                      className="flex-1 min-w-0 px-3.5 py-3 text-[14px] font-medium text-[#29232a] bg-transparent focus:outline-none"
                    />
                  </div>
                )}
                {error && <p className="text-[11px] text-[#d32f2f] mt-1.5">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#a3194d] hover:bg-[#891640] text-white font-semibold text-[13px] transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
              >
                <span>{loading ? "Sending code..." : "Send verification code"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Alternative methods */}
              <div>
                <div className="flex items-center gap-3 my-2">
                  <span className="h-px flex-1 bg-[#f0e9ec]" />
                  <span className="text-[11px] text-[#9b8a95]">Or use another way</span>
                  <span className="h-px flex-1 bg-[#f0e9ec]" />
                </div>
                <div className="grid grid-cols-2 gap-2.5 mt-2.5" role="group" aria-label="Sign-in methods">
                  {otherChannels.map((alt) => (
                    <button
                      key={alt}
                      type="button"
                      onClick={() => {
                        setChannel(alt);
                        setError("");
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#e7dee3] bg-white hover:border-[#9b1b45] text-[12px] font-medium text-[#47333e] transition-colors cursor-pointer"
                    >
                      {alt === "whatsapp" ? (
                        <MessageCircle className="w-4 h-4" />
                      ) : alt === "sms" ? (
                        <MessageSquare className="w-4 h-4" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      <span>{alt === "whatsapp" ? "WhatsApp" : alt === "sms" ? "SMS" : "Email"}</span>
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-[#9a8996] text-center pt-1 leading-relaxed">
                By continuing, you agree to our{" "}
                <Link href="/pages/terms-and-conditions" onClick={closeAuth} className="underline hover:text-[#9b1b45]">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/pages/privacy-policy" onClick={closeAuth} className="underline hover:text-[#9b1b45]">
                  Privacy Policy
                </Link>
                .
              </p>

              <div className="pt-3 border-t border-[#f0e9ec] flex items-center justify-center gap-4 text-[11px] font-semibold text-[#9b1b45]">
                <Link href="/dashboard/orders" onClick={closeAuth} className="hover:underline">
                  My Orders
                </Link>
                <span className="text-[#dfd5da]">·</span>
                <Link href="/seller/login" onClick={closeAuth} className="hover:underline">
                  Seller Portal
                </Link>
              </div>
            </form>
          )}

          {step === "otp" && (
            <div className="pt-2">
              <h2 className="font-heading text-[22px] font-bold text-[#29232a] tracking-tight">
                Enter verification code
              </h2>
              <p className="text-[12px] sm:text-[13px] text-[#70636c] mt-1 mb-5">
                Code sent via {channelLabel} to{" "}
                <strong>{channel === "email" ? email : `+91 ${phone}`}</strong>.
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 4 or 6 digit OTP"
                    className="w-full tracking-widest text-center py-3 text-[20px] font-bold text-[#29232a] rounded-xl border border-[#e2d7dd] bg-[#fffbfd] focus:outline-none focus:border-[#9b1b45]"
                    required
                  />
                  {error && <p className="text-[11px] text-[#d32f2f] mt-1.5 text-center">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 4}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#a3194d] hover:bg-[#891640] text-white font-semibold text-[13px] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? "Verifying..." : "Verify & Sign In"}</span>
                </button>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <button
                    type="button"
                    onClick={() => setStep("input")}
                    className="text-[#9b1b45] font-semibold hover:underline cursor-pointer"
                  >
                    Change {channel === "email" ? "email" : "number"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    className="text-[#70636c] hover:underline cursor-pointer"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === "success" && (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#ecf8f1] text-[#26845f] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-[20px] font-bold text-[#292229]">
                Welcome back!
              </h3>
              <p className="text-[12px] text-[#70636c]">
                You have successfully signed in.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
