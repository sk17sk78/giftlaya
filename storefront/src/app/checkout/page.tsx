"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/cart");
  }, [router]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center bg-[#faf8fa] px-4 text-xs text-[#7c6a76]">
      Redirecting to checkout...
    </main>
  );
}
