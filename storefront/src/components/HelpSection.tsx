import React from "react";
import { MessageCircle, Phone, Mail, ArrowUpRight } from "lucide-react";

export default function HelpSection() {
  const cards = [
    {
      title: "Chat with us",
      subtitle: "On WhatsApp",
      detail: "Fastest response within minutes",
      href: "https://wa.me/918100248353",
      icon: <MessageCircle className="w-5 h-5 text-[#25D366]" />,
      bg: "bg-[#eefaf4]",
      border: "hover:border-[#25D366]",
    },
    {
      title: "Give us a call",
      subtitle: "+91 81002 48353",
      detail: "Available 9 AM to 10 PM daily",
      href: "tel:+918100248353",
      icon: <Phone className="w-5 h-5 text-[#9b1b45]" />,
      bg: "bg-[#fdf2f5]",
      border: "hover:border-[#9b1b45]",
    },
    {
      title: "Drop us a note",
      subtitle: "support@giftlaya.com",
      detail: "We reply within 24 hours",
      href: "mailto:support@giftlaya.com",
      icon: <Mail className="w-5 h-5 text-[#3b82f6]" />,
      bg: "bg-[#eff6ff]",
      border: "hover:border-[#3b82f6]",
    },
  ];

  return (
    <section className="w-full my-6" aria-label="Customer Support">
      <div className="mb-4">
        <h2 className="font-heading text-[18px] sm:text-[22px] font-bold text-[#29232a] tracking-tight">
          A little help for your big moment
        </h2>
        <p className="text-[12px] sm:text-[13px] text-[#7b6d76]">
          Questions, ideas or a little guidance. We&apos;re here.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {cards.map((c) => (
          <a
            key={c.title}
            href={c.href}
            target={c.href.startsWith("http") ? "_blank" : undefined}
            rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className={`flex items-start justify-between p-4 rounded-2xl bg-white border border-[#ebe5e9] ${c.border} shadow-sm hover:shadow-md transition-all group`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}
              >
                {c.icon}
              </div>
              <div>
                <span className="text-[11px] font-medium text-[#70636c]">
                  {c.title}
                </span>
                <strong className="block text-[14px] font-bold text-[#29232a] group-hover:text-[#9b1b45] transition-colors">
                  {c.subtitle}
                </strong>
                <span className="block text-[11px] text-[#9b8b95] mt-0.5">
                  {c.detail}
                </span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#9b8b95] group-hover:text-[#9b1b45] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </a>
        ))}
      </div>
    </section>
  );
}
