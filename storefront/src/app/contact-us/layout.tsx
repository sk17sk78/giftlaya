import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Contact Giftlaya | Order, Delivery & Booking Support",
  description:
    "Contact Giftlaya customer support for order tracking, same-day flower and cake delivery, balloon decoration bookings, and refunds across India.",
  path: "/contact-us",
});

export default function ContactUsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}

