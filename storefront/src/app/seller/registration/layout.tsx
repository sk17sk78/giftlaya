import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Sell on Giftlaya | Become a Seller or Vendor Partner",
  description:
    "Register as a florist, baker, decorator or gift vendor on Giftlaya and reach gifting customers across 100+ cities in India.",
  path: "/seller/registration",
});

export default function SellerRegistrationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}

