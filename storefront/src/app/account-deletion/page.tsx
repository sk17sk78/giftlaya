import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Mail } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Account Deletion Information | Giftlaya",
  description: "How to request deletion of your Giftlaya customer account and order history.",
  path: "/account-deletion",
});

export default function AccountDeletionPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 min-h-[65vh] space-y-6">
      <Link
        href="/dashboard/account-settings"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#79717c] hover:text-[#9b1b45]"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
      </Link>

      <div className="bg-white border border-[#e9e2e9] rounded-[20px] p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#fff1f4] text-[#b4405b] grid place-items-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-[#292229]">
              Account deletion information
            </h1>
            <p className="text-xs text-[#887c89]">
              Manage your personal data and privacy preferences with Giftlaya
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs sm:text-[13px] text-[#4a3f4e] leading-relaxed">
          <p>
            You can request permanent deletion of your Giftlaya account, saved delivery addresses, and phone/email profile at any time.
          </p>
          <p>
            Please note that any pending active bookings must either be completed or cancelled first, and tax/GST invoices for completed orders are retained solely as required under Indian statutory compliance. Unused Giftlaya Coins are forfeited upon deletion.
          </p>
        </div>

        <div className="pt-2 flex flex-wrap gap-3">
          <Link
            href="/dashboard/support/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#a72055] hover:bg-[#901a48] text-white text-xs font-semibold"
          >
            Request Deletion via Support
          </Link>
          <a
            href="mailto:support@giftlaya.com?subject=Account%20Deletion%20Request"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#e4d9e4] text-[#6d5965] hover:border-[#9b1b45] text-xs font-semibold"
          >
            <Mail className="w-3.5 h-3.5" /> support@giftlaya.com
          </a>
        </div>
      </div>
    </main>
  );
}

