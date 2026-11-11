"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { openAuth } = useApp();

  return (
    <>
      {/* Spacer to prevent content from being covered by bottom nav on mobile */}
      <div className="h-16 lg:hidden" aria-hidden="true" />

      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#f0e9ec] lg:hidden pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
      >
        <div className="flex items-center justify-around h-14 px-2">
          {/* Home */}
          <Link
            href="/"
            className={`flex flex-col items-center justify-center gap-1 w-16 text-center ${
              pathname === "/" ? "text-[#9b1b45]" : "text-[#70636c] hover:text-[#9b1b45]"
            }`}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M4 10.4a3 3 0 0 1 1.1-2.3l5-4.1a3 3 0 0 1 3.8 0l5 4.1a3 3 0 0 1 1.1 2.3V18a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18v-7.6Z"
                fill={pathname === "/" ? "#fce4eb" : "none"}
              />
              <path d="M9 20.5v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6" />
            </svg>
            <span className="text-[10px] font-semibold leading-none">Home</span>
          </Link>

          {/* Sell with Us */}
          <Link
            href="/seller/registration"
            className="flex flex-col items-center justify-center gap-1 w-16 text-center text-[#70636c] hover:text-[#9b1b45]"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M4.5 10.5V18a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-7.5"
                fill="none"
              />
              <path
                d="M5.2 4.6A1.7 1.7 0 0 1 6.8 3.5h10.4a1.7 1.7 0 0 1 1.6 1.1L20.5 9a2.8 2.8 0 0 1-5.6 0 2.9 2.9 0 0 1-5.8 0 2.8 2.8 0 0 1-5.6 0l1.7-4.4Z"
                fill="none"
              />
              <path d="M9.1 9 10 3.5M14.9 9 14 3.5M9.5 20.5v-5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5v5" />
            </svg>
            <span className="text-[10px] font-semibold leading-none truncate max-w-full">
              Sell
            </span>
          </Link>

          {/* WhatsApp */}
          <a
            href="https://wa.me/918100248353"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 w-16 text-center text-[#70636c] hover:text-[#25D366]"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M20.5 11.5a8.5 8.5 0 0 1-12.8 7.3l-4.2 1.3 1.2-4.2a8.5 8.5 0 1 1 15.8-4.4Z"
                fill="none"
              />
              <path
                d="m8.6 7.6 1 2-1 1a8.1 8.1 0 0 0 4.8 4.1l.9-1.2 2 1c-.3 1.6-1.5 2.1-2.7 1.7-3.8-1.2-6.4-3.9-6.8-6.6-.2-1 .5-1.8 1.8-2Z"
                fill="currentColor"
                strokeWidth="0.5"
              />
            </svg>
            <span className="text-[10px] font-semibold leading-none">WhatsApp</span>
          </a>

          {/* Call */}
          <a
            href="tel:+918100248353"
            className="flex flex-col items-center justify-center gap-1 w-16 text-center text-[#70636c] hover:text-[#9b1b45]"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M7.3 4.5 9 8a1.7 1.7 0 0 1-.3 1.9l-1 1a13 13 0 0 0 5.4 5.4l1-1A1.7 1.7 0 0 1 16 15l3.5 1.7a1.8 1.8 0 0 1 .9 2.1 3.4 3.4 0 0 1-3.7 2.1C9.7 19.7 4.3 14.3 3.1 7.3a3.4 3.4 0 0 1 2.1-3.7 1.8 1.8 0 0 1 2.1.9Z"
                fill="none"
              />
              <path d="M14.5 4a6.8 6.8 0 0 1 5.5 5.5M14.5 7.5a3.3 3.3 0 0 1 2 2" />
            </svg>
            <span className="text-[10px] font-semibold leading-none">Call</span>
          </a>

          {/* Login */}
          <button
            type="button"
            onClick={openAuth}
            className="flex flex-col items-center justify-center gap-1 w-16 text-center text-[#70636c] hover:text-[#9b1b45]"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="7.5" r="3.8" fill="none" />
              <path
                d="M5 18.9c0-3 2.7-4.9 7-4.9s7 1.9 7 4.9a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 18.9Z"
                fill="none"
              />
            </svg>
            <span className="text-[10px] font-semibold leading-none">Login</span>
          </button>
        </div>
      </nav>
    </>
  );
}
