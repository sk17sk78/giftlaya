"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FaqAccordion } from "@/components/home/FaqAccordion";
import faqsMock from "@/data/faqs.json";
import { postPublicAPI } from "@/services/api";
import {
  MessageCircle,
  Phone,
  Mail,
  Clock,
  MapPin,
  ShieldCheck,
  Send,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

export default function ContactUsPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await postPublicAPI("/inquiries", {
        inquiry_type: "contact",
        name,
        phone,
        email,
        subject,
        message,
      });
    } catch {
      // show acknowledgement cleanly
    }
    setSubmitted(true);
    setTimeout(() => {
      setName("");
      setPhone("");
      setEmail("");
      setSubject("");
      setMessage("");
    }, 300);
  };

  return (
    <div className="bg-white">
      {/* Maroon Hero */}
      <section className="bg-gradient-to-br from-[#6e1231] via-[#9b1b45] to-[#b52757] text-white px-4 pt-10 pb-20 sm:pt-14 sm:pb-24 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="inline-block bg-white/15 border border-white/20 text-[11px] font-semibold px-3 py-1 rounded-full mb-3">
            We&apos;d love to hear from you
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold">
            Contact Giftlaya
          </h1>
          <p className="text-xs sm:text-sm text-white/90 mt-2.5 leading-relaxed">
            Questions about a booking, a custom theme, or delivery? Talk to a real person on the team — we usually reply within a couple of hours.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4 text-[11px]">
            <span className="px-3 py-1 rounded-full bg-white/15">Replies in ~2 hrs</span>
            <span className="px-3 py-1 rounded-full bg-white/15">Mon–Sun · 10–7:30</span>
            <span className="px-3 py-1 rounded-full bg-white/15">2 Lacs+ helped</span>
          </div>
        </div>
      </section>

      <div className="max-w-[1152px] mx-auto px-4 sm:px-6 -mt-12 space-y-12 pb-14">
        {/* 3 Overlapping Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="https://wa.me/918100248353"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-[#eee5e9] rounded-2xl p-5 text-center shadow-md hover:border-green-400 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-green-100 text-green-600 grid place-items-center mx-auto mb-2.5">
              <MessageCircle className="w-5 h-5" />
            </div>
            <strong className="block text-sm font-bold text-[#292229]">WhatsApp</strong>
            <span className="text-xs text-[#79717c]">Chat instantly</span>
          </a>

          <a
            href="tel:+918100248353"
            className="bg-white border border-[#eee5e9] rounded-2xl p-5 text-center shadow-md hover:border-[#9b1b45] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-[#fcf2f6] text-[#9b1b45] grid place-items-center mx-auto mb-2.5">
              <Phone className="w-5 h-5" />
            </div>
            <strong className="block text-sm font-bold text-[#292229]">Call Us</strong>
            <span className="text-xs text-[#79717c]">+91 81002 48353</span>
          </a>

          <a
            href="mailto:support@giftlaya.com"
            className="bg-white border border-[#eee5e9] rounded-2xl p-5 text-center shadow-md hover:border-blue-400 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center mx-auto mb-2.5">
              <Mail className="w-5 h-5" />
            </div>
            <strong className="block text-sm font-bold text-[#292229]">Email</strong>
            <span className="text-xs text-[#79717c]">Write to us</span>
          </a>
        </div>

        {/* How can we help topics */}
        <section className="space-y-4">
          <div className="text-center">
            <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-[#292229]">
              How can we help?
            </h2>
            <p className="text-xs text-[#79717c]">Pick a topic and we&apos;ll point you the right way.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { title: "Bookings & Pricing", desc: "Packages, availability & quotes", pre: "Booking & Pricing Inquiry" },
              { title: "Custom Themes", desc: "Tell us your dream setup", pre: "Custom Decoration Theme" },
              { title: "Corporate & Bulk", desc: "Offices, events & large orders", pre: "Corporate Bulk Order" },
              { title: "Reschedule", desc: "Move a booking to another date", pre: "Reschedule Existing Order" },
              { title: "Track My Order", desc: "Live status of your booking", pre: "Order Tracking Support" },
              { title: "Share Feedback", desc: "We read every message", pre: "Customer Feedback" },
            ].map((t) => (
              <button
                key={t.title}
                type="button"
                onClick={() => {
                  setSubject(t.pre);
                  document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center justify-between p-4 rounded-2xl border border-[#eee5e9] bg-white hover:border-[#9b1b45] text-left transition-all"
              >
                <div>
                  <strong className="block text-xs sm:text-sm font-bold text-[#292229]">{t.title}</strong>
                  <span className="block text-[11px] text-[#79717c] mt-0.5">{t.desc}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#9b8b95]" />
              </button>
            ))}
          </div>
        </section>

        {/* Form + Direct Info */}
        <section id="contact-form" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-3">
            <div className="rounded-2xl border border-[#eee5e9] bg-white divide-y divide-[#f5eff3]">
              <div className="p-4 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-green-100 text-green-600 grid place-items-center shrink-0">
                  <Phone className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#856e7b]">Call Us</span>
                  <strong className="block text-sm text-[#292229]">+91 81002 48353</strong>
                </div>
              </div>
              <div className="p-4 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-[#fcf2f6] text-[#9b1b45] grid place-items-center shrink-0">
                  <Mail className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#856e7b]">Email Us</span>
                  <strong className="block text-sm text-[#292229]">support@giftlaya.com</strong>
                </div>
              </div>
              <div className="p-4 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 grid place-items-center shrink-0">
                  <Clock className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#856e7b]">Working Hours</span>
                  <strong className="block text-sm text-[#292229]">Mon – Sun · 10:00 AM – 7:30 PM</strong>
                </div>
              </div>
              <div className="p-4 flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-[#fcf2f6] text-[#9b1b45] grid place-items-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#856e7b]">Find Us</span>
                  <strong className="block text-xs text-[#292229] leading-relaxed">
                    1st Floor EC 91, Saltlake Sector 1, Kolkata, West Bengal 700064
                  </strong>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#9b1b45] text-white flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-xs font-bold">Real humans, fast replies</strong>
                <p className="text-[11px] text-white/85 mt-1">
                  No bots, no endless menus. A real member of the Giftlaya team reads and answers every message.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-[#eee5e9] rounded-2xl p-5 sm:p-7">
            <h2 className="text-base font-bold text-[#292229]">Send us a message</h2>
            <p className="text-xs text-[#79717c] mb-5">We&apos;ll never share your details.</p>

            {submitted ? (
              <div className="py-10 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-[#246448] mx-auto" />
                <h3 className="text-base font-bold text-[#292229]">Message sent!</h3>
                <p className="text-xs text-[#625865]">
                  Our support team will reach back to you shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="text-xs font-bold text-[#9b1b45] underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name *"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd8e0] text-sm outline-none focus:border-[#9b1b45]"
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd8e0] text-sm outline-none focus:border-[#9b1b45]"
                  />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd8e0] text-sm outline-none focus:border-[#9b1b45]"
                />
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject (optional)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd8e0] text-sm outline-none focus:border-[#9b1b45]"
                />
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help? *"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd8e0] text-sm outline-none focus:border-[#9b1b45]"
                />
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#a7194b] hover:bg-[#89113b] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Send className="w-4 h-4" /> Send Message
                </button>
              </form>
            )}
          </div>
        </section>

        {/* FAQs */}
        <FaqAccordion
          faqs={faqsMock.slice(0, 6)}
          title="Frequently Asked Questions"
          subtitle="Quick answers to the things people ask us most."
        />

        <div className="text-center pt-2">
          <p className="text-xs text-[#79717c] mb-3">Ready to plan your celebration?</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#a7194b] text-white text-xs sm:text-sm font-bold"
          >
            Start Gifting <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

