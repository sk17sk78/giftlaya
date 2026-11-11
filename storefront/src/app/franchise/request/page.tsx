"use client";

import React, { useState } from "react";
import Image from "next/image";
import { FaqAccordion } from "@/components/home/FaqAccordion";
import { postPublicAPI } from "@/services/api";
import {
  Store,
  Award,
  GraduationCap,
  Megaphone,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Send,
  User,
  Phone,
  MapPin,
  Mail,
} from "lucide-react";

const FRANCHISE_FAQS = [
  {
    id: 1,
    question: "How much investment is required to open a Giftlaya franchise?",
    answer:
      "Franchise setup investment typically ranges between ₹5 Lakhs to ₹20 Lakhs depending on city tier, store carpet area, and showroom format.",
  },
  {
    id: 2,
    question: "Can I choose the location for my store?",
    answer:
      "Yes! You can propose high-footfall retail spaces in your city, and our expansion team will help evaluate viability and catchments.",
  },
  {
    id: 3,
    question: "Do I need prior experience in gifting or retail?",
    answer:
      "Prior retail experience is helpful but not mandatory. Giftlaya provides end-to-end training for store operations, floral crafting, and local fulfillment.",
  },
  {
    id: 4,
    question: "How long does it take to open after applying?",
    answer:
      "Once the store location and commercial terms are finalized, most Giftlaya partner stores launch within 30–45 days.",
  },
  {
    id: 5,
    question: "What support does Giftlaya provide after I sign up?",
    answer:
      "We provide store branding guidelines, central procurement tie-ups, online marketplace order routing from Giftlaya.com, and marketing support.",
  },
  {
    id: 6,
    question: "Is the franchise available in my city?",
    answer:
      "We are actively expanding across Tier-1, Tier-2, and Tier-3 cities across India. Submit an inquiry to check territory availability.",
  },
];

export default function FranchiseRequestPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [budget, setBudget] = useState("₹10–20 Lakhs");
  const [location, setLocation] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await postPublicAPI("/inquiries", {
        inquiry_type: "franchise",
        name,
        phone,
        email,
        city,
        subject: `Franchise Inquiry (${budget})`,
        message: location,
        metadata: { budget, proposed_location: location },
      });
    } catch {
      // fallback
    }
    setSubmitted(true);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Full-bleed Maroon Store Hero */}
      <section className="relative overflow-hidden bg-[#5a0f28] text-white py-14 sm:py-20 px-4">
        <div className="absolute inset-0">
          <Image
            src="https://cdn.giftlaya.com/22/1784808942079-822173.webp"
            alt="Giftlaya Storefront"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#4a0c21]/75 via-[#6e1231]/80 to-[#4a0c21]/90" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 text-white text-[11px] font-semibold px-3.5 py-1 rounded-full mb-4">
            <Store className="w-3.5 h-3.5" /> Giftlaya Franchise Program
          </span>
          <h1 className="font-heading text-3xl sm:text-5xl font-extrabold leading-tight">
            Own a Giftlaya Store in Your City
          </h1>
          <p className="text-xs sm:text-base text-white/90 mt-3 max-w-xl mx-auto leading-relaxed">
            Bring Giftlaya&apos;s cakes, flowers, décor and personalised gifts to your city — backed by an established brand and full operational support.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-5 text-[11px]">
            {["500+ Cities", "Established Brand", "Full Business Support"].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-white/15 border border-white/20 font-semibold"
              >
                {tag}
              </span>
            ))}
          </div>

          <a
            href="#franchise-inquiry"
            className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#9b1b45] text-xs sm:text-sm font-bold hover:bg-[#fcf2f6] transition-colors shadow-lg"
          >
            Apply for Franchise <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      <div className="max-w-[1152px] mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-14">
        {/* Why Franchise With Giftlaya? */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#292229]">
              Why Franchise With Giftlaya?
            </h2>
            <p className="text-xs sm:text-sm text-[#79717c] mt-1">
              A proven brand, with the support to back it up.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <Award className="w-5 h-5 text-[#9b1b45]" />,
                bg: "bg-[#fcf2f6]",
                title: "Established Brand",
                desc: "Launch under a name customers already trust and search for.",
              },
              {
                icon: <GraduationCap className="w-5 h-5 text-blue-600" />,
                bg: "bg-blue-50",
                title: "Training & Support",
                desc: "Hands-on guidance to set up and run your store smoothly.",
              },
              {
                icon: <Megaphone className="w-5 h-5 text-emerald-600" />,
                bg: "bg-emerald-50",
                title: "Marketing Support",
                desc: "Benefit from Giftlaya's national marketing and online demand.",
              },
              {
                icon: <TrendingUp className="w-5 h-5 text-amber-600" />,
                bg: "bg-amber-50",
                title: "Growing Industry",
                desc: "Gifting, cakes, décor & personalisation are booming categories.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-5 rounded-2xl border border-[#eee5e9] bg-white shadow-2xs space-y-2.5"
              >
                <div className={`w-10 h-10 rounded-xl ${item.bg} grid place-items-center`}>
                  {item.icon}
                </div>
                <h3 className="text-sm font-bold text-[#292229]">{item.title}</h3>
                <p className="text-xs text-[#625865] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Step Inside a Giftlaya Store */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-3">
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#292229]">
              Step Inside a Giftlaya Store
            </h2>
            <p className="text-xs sm:text-sm text-[#625865] leading-relaxed">
              A warm, welcoming space that showcases cakes, flowers, décor and gifts — designed to make every customer visit feel like a celebration.
            </p>
          </div>
          <div className="lg:col-span-7 relative aspect-[16/10] w-full rounded-3xl overflow-hidden border border-[#eee5e9] shadow-md bg-[#faf5f8]">
            <Image
              src="https://cdn.giftlaya.com/22/1784808941375-696787.webp"
              alt="Inside a Giftlaya Store"
              fill
              sizes="(min-width: 1024px) 680px, 100vw"
              className="object-cover"
            />
          </div>
        </section>

        {/* How It Works */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#292229]">
              How It Works
            </h2>
            <p className="text-xs text-[#79717c] mt-1">From inquiry to opening day.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: "1", title: "Apply", desc: "Share your details below — takes about 2 minutes." },
              { n: "2", title: "Discussion", desc: "Our franchise team connects with you on fit, location & investment." },
              { n: "3", title: "Agreement & Setup", desc: "Finalise terms and set up your store with our support." },
              { n: "4", title: "Launch", desc: "Open your Giftlaya store and start serving customers." },
            ].map((step) => (
              <div
                key={step.n}
                className="relative p-5 rounded-2xl border border-[#eee5e9] bg-white space-y-2"
              >
                <span className="inline-flex w-8 h-8 rounded-xl bg-[#9b1b45] text-white text-xs font-bold items-center justify-center">
                  {step.n}
                </span>
                <h3 className="text-sm font-bold text-[#292229]">{step.title}</h3>
                <p className="text-xs text-[#625865] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Franchise Inquiry Form */}
        <section id="franchise-inquiry" className="max-w-2xl mx-auto">
          <div className="bg-white border border-[#eae5e9] rounded-3xl p-5 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-10 h-10 rounded-xl bg-[#fcf2f6] text-[#9b1b45] grid place-items-center shrink-0">
                <Store className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#292229]">
                  Franchise Inquiry
                </h2>
                <p className="text-[11px] text-[#79717c]">Takes about 2 minutes to fill out.</p>
              </div>
            </div>

            {submitted ? (
              <div className="py-10 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-[#246448] mx-auto" />
                <h3 className="text-lg font-bold text-[#292229]">Inquiry Submitted!</h3>
                <p className="text-xs text-[#625865] max-w-md mx-auto">
                  Thank you, <strong>{name}</strong>. Our franchise team will review territory availability for <strong>{city}</strong> and get back within 2–3 business days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="relative">
                    <User className="w-4 h-4 text-[#8d7b87] absolute left-3 top-3" />
                    <input
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name *"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#ddd8e0] text-sm outline-none focus:border-[#9b1b45]"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#8d7b87] absolute left-3 top-3" />
                    <input
                      required
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="+91 Mobile number *"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#ddd8e0] text-sm outline-none focus:border-[#9b1b45]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#8d7b87] absolute left-3 top-3" />
                    <input
                      required
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City *"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#ddd8e0] text-sm outline-none focus:border-[#9b1b45]"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8d7b87] absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email (optional)"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#ddd8e0] text-sm outline-none focus:border-[#9b1b45]"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#514554] mb-2">
                    Investment budget *
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["₹5–10 Lakhs", "₹10–20 Lakhs", "₹20–50 Lakhs", "₹50 Lakhs+"].map(
                      (b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBudget(b)}
                          className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                            budget === b
                              ? "border-[#9b1b45] bg-[#fcf2f6] text-[#9b1b45]"
                              : "border-[#e3dee6] text-[#514554]"
                          }`}
                        >
                          {b}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Preferred location / address (optional)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd8e0] text-sm outline-none focus:border-[#9b1b45]"
                />

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#a7194b] hover:bg-[#89113b] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  <Send className="w-4 h-4" /> Submit Inquiry
                </button>

                <p className="text-center text-[10px] text-[#79717c]">
                  Free to apply · Our franchise team reviews every inquiry within 2–3 business days.
                </p>
              </form>
            )}
          </div>
        </section>

        {/* Franchise FAQs */}
        <FaqAccordion
          faqs={FRANCHISE_FAQS}
          title="Frequently Asked Questions"
          subtitle="Quick answers for prospective franchise partners."
        />

        {/* WhatsApp CTA */}
        <div className="text-center space-y-3">
          <p className="text-xs text-[#79717c]">Have questions before applying?</p>
          <a
            href="https://wa.me/918100248353?text=Franchise%20Inquiry%20on%20Giftlaya"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#16805a] hover:bg-[#116b4a] text-white text-xs sm:text-sm font-bold transition-colors shadow-sm"
          >
            <MessageCircle className="w-4 h-4" /> Chat With Our Team
          </a>
        </div>
      </div>
    </div>
  );
}

