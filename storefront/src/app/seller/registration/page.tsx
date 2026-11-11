"use client";

import React, { useState } from "react";
import Link from "next/link";
import { postPublicAPI } from "@/services/api";
import { Store, Users, ArrowRight, Check, CheckCircle2, MessageCircle } from "lucide-react";

export default function SellerRegistrationPage() {
  const [partnerType, setPartnerType] = useState<"products" | "services">("products");
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Proprietorship");
  const [city, setCity] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }
    try {
      await postPublicAPI("/inquiries", {
        inquiry_type: "seller_request",
        name: businessName,
        phone: contactPhone,
        email: contactEmail,
        city,
        subject: `${partnerType} Partner (${businessType})`,
        message: `Seller registration request from ${businessName} in ${city}`,
        metadata: { partner_type: partnerType, business_type: businessType },
      });
    } catch {
      // fallback
    }
    setSubmitted(true);
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1152px] mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-10">
        {/* Top Row */}
        <div className="flex items-center justify-between text-xs text-[#79717c]">
          <div className="flex items-center gap-2">
            <Link href="/" className="hover:text-[#9b1b45]">Home</Link>
            <span>›</span>
            <span className="text-[#292229] font-medium">Become a partner</span>
          </div>
          <Link href="/seller/login" className="font-semibold text-[#9b1b45] inline-flex items-center gap-1">
            Partner login <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Hero */}
        <section className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9b1b45]">
            THE GIFTLAYA PARTNER PROGRAM
          </p>
          <h1 className="font-heading text-3xl sm:text-5xl font-extrabold leading-tight text-[#292229]">
            Your craft.
            <br />
            <span className="text-[#9b1b45]">More happy customers.</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#625865] max-w-xl">
            Make beautiful things or bring celebrations to life? Let&apos;s grow your business together across 100+ cities in India.
          </p>
          <div className="flex flex-wrap gap-4 pt-1 text-xs font-medium text-[#4a3f4e]">
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-4 h-4 text-[#246448]" /> Free to apply
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-4 h-4 text-[#246448]" /> Personal onboarding support
            </span>
          </div>
        </section>

        {/* Main 2-Col Onboarding & Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Steps */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9b1b45]">
                A SIMPLE START
              </p>
              <h2 className="text-xl font-bold text-[#292229] mt-1">
                From your application to your first opportunity.
              </h2>
            </div>

            <div className="space-y-4">
              {[
                { n: 1, title: "Tell us about your business", desc: "Choose your partner type and share your details." },
                { n: 2, title: "Meet your partnerships team", desc: "We review your application within 2–3 business days." },
                { n: 3, title: "Get ready for your first order", desc: "Once approved, we'll help you with the next steps." },
              ].map((s) => (
                <div key={s.n} className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#fcf2f6] border border-[#f0dce5] text-[#9b1b45] text-xs font-bold grid place-items-center shrink-0">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#292229]">{s.title}</h3>
                    <p className="text-xs text-[#625865] mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="https://wa.me/918100248353?text=Seller%20Partnership%20Enquiry"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-2xl border border-[#eee5e9] bg-white hover:border-[#9b1b45] transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-[#16805a]" />
                <div>
                  <strong className="block text-xs font-bold text-[#292229]">
                    A question before you apply?
                  </strong>
                  <span className="text-[11px] text-[#79717c]">Chat with our partnerships team</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#9b8b95]" />
            </a>
          </div>

          {/* Right Application Card */}
          <div className="lg:col-span-7 bg-white border border-[#eae5e9] rounded-3xl p-5 sm:p-7 shadow-sm">
            {submitted ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-[#246448] mx-auto" />
                <h3 className="text-xl font-bold text-[#292229]">Application Received!</h3>
                <p className="text-xs sm:text-sm text-[#625865] max-w-md mx-auto">
                  Thank you, <strong>{businessName || "Partner"}</strong>. Our partnerships team will contact you within 2–3 business days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-[#292229]">Let&apos;s get you started</h2>
                  <p className="text-xs text-[#79717c]">Choose how you&apos;d like to partner with us.</p>
                </div>

                {/* Partner Type Selector */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPartnerType("products")}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      partnerType === "products"
                        ? "border-[#9b1b45] bg-[#fff5f8]"
                        : "border-[#e3dee6]"
                    }`}
                  >
                    <Store className="w-4 h-4 text-[#9b1b45] mb-1.5" />
                    <strong className="block text-xs font-bold text-[#292229]">Sell products</strong>
                    <span className="text-[10px] text-[#79717c]">Gifts, cakes, flowers &amp; more</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPartnerType("services")}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      partnerType === "services"
                        ? "border-[#9b1b45] bg-[#fff5f8]"
                        : "border-[#e3dee6]"
                    }`}
                  >
                    <Users className="w-4 h-4 text-[#9b1b45] mb-1.5" />
                    <strong className="block text-xs font-bold text-[#292229]">Offer services</strong>
                    <span className="text-[10px] text-[#79717c]">Decor, delivery &amp; event work</span>
                  </button>
                </div>

                {/* Step Progress */}
                <div className="grid grid-cols-4 gap-2 text-[11px] font-semibold">
                  {["1. Business", "2. Contact", "3. Products", "4. Files"].map((lbl, idx) => (
                    <div
                      key={lbl}
                      className={`pb-1.5 border-b-2 ${
                        step >= idx + 1
                          ? "border-[#9b1b45] text-[#9b1b45]"
                          : "border-[#eee5e9] text-[#856e7b]"
                      }`}
                    >
                      {lbl}
                    </div>
                  ))}
                </div>

                {step === 1 && (
                  <div className="space-y-4">
                    <input
                      required
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Business / brand name *"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd8e0] text-sm outline-none focus:border-[#9b1b45]"
                    />
                    <div>
                      <p className="text-xs font-semibold text-[#514554] mb-2">Business type *</p>
                      <div className="flex flex-wrap gap-2">
                        {["Proprietorship", "Partnership", "Private Limited", "LLP", "Individual", "Other"].map(
                          (bt) => (
                            <button
                              key={bt}
                              type="button"
                              onClick={() => setBusinessType(bt)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
                                businessType === bt
                                  ? "border-[#9b1b45] bg-[#fcf2f6] text-[#9b1b45]"
                                  : "border-[#e3dee6] text-[#514554]"
                              }`}
                            >
                              {bt}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    <input
                      required
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City *"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd8e0] text-sm outline-none focus:border-[#9b1b45]"
                    />
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <input
                      required
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="Primary mobile / WhatsApp number *"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd8e0] text-sm outline-none focus:border-[#9b1b45]"
                    />
                    <input
                      required
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="Business email *"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd8e0] text-sm outline-none focus:border-[#9b1b45]"
                    />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-3 text-xs text-[#625865]">
                    <p className="font-semibold text-[#292229]">Categories you specialize in:</p>
                    <textarea
                      rows={3}
                      placeholder="e.g., Fresh flower bouquets, theme cakes, balloon arches, personalized mugs..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd8e0] text-sm outline-none focus:border-[#9b1b45]"
                    />
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-3 text-xs text-[#625865]">
                    <p className="font-semibold text-[#292229]">Portfolio / Sample Work (Optional)</p>
                    <input
                      type="url"
                      placeholder="Instagram / Website / Google Drive portfolio link"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd8e0] text-sm outline-none focus:border-[#9b1b45]"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => setStep((s) => s - 1)}
                      className="px-5 py-3 rounded-xl border border-[#ddd8e0] text-xs font-bold text-[#352a30]"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-[#a7194b] hover:bg-[#89113b] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>{step === 4 ? "Submit Application" : "Continue"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-center text-[10px] text-[#79717c]">
                  Free to apply · Our team reviews every application within 2–3 business days.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

