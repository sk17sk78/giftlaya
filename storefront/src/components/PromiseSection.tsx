import React from "react";

export default function PromiseSection() {
  const promises = [
    {
      title: "10L+ Celebrations",
      desc: "Loved by customers across India",
      icon: (
        <svg viewBox="0 0 80 88" width="64" height="70" aria-hidden="true" className="w-16 h-auto">
          <defs>
            <linearGradient id="p1-grad" x1="18" y1="15" x2="62" y2="67" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffc3d2" />
              <stop offset="0.42" stopColor="#e7799a" />
              <stop offset="1" stopColor="#9b1b45" />
            </linearGradient>
            <radialGradient id="p1-shadow">
              <stop stopColor="#8f284b" stopOpacity="0.22" />
              <stop offset="1" stopColor="#8f284b" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="41" cy="79" rx="28" ry="6" fill="url(#p1-shadow)" />
          <g transform="rotate(-9 40 40)">
            <path d="M40 64C34 60 15 47 15 32C15 19 31 15 40 27C49 15 65 19 65 32C65 47 46 60 40 64Z" transform="translate(3 5)" fill="#8f2549" />
            <path d="M40 64C34 60 15 47 15 32C15 19 31 15 40 27C49 15 65 19 65 32C65 47 46 60 40 64Z" fill="url(#p1-grad)" stroke="#f6b5c8" strokeWidth="1" strokeLinejoin="round" />
            <path d="M23 31C23 26 28 25 31 27" fill="none" stroke="#ffe4ec" strokeWidth="4" strokeLinecap="round" />
          </g>
          <circle cx="11" cy="58" r="2.5" fill="#eec0ce" />
        </svg>
      )
    },
    {
      title: "Verified Decorators",
      desc: "Trained & background-checked",
      icon: (
        <svg viewBox="0 0 80 88" width="64" height="70" aria-hidden="true" className="w-16 h-auto">
          <defs>
            <linearGradient id="p2-grad" x1="15" y1="15" x2="65" y2="65" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffd8a8" />
              <stop offset="0.5" stopColor="#f59f00" />
              <stop offset="1" stopColor="#d9480f" />
            </linearGradient>
          </defs>
          <ellipse cx="40" cy="78" rx="24" ry="5" fill="#f59f00" fillOpacity="0.18" />
          <path d="M40 18L58 26V44C58 56 40 66 40 66C40 66 22 56 22 44V26L40 18Z" fill="url(#p2-grad)" stroke="#ffe066" strokeWidth="1.5" />
          <path d="M33 42L38 47L48 35" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      title: "On-Time, Guaranteed",
      desc: "Setup within your chosen time slot",
      icon: (
        <svg viewBox="0 0 80 88" width="64" height="70" aria-hidden="true" className="w-16 h-auto">
          <defs>
            <linearGradient id="p3-grad" x1="16" y1="16" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="#b2f2bb" />
              <stop offset="0.45" stopColor="#37b24d" />
              <stop offset="1" stopColor="#1b642a" />
            </linearGradient>
          </defs>
          <ellipse cx="40" cy="78" rx="24" ry="5" fill="#37b24d" fillOpacity="0.18" />
          <circle cx="40" cy="42" r="24" fill="url(#p3-grad)" stroke="#8ce99a" strokeWidth="1.5" />
          <circle cx="40" cy="42" r="18" fill="#ffffff" fillOpacity="0.15" />
          <path d="M40 28V42L48 46" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      title: "100% Secure Payments",
      desc: "Easy refunds. No hidden charges.",
      icon: (
        <svg viewBox="0 0 80 88" width="64" height="70" aria-hidden="true" className="w-16 h-auto">
          <defs>
            <linearGradient id="p4-grad" x1="15" y1="15" x2="65" y2="65" gradientUnits="userSpaceOnUse">
              <stop stopColor="#d0ebff" />
              <stop offset="0.5" stopColor="#339af0" />
              <stop offset="1" stopColor="#1864ab" />
            </linearGradient>
          </defs>
          <ellipse cx="40" cy="78" rx="24" ry="5" fill="#339af0" fillOpacity="0.18" />
          <rect x="22" y="28" width="36" height="28" rx="6" fill="url(#p4-grad)" stroke="#a5d8ff" strokeWidth="1.5" />
          <path d="M30 28V22C30 16.5 34.5 12 40 12C45.5 12 50 16.5 50 22V28" fill="none" stroke="#339af0" strokeWidth="3" strokeLinecap="round" />
          <circle cx="40" cy="42" r="3" fill="#ffffff" />
        </svg>
      )
    }
  ];

  return (
    <section className="w-full bg-[#fdf2f5] border-y border-[#f8c2d2]/40 py-8 px-4" aria-label="The Giftlaya Promise">
      <div className="max-w-[1168px] mx-auto">
        <div className="text-center mb-6">
          <p className="text-[11px] font-bold tracking-widest text-[#9b1b45] uppercase">
            THE GIFTLAYA PROMISE
          </p>
          <h2 className="font-heading text-[20px] sm:text-[24px] font-bold text-[#29232a] mt-1">
            Big moments. Little worries.
          </h2>
        </div>

        <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {promises.map((p, idx) => (
            <li
              key={idx}
              className="bg-white rounded-2xl p-4 text-center flex flex-col items-center border border-[#f0e8ed] shadow-sm hover:shadow-md hover:border-[#dcb4c5] transition-all"
            >
              <div className="mb-2 flex items-center justify-center">
                {p.icon}
              </div>
              <h3 className="text-[13px] sm:text-[14px] font-bold text-[#29232a] leading-tight">
                {p.title}
              </h3>
              <p className="text-[11px] text-[#70636c] mt-1 leading-snug">
                {p.desc}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
