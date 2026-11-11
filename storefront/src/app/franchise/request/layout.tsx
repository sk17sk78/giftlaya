import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Giftlaya Franchise | Own a Gift & Decor Store in India",
  description:
    "Partner with Giftlaya to open an event decoration, flower and cake gifting franchise in your city across India.",
  path: "/franchise/request",
});

export default function FranchiseRequestLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}

