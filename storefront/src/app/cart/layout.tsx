import type { ReactNode } from "react";
import { DEFAULT_DESCRIPTION, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Your Cart | Giftlaya",
  description: DEFAULT_DESCRIPTION,
  index: false,
  follow: false,
  includeOpenGraph: false,
});

export default function CartLayout({ children }: { children: ReactNode }) {
  return children;
}

