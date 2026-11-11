"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCart,
  getCartItemUnitPrice,
  getCartItemLineKey,
} from "@/context/CartContext";
import { useCity } from "@/context/CityContext";
import { useUI } from "@/context/UIContext";
import {
  api,
  API_BASE_URL,
  postPublicAPI,
  submitStorefrontOrder,
} from "@/services/api";
import type {
  PublicAddonCatalog,
  PublicCouponItem,
  OrderRecord,
} from "@/types";
type PublicAddonItem = PublicAddonCatalog["addons"][number];
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Tag,
  Check,
  X,
  HelpCircle,
  Calendar,
  Clock,
  Gift,
  MapPin,
  UserRound,
  Mail,
  MessageSquarePlus,
  CreditCard,
  AlertTriangle,
  FileText,
  Headphones,
  Coins,
  Home,
  Briefcase,
  SlidersHorizontal,
  Lock,
} from "lucide-react";

interface SavedAddress {
  id: string;
  label: "Home" | "Work" | "Other";
  fullName: string;
  phone: string;
  flat: string;
  area: string;
  landmark: string;
  city: string;
  pincode: string;
  receiverName?: string;
  receiverPhone?: string;
  forSomeoneElse?: boolean;
}

interface SlotOption {
  id: number;
  label: string;
  start_time: string;
  end_time: string;
  extra_charge_paise: number;
  is_available: boolean;
  is_midnight?: boolean;
}

function formatCartDate(raw?: string): string {
  if (!raw) return "Select date";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const dt = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  }
  return raw;
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CartPage() {
  const router = useRouter();
  const {
    cart,
    itemsSubtotal,
    addonsTotal,
    cartTotal,
    updateQuantity,
    removeFromCart,
    updateCartItemSchedule,
    updateCartItemMessage,
    addAddonToItem,
    updateAddonQuantity,
    removeAddonFromItem,
    clearCart,
  } = useCart();
  const { selectedCity } = useCity();
  const { customer, setCustomer, openAuth } = useUI();

  const addressSectionRef = useRef<HTMLDivElement>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const fullNameInputRef = useRef<HTMLInputElement>(null);

  // Coupon state
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountRs: number;
    description?: string;
  } | null>(null);
  const [couponMsg, setCouponMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<PublicCouponItem[]>([]);
  const [offersOpen, setOffersOpen] = useState(false);

  // Item schedule modal ("Change" on Date/Time)
  const [editingScheduleKey, setEditingScheduleKey] = useState<string | null>(null);
  const [modalDate, setModalDate] = useState<string>(() =>
    toLocalDateStr(new Date(Date.now() + 86400000))
  );
  const [modalSlots, setModalSlots] = useState<SlotOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedModalSlot, setSelectedModalSlot] = useState<SlotOption | null>(null);

  // Add extras modal directly in cart
  const [addonPickerKey, setAddonPickerKey] = useState<string | null>(null);
  const [catalogAddons, setCatalogAddons] = useState<PublicAddonItem[]>([]);
  const [addonsLoading, setAddonsLoading] = useState(false);

  // Inline item note & customization dropdown toggles
  const [openNoteKeys, setOpenNoteKeys] = useState<Record<string, boolean>>({});
  const [openCustKeys, setOpenCustKeys] = useState<Record<string, boolean>>({});
  const [specialInstOpen, setSpecialInstOpen] = useState(false);

  // Booking details & Delivery Address state (matching live giftlaya.com/cart)
  const [forSomeoneElse, setForSomeoneElse] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [flat, setFlat] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [pincode, setPincode] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState<{
    serviceable?: boolean;
    area_name?: string;
    city_name?: string;
    delivery_fee_paise?: number;
  } | null>(null);
  const [addressLabel, setAddressLabel] = useState<"Home" | "Work" | "Other">("Home");
  const [saveForFuture, setSaveForFuture] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [confirmedAddress, setConfirmedAddress] = useState<SavedAddress | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Card" | "COD">("UPI");
  const [useCoins, setUseCoins] = useState(false);
  const [maxRedeemPercent, setMaxRedeemPercent] = useState(25);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getPublicCoupons()
      .then(setAvailableCoupons)
      .catch(() => {});
    try {
      const savedCoupon = sessionStorage.getItem("giftlaya_applied_coupon");
      if (savedCoupon) {
        const parsed = JSON.parse(savedCoupon);
        if (parsed?.code) {
          setAppliedCoupon(parsed);
          setCoupon(parsed.code);
        }
      }
      const savedList = localStorage.getItem("giftlaya_saved_addresses");
      if (savedList) {
        const parsed = JSON.parse(savedList);
        if (Array.isArray(parsed)) setSavedAddresses(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (customer) {
      if (!fullName && customer.name) setFullName(customer.name);
      const rawPhone =
        customer.phone ||
        (customer.target && /^\+?\d{10,14}$/.test(customer.target.trim())
          ? customer.target
          : "");
      if (!phone && rawPhone) {
        setPhone(rawPhone.replace(/\D/g, "").slice(-10));
      }
      const rawEmail =
        customer.email ||
        (customer.target && customer.target.includes("@") ? customer.target : "");
      if (!email && rawEmail) {
        setEmail(rawEmail);
      }
    }
  }, [customer, fullName, phone, email]);

  useEffect(() => {
    if (!customer?.id) return;
    const baseUrl = API_BASE_URL || "http://localhost:8080/api/v1/public";
    let cancelled = false;
    Promise.all([
      fetch(`${baseUrl}/customers/${customer.id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${baseUrl}/customers/${customer.id}/coins`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([prof, coinsData]) => {
        if (cancelled) return;
        if (coinsData?.max_redeem_percent) {
          setMaxRedeemPercent(Number(coinsData.max_redeem_percent));
        }
        if (prof) {
          const liveBal = Number(prof.coins_balance ?? coinsData?.balance_coins ?? 0);
          if (
            liveBal !== customer.coins_balance ||
            (prof.name && prof.name !== customer.name) ||
            (prof.phone && prof.phone !== customer.phone) ||
            (prof.email && prof.email !== customer.email)
          ) {
            setCustomer({
              ...customer,
              name: prof.name || customer.name,
              phone: prof.phone || customer.phone,
              email: prof.email || customer.email,
              coins_balance: liveBal,
              created_at: prof.created_at || customer.created_at,
            });
          }
          if (Array.isArray(prof.addresses) && prof.addresses.length > 0) {
            const dbAddrs: SavedAddress[] = prof.addresses.map((a: any) => ({
              id: String(a.id || a.db_id),
              label:
                a.type === "work" ? "Work" : a.type === "other" ? "Other" : "Home",
              fullName: a.fullName || "",
              phone: a.phone || "",
              flat: a.flat || "",
              area: a.area || "",
              landmark: a.landmark || "",
              city: a.city || "",
              pincode: a.pincode || "",
            }));
            setSavedAddresses((prev) => {
              const seen = new Set(dbAddrs.map((x) => `${x.flat}|${x.pincode}`));
              const merged = [
                ...dbAddrs,
                ...prev.filter((x) => !seen.has(`${x.flat}|${x.pincode}`)),
              ].slice(0, 6);
              try {
                localStorage.setItem("giftlaya_saved_addresses", JSON.stringify(merged));
              } catch {
                // ignore
              }
              return merged;
            });
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [customer?.id]);

  useEffect(() => {
    const cartCity = cart.find((it) => it.selectedCity)?.selectedCity;
    const resolved =
      cartCity ||
      (selectedCity && selectedCity !== "Select your city" ? selectedCity : "");
    if (!cityInput && resolved) setCityInput(resolved);
  }, [cart, selectedCity, cityInput]);

  useEffect(() => {
    if (pincode.length !== 6) {
      setPincodeStatus(null);
      return;
    }
    const baseUrl = API_BASE_URL || "http://localhost:8080/api/v1/public";
    let cancelled = false;
    fetch(`${baseUrl}/pincodes/${encodeURIComponent(pincode)}/serviceable`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setPincodeStatus(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pincode]);

  useEffect(() => {
    if (!editingScheduleKey) return;
    const baseUrl = API_BASE_URL || "http://localhost:8080/api/v1/public";
    const citySlug = encodeURIComponent(
      (cityInput || selectedCity || "kolkata")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
    );
    let cancelled = false;
    setSlotsLoading(true);
    fetch(`${baseUrl}/slots?date=${encodeURIComponent(modalDate)}&city_slug=${citySlug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) {
          const list = Array.isArray(d?.slots) ? d.slots : [];
          setModalSlots(list);
          const firstAvail = list.find((s: SlotOption) => s.is_available) || null;
          setSelectedModalSlot(firstAvail);
        }
      })
      .catch(() => {
        if (!cancelled) setModalSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editingScheduleKey, modalDate, cityInput, selectedCity]);

  const applyCouponCode = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await postPublicAPI<{
        valid: boolean;
        code: string;
        discount_paise: number;
        description?: string;
      }>("/coupons/validate", {
        code,
        subtotal_paise: Math.max(100, cartTotal * 100),
      });
      const discountRs = Math.round((res.discount_paise || 0) / 100);
      const next = { code: res.code, discountRs, description: res.description };
      setAppliedCoupon(next);
      setCoupon(res.code);
      setCouponMsg({
        type: "ok",
        text: `Applied ${res.code} · Saving ₹${discountRs.toLocaleString("en-IN")}`,
      });
      try {
        sessionStorage.setItem("giftlaya_applied_coupon", JSON.stringify(next));
      } catch {
        // ignore
      }
    } catch (err) {
      setAppliedCoupon(null);
      setCouponMsg({
        type: "err",
        text: (err as Error).message || "Invalid or inapplicable coupon",
      });
    } finally {
      setCouponLoading(false);
    }
  };

  const removeAppliedCoupon = () => {
    setAppliedCoupon(null);
    setCoupon("");
    setCouponMsg(null);
    try {
      sessionStorage.removeItem("giftlaya_applied_coupon");
    } catch {
      // ignore
    }
  };

  const openScheduleModal = (lineKey: string, currentDate?: string) => {
    setEditingScheduleKey(lineKey);
    if (currentDate && /^\d{4}-\d{2}-\d{2}$/.test(currentDate)) {
      setModalDate(currentDate);
    } else {
      setModalDate(toLocalDateStr(new Date(Date.now() + 86400000)));
    }
  };

  const saveScheduleModal = () => {
    if (!editingScheduleKey || !selectedModalSlot) return;
    updateCartItemSchedule(editingScheduleKey, {
      deliveryDate: modalDate,
      deliveryTimeSlot: selectedModalSlot.label,
      slotTemplateId: selectedModalSlot.id,
      slotSurcharge: Math.round((selectedModalSlot.extra_charge_paise || 0) / 100),
    });
    setEditingScheduleKey(null);
  };

  const openAddonPicker = async (lineKey: string, productSlug?: string) => {
    setAddonPickerKey(lineKey);
    if (catalogAddons.length > 0) return;
    setAddonsLoading(true);
    try {
      const data = await api.getAddonsCatalog(productSlug);
      setCatalogAddons(data.addons || []);
    } catch {
      setCatalogAddons([]);
    } finally {
      setAddonsLoading(false);
    }
  };

  const handleUseAddress = () => {
    setAddressError(null);
    const cleanPhone = phone.replace(/\D/g, "");
    const cleanPin = pincode.replace(/\D/g, "");
    if (!fullName.trim()) {
      setAddressError("Please enter full name.");
      return;
    }
    if (cleanPhone.length !== 10) {
      setAddressError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (forSomeoneElse) {
      if (!receiverName.trim()) {
        setAddressError("Please enter the receiver's full name.");
        return;
      }
      if (receiverPhone.replace(/\D/g, "").length !== 10) {
        setAddressError("Please enter the receiver's 10-digit mobile number.");
        return;
      }
    }
    if (!flat.trim() || !area.trim()) {
      setAddressError("Please enter flat/house and area/street.");
      return;
    }
    if (!cityInput.trim() || cityInput === "Select your city") {
      setAddressError("Please enter your delivery city.");
      return;
    }
    if (cleanPin.length !== 6) {
      setAddressError("Please enter a valid 6-digit pincode.");
      return;
    }
    if (pincodeStatus && pincodeStatus.serviceable === false) {
      setAddressError("Sorry, this pincode is currently not serviceable.");
      return;
    }

    const entry: SavedAddress = {
      id: `addr_${Date.now()}`,
      label: addressLabel,
      fullName: fullName.trim(),
      phone: cleanPhone,
      flat: flat.trim(),
      area: area.trim(),
      landmark: landmark.trim(),
      city: cityInput.trim(),
      pincode: cleanPin,
      forSomeoneElse,
      receiverName: forSomeoneElse ? receiverName.trim() : undefined,
      receiverPhone: forSomeoneElse ? receiverPhone.replace(/\D/g, "") : undefined,
    };
    setConfirmedAddress(entry);

    if (saveForFuture) {
      const nextList = [
        entry,
        ...savedAddresses.filter(
          (a) => !(a.flat === entry.flat && a.pincode === entry.pincode)
        ),
      ].slice(0, 6);
      setSavedAddresses(nextList);
      try {
        localStorage.setItem("giftlaya_saved_addresses", JSON.stringify(nextList));
      } catch {
        // ignore
      }
      if (customer?.id && !forSomeoneElse) {
        const alreadyInSaved = savedAddresses.some(
          (a) => a.flat === entry.flat && a.pincode === entry.pincode
        );
        if (!alreadyInSaved) {
          postPublicAPI(`/customers/${customer.id}/addresses`, {
            type: addressLabel.toLowerCase(),
            label: addressLabel,
            fullName: entry.fullName,
            phone: entry.phone,
            flat: entry.flat,
            area: entry.area,
            landmark: entry.landmark,
            city: entry.city,
            pincode: entry.pincode,
          }).catch(() => {});
        }
      }
    }
    paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const applySavedAddress = (addr: SavedAddress) => {
    setAddressError(null);
    setFullName(addr.fullName);
    setPhone(addr.phone);
    setFlat(addr.flat);
    setArea(addr.area);
    setLandmark(addr.landmark || "");
    setCityInput(addr.city);
    setPincode(addr.pincode);
    setAddressLabel(addr.label);
    setForSomeoneElse(Boolean(addr.forSomeoneElse));
    setReceiverName(addr.receiverName || "");
    setReceiverPhone(addr.receiverPhone || "");
    setConfirmedAddress(addr);
  };

  const discountAmount = appliedCoupon?.discountRs || 0;
  const slotSurcharge =
    cart.find((it) => (it.slotSurcharge ?? 0) > 0)?.slotSurcharge ?? 0;
  const deliveryFee =
    cartTotal >= 999 || cart.length === 0
      ? 0
      : pincodeStatus?.delivery_fee_paise
      ? Math.round(pincodeStatus.delivery_fee_paise / 100)
      : 49;
  const availableCoins = customer?.coins_balance ?? 0;
  const maxCoinCapByRule = Math.floor(
    (Math.max(0, cartTotal - discountAmount) * maxRedeemPercent) / 100
  );
  const maxRedeemableCoins = Math.min(availableCoins, maxCoinCapByRule);
  const coinsApplied = useCoins ? maxRedeemableCoins : 0;
  const grandTotal = Math.max(
    0,
    cartTotal - discountAmount - coinsApplied + deliveryFee + slotSurcharge
  );

  const handlePlaceOrder = async () => {
    if (!confirmedAddress) {
      addressSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      fullNameInputRef.current?.focus();
      setAddressError("Please fill and click 'Use this address' to continue.");
      return;
    }

    setOrderError(null);
    setSubmitting(true);

    const recipientNameFinal =
      confirmedAddress.forSomeoneElse && confirmedAddress.receiverName
        ? confirmedAddress.receiverName
        : confirmedAddress.fullName;
    const recipientPhoneFinal =
      confirmedAddress.forSomeoneElse && confirmedAddress.receiverPhone
        ? confirmedAddress.receiverPhone
        : confirmedAddress.phone;
    const formattedAddress = [
      confirmedAddress.flat,
      confirmedAddress.area,
      confirmedAddress.landmark,
      confirmedAddress.city,
    ]
      .filter(Boolean)
      .join(", ");

    try {
      const { orderNumber } = await submitStorefrontOrder({
        cart,
        cityName: confirmedAddress.city,
        pincode: confirmedAddress.pincode,
        paymentMethod,
        couponCode: appliedCoupon?.code,
        coinsToRedeem: coinsApplied,
        recipientName: recipientNameFinal,
        recipientPhone: recipientPhoneFinal,
        shippingAddressJson: {
          address_line1: `${confirmedAddress.flat}, ${confirmedAddress.area}`,
          landmark: confirmedAddress.landmark || undefined,
          city: confirmedAddress.city,
          pincode: confirmedAddress.pincode,
          label: confirmedAddress.label,
          sender_name: confirmedAddress.fullName,
          sender_phone: confirmedAddress.phone,
          for_someone_else: Boolean(confirmedAddress.forSomeoneElse),
          email: email.trim() || undefined,
          special_instructions: specialInstructions.trim() || undefined,
        },
        fallbackTotal: grandTotal,
      });

      if (customer && coinsApplied > 0) {
        setCustomer({
          ...customer,
          coins_balance: Math.max(0, (customer.coins_balance ?? 0) - coinsApplied),
        });
      }

      const newOrder: OrderRecord = {
        id: orderNumber,
        createdAt: new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        status: "Confirmed",
        city: confirmedAddress.city,
        recipientName: recipientNameFinal,
        recipientPhone: recipientPhoneFinal,
        address: `${formattedAddress} - ${confirmedAddress.pincode}`,
        total: grandTotal,
        paymentMethod,
        items: cart,
      };
      try {
        const existing = JSON.parse(localStorage.getItem("giftlaya_orders") || "[]");
        localStorage.setItem("giftlaya_orders", JSON.stringify([newOrder, ...existing]));
      } catch {
        // ignore
      }

      clearCart();
      router.push(`/order-confirmation?orderId=${encodeURIComponent(orderNumber)}`);
    } catch (err) {
      setOrderError((err as Error)?.message || "Could not place order. Please try again.");
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <main className="relative min-h-screen bg-[#faf8fa] flex flex-col items-center justify-center px-6 py-16 text-center overflow-hidden">
        <div className="relative flex flex-col items-center max-w-md mx-auto">
          <Image
            src="/images/empty-cart-panda.webp"
            alt="Your cart is empty"
            width={220}
            height={220}
            className="w-52 h-52 object-contain mb-4"
            priority
          />
          <h1 className="text-2xl font-bold text-gray-900 font-heading">
            Your cart is empty
          </h1>
          <p className="text-sm text-gray-500 mt-2.5 leading-relaxed">
            Looks like you haven&apos;t added any celebrations yet. Let&apos;s find the perfect decoration or gift for your moment!
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-[#a7194b] hover:bg-[#89113b] text-white text-sm font-bold shadow-md transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Explore Decorations</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    );
  }

  const totalAddonCount = cart.reduce(
    (s, it) => s + (it.selectedAddons || []).reduce((aSum, a) => aSum + (a.quantity || 1), 0),
    0
  );
  const stepStage = confirmedAddress ? 3 : 2;
  const activeModalItem = editingScheduleKey
    ? cart.find((it) => getCartItemLineKey(it) === editingScheduleKey)
    : null;

  return (
    <div className="min-h-screen bg-[#faf9fb] pb-28 lg:pb-12">
      {/* Top Bar + 3-step Stepper (Matches live giftlaya.com/cart) */}
      <header className="bg-white border-b border-[#eee5e9]">
        <div className="max-w-[1200px] mx-auto px-3.5 sm:px-6 py-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Go back"
                className="w-9 h-9 rounded-full border border-[#e6dce1] grid place-items-center text-[#352a30] hover:bg-[#fdf2f6] shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-[#fdf2f6] text-[#9b1b45] grid place-items-center shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </span>
                <div>
                  <h1 className="text-[15px] sm:text-base font-extrabold text-[#292229] leading-tight">
                    Your cart
                  </h1>
                  <p className="text-[11px] text-[#7c6a76]">
                    {cart.length} {cart.length === 1 ? "item" : "items"}
                    {totalAddonCount > 0
                      ? ` · ${totalAddonCount} ${totalAddonCount === 1 ? "add-on" : "add-ons"}`
                      : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/"
                className="text-xs font-bold text-[#9b1b45] hover:underline px-2 py-1"
              >
                + Add more
              </Link>
              <Link
                href="/contact-us"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#e6dce1] text-xs font-semibold text-[#493f49] hover:border-[#9b1b45]"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Help
              </Link>
            </div>
          </div>

          {/* 3-step progress bar: 1 Cart — 2 Details — 3 Payment */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#f5eff3] text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5 text-[#9b1b45]">
              <span className="w-5 h-5 rounded-full bg-[#9b1b45] text-white grid place-items-center text-[10px]">
                1
              </span>
              Cart
            </span>
            <div className="flex-1 h-0.5 bg-[#9b1b45]" />
            <span className="inline-flex items-center gap-1.5 text-[#9b1b45]">
              <span className="w-5 h-5 rounded-full bg-[#9b1b45] text-white grid place-items-center text-[10px]">
                2
              </span>
              Details
            </span>
            <div
              className={`flex-1 h-0.5 transition-colors ${
                stepStage >= 3 ? "bg-[#9b1b45]" : "bg-[#eee5e9]"
              }`}
            />
            <span
              className={`inline-flex items-center gap-1.5 ${
                stepStage >= 3 ? "text-[#9b1b45]" : "text-[#8d7a85]"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full grid place-items-center text-[10px] ${
                  stepStage >= 3
                    ? "bg-[#9b1b45] text-white"
                    : "bg-[#f6f1f4] text-[#8d7a85]"
                }`}
              >
                3
              </span>
              Payment
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-3.5 sm:px-6 pt-5 sm:pt-7">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7 items-start">
          {/* LEFT COLUMN: YOUR ORDER -> BOOKING DETAILS -> PAYMENT */}
          <div className="lg:col-span-8 space-y-6 min-w-0">
            {/* YOUR ORDER */}
            <section aria-label="Your order" className="space-y-3">
              <p className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#7c6a76]">
                YOUR ORDER · {cart.length} {cart.length === 1 ? "ITEM" : "ITEMS"}
              </p>

              <div className="space-y-4">
                {cart.map((item) => {
                  const unitPrice = getCartItemUnitPrice(item);
                  const lineKey = getCartItemLineKey(item);
                  const addonsList = item.selectedAddons || [];
                  const addonItemsCount = addonsList.reduce(
                    (s, a) => s + (a.quantity || 1),
                    0
                  );
                  const noteOpen = Boolean(openNoteKeys[lineKey]);
                  const custOpen = Boolean(openCustKeys[lineKey]);
                  const custItems: string[] = [
                    ...(item.dietPreference ? [item.dietPreference] : []),
                    ...(item.selectedWeight ? [item.selectedWeight] : []),
                    ...Object.values(item.customInputs || {}).filter(Boolean),
                  ];

                  return (
                    <div
                      key={lineKey}
                      className="bg-white border border-[#eae5e9] rounded-[20px] p-4 sm:p-5 space-y-3.5"
                    >
                      <div className="flex gap-3.5 sm:gap-4">
                        <Link
                          href={item.product.href || `/p/${item.product.slug}`}
                          className="relative w-20 h-20 sm:w-[84px] sm:h-[84px] rounded-2xl bg-[#fcf2f6] overflow-hidden shrink-0 border border-[#f0e8ed]"
                        >
                          {item.product.image && (
                            <Image
                              src={item.product.image}
                              alt={item.product.title || item.product.name || "Product"}
                              fill
                              className="object-cover"
                            />
                          )}
                        </Link>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link
                                href={item.product.href || `/p/${item.product.slug}`}
                                className="text-sm sm:text-[15px] font-bold text-[#292229] hover:text-[#9b1b45] line-clamp-1"
                              >
                                {item.product.title || item.product.name}
                              </Link>
                              <p className="text-[15px] font-extrabold text-[#292229] mt-0.5">
                                ₹{(unitPrice * item.quantity).toLocaleString("en-IN")}
                              </p>
                              {custItems.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenCustKeys((p) => ({ ...p, [lineKey]: !custOpen }))
                                  }
                                  className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#eef6ff] border border-[#d6e7fd] text-[11px] font-semibold text-[#2563eb] cursor-pointer"
                                >
                                  <SlidersHorizontal className="w-3 h-3" />
                                  <span>
                                    {custItems.length}{" "}
                                    {custItems.length === 1 ? "Customization" : "Customizations"}
                                  </span>
                                  <ChevronDown
                                    className={`w-3 h-3 transition-transform ${
                                      custOpen ? "rotate-180" : ""
                                    }`}
                                  />
                                </button>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromCart(lineKey)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {custOpen && custItems.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {custItems.map((cVal, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="px-2 py-0.5 rounded-md bg-[#f5f8fc] border border-[#dce6f5] text-[11px] text-[#3f5169]"
                                >
                                  {cVal}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#5e4d57]">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#faf7f9] border border-[#eee5e9]">
                                <Calendar className="w-3 h-3 text-[#856e7b]" />
                                {formatCartDate(item.deliveryDate)}
                              </span>
                              {item.deliveryTimeSlot && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#faf7f9] border border-[#eee5e9]">
                                  <Clock className="w-3 h-3 text-[#856e7b]" />
                                  {item.deliveryTimeSlot}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => openScheduleModal(lineKey, item.deliveryDate)}
                                className="text-[11px] font-bold text-[#9b1b45] hover:underline px-1.5 py-1 cursor-pointer"
                              >
                                Change
                              </button>
                            </div>

                            <div className="flex items-center border border-[#e5dce2] rounded-full overflow-hidden bg-white shrink-0">
                              <button
                                type="button"
                                onClick={() => updateQuantity(lineKey, item.quantity - 1)}
                                aria-label="Decrease quantity"
                                className="w-8 h-8 grid place-items-center hover:bg-gray-100 text-[#352a30] cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2.5 text-xs font-bold text-[#29232a]">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(lineKey, item.quantity + 1)}
                                aria-label="Increase quantity"
                                className="w-8 h-8 rounded-full bg-[#9b1b45] text-white grid place-items-center hover:bg-[#7e1538] cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {addonsList.length > 0 && (
                        <div className="border-t border-[#f0e8ed] pt-3 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#7c6a76]">
                              ADD-ONS · {addonItemsCount} {addonItemsCount === 1 ? "ITEM" : "ITEMS"}
                            </p>
                            <button
                              type="button"
                              onClick={() => openAddonPicker(lineKey, item.product.slug)}
                              className="text-[11px] font-bold text-[#9b1b45] hover:underline cursor-pointer"
                            >
                              + Add extras
                            </button>
                          </div>

                          <div className="space-y-2">
                            {addonsList.map((ad) => (
                              <div
                                key={String(ad.id)}
                                className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl border border-[#eee5e9] bg-[#fcfafb]"
                              >
                                <div className="min-w-0">
                                  <p className="text-[13px] font-semibold text-[#292229] truncate">
                                    {ad.name}
                                  </p>
                                  <p className="text-[11px] text-[#7c6a76]">
                                    ₹{ad.price.toLocaleString("en-IN")} × {ad.quantity || 1}{" "}
                                    <strong className="text-[#292229]">
                                      ₹{(ad.price * (ad.quantity || 1)).toLocaleString("en-IN")}
                                    </strong>
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="inline-flex items-center border border-[#e5dce2] rounded-full bg-white">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateAddonQuantity(
                                          lineKey,
                                          ad.id,
                                          (ad.quantity || 1) - 1
                                        )
                                      }
                                      aria-label={`Decrease ${ad.name}`}
                                      className="w-7 h-7 grid place-items-center text-[#352a30] hover:text-[#9b1b45] cursor-pointer"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="px-2 text-xs font-bold">
                                      {ad.quantity || 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateAddonQuantity(
                                          lineKey,
                                          ad.id,
                                          (ad.quantity || 1) + 1
                                        )
                                      }
                                      aria-label={`Increase ${ad.name}`}
                                      className="w-7 h-7 grid place-items-center text-[#352a30] hover:text-[#9b1b45] cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeAddonFromItem(lineKey, ad.id)}
                                    aria-label={`Remove ${ad.name}`}
                                    className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expandable "+ Add instructions" & "+ Add extras" footer matching live giftlaya.com/cart */}
                      <div className="border-t border-[#f5eff3] pt-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenNoteKeys((p) => ({ ...p, [lineKey]: !noteOpen }))
                            }
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5e4d57] hover:text-[#9b1b45] cursor-pointer"
                          >
                            <MessageSquarePlus className="w-3.5 h-3.5" />
                            <span>
                              {item.message ? "Edit instructions" : "Add instructions"}
                            </span>
                          </button>
                          {addonsList.length === 0 && (
                            <button
                              type="button"
                              onClick={() => openAddonPicker(lineKey, item.product.slug)}
                              className="text-[11px] font-bold text-[#9b1b45] hover:underline cursor-pointer"
                            >
                              + Add extras
                            </button>
                          )}
                        </div>
                        {item.message && !noteOpen && (
                          <p className="text-[11px] text-[#7c6a76] mt-1 pl-5">
                            &ldquo;{item.message}&rdquo;
                          </p>
                        )}
                        {noteOpen && (
                          <div className="mt-2">
                            <input
                              type="text"
                              value={item.message || ""}
                              onChange={(e) =>
                                updateCartItemMessage(lineKey, e.target.value)
                              }
                              placeholder="Cake message, balloon color preference, ribbon note..."
                              className="w-full px-3 py-2 text-xs rounded-xl border border-[#ddd8e0] outline-none focus:border-[#9b1b45]"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* BOOKING DETAILS (Matching 100% live giftlaya.com/cart) */}
            <section
              ref={addressSectionRef}
              id="delivery-address-section"
              aria-label="Booking details"
              className="space-y-4"
            >
              <p className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#7c6a76]">
                BOOKING DETAILS
              </p>

              {/* Toggle: Sending this to someone else? */}
              <div className="bg-white border border-[#eae5e9] rounded-[20px] p-4 sm:px-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-[#fdf2f6] text-[#9b1b45] grid place-items-center shrink-0">
                    <Gift className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#292229]">
                      Sending this to someone else?
                    </p>
                    <p className="text-[11px] text-[#7c6a76]">
                      Add the receiver&apos;s name &amp; number
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={forSomeoneElse}
                  aria-label="Sending this to someone else"
                  onClick={() => setForSomeoneElse((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                    forSomeoneElse ? "bg-[#9b1b45]" : "bg-[#dcd4db]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      forSomeoneElse ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Delivery address card */}
              <div className="bg-white border border-[#eae5e9] rounded-[20px] p-4 sm:p-6 space-y-4">
                <div className="flex items-start gap-3 pb-3 border-b border-[#f5eff3]">
                  <span className="w-9 h-9 rounded-xl bg-[#fdf2f6] text-[#9b1b45] grid place-items-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-[#292229]">
                      Delivery address
                    </h2>
                    <p className="text-[11px] text-[#7c6a76]">
                      A few details for a smooth delivery
                    </p>
                  </div>
                </div>

                {savedAddresses.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-[#5e4d57]">Saved addresses</p>
                    <div className="flex flex-wrap gap-2">
                      {savedAddresses.map((sa) => (
                        <button
                          key={sa.id}
                          type="button"
                          onClick={() => applySavedAddress(sa)}
                          className={`text-left px-3 py-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                            confirmedAddress?.id === sa.id
                              ? "border-[#9b1b45] bg-[#fdf2f6] text-[#9b1b45]"
                              : "border-[#eae5e9] bg-[#faf9fb] text-[#292229] hover:border-[#9b1b45]"
                          }`}
                        >
                          <strong className="block text-[11px]">
                            {sa.label} · {sa.fullName}
                          </strong>
                          <span className="text-[10px] text-[#7c6a76]">
                            {sa.flat}, {sa.city} ({sa.pincode})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-bold text-[#292229]">New delivery address</p>
                  <span className="text-[10px] text-[#8d7a85]">
                    Fields marked * are required.
                  </span>
                </div>

                {forSomeoneElse && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#fdf7fa] border border-[#f5dce6]">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#512638] mb-1">
                        Receiver&apos;s full name *
                      </label>
                      <input
                        type="text"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        placeholder="Receiver full name"
                        className="w-full px-3.5 py-2.5 text-xs bg-white rounded-xl border border-[#e2d4db] outline-none focus:border-[#9b1b45]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#512638] mb-1">
                        Receiver&apos;s mobile number *
                      </label>
                      <div className="flex items-center bg-white rounded-xl border border-[#e2d4db] focus-within:border-[#9b1b45] overflow-hidden">
                        <span className="px-3 text-xs font-semibold text-[#7c6a76] border-r border-[#f0e8ed]">
                          +91
                        </span>
                        <input
                          type="tel"
                          maxLength={10}
                          value={receiverPhone}
                          onChange={(e) =>
                            setReceiverPhone(e.target.value.replace(/\D/g, ""))
                          }
                          placeholder="10-digit mobile number"
                          className="flex-1 min-w-0 px-3 py-2.5 text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="cart-full-name"
                      className="block text-xs font-semibold text-[#493f49] mb-1"
                    >
                      Full name *
                    </label>
                    <input
                      id="cart-full-name"
                      ref={fullNameInputRef}
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd8e0] outline-none focus:border-[#9b1b45]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cart-mobile"
                      className="block text-xs font-semibold text-[#493f49] mb-1"
                    >
                      Mobile number *
                    </label>
                    <div className="flex items-center rounded-xl border border-[#ddd8e0] focus-within:border-[#9b1b45] overflow-hidden">
                      <span className="px-3 text-xs font-semibold text-[#7c6a76] bg-[#faf8fa] border-r border-[#eee5e9] py-2.5">
                        +91
                      </span>
                      <input
                        id="cart-mobile"
                        type="tel"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        placeholder="10-digit mobile number"
                        className="flex-1 min-w-0 px-3 py-2.5 text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="cart-flat"
                    className="block text-xs font-semibold text-[#493f49] mb-1"
                  >
                    Flat, house or building *
                  </label>
                  <input
                    id="cart-flat"
                    type="text"
                    value={flat}
                    onChange={(e) => setFlat(e.target.value)}
                    placeholder="House number and building name"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd8e0] outline-none focus:border-[#9b1b45]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cart-area"
                    className="block text-xs font-semibold text-[#493f49] mb-1"
                  >
                    Area or street *
                  </label>
                  <input
                    id="cart-area"
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Street, area or locality"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd8e0] outline-none focus:border-[#9b1b45]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="cart-landmark"
                      className="block text-xs font-semibold text-[#493f49]"
                    >
                      Landmark
                    </label>
                    <span className="text-[10px] font-normal text-[#8d7a85]">
                      Optional
                    </span>
                  </div>
                  <input
                    id="cart-landmark"
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="A nearby place to help us find you"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd8e0] outline-none focus:border-[#9b1b45]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="cart-city"
                      className="block text-xs font-semibold text-[#493f49] mb-1"
                    >
                      City *
                    </label>
                    <input
                      id="cart-city"
                      type="text"
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      placeholder="e.g. Kolkata"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd8e0] outline-none focus:border-[#9b1b45]"
                    />
                    <span className="block text-[10px] font-normal text-[#8d7a85] mt-1">
                      Your selected delivery city
                    </span>
                  </div>
                  <div>
                    <label
                      htmlFor="cart-pincode"
                      className="block text-xs font-semibold text-[#493f49] mb-1"
                    >
                      Pincode *
                    </label>
                    <input
                      id="cart-pincode"
                      type="text"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                      placeholder="6 digits"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd8e0] outline-none focus:border-[#9b1b45]"
                    />
                    {pincode.length === 6 && pincodeStatus && (
                      <p
                        className={`text-[11px] mt-1 font-semibold ${
                          pincodeStatus.serviceable ? "text-[#246448]" : "text-rose-600"
                        }`}
                      >
                        {pincodeStatus.serviceable
                          ? `✓ Serviceable (${pincodeStatus.area_name || pincodeStatus.city_name || pincode})`
                          : "Currently not serviceable for this pincode"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <span className="block text-xs font-semibold text-[#5e4d57]">
                    Save address as
                  </span>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(
                      [
                        { lbl: "Home", Icon: Home },
                        { lbl: "Work", Icon: Briefcase },
                        { lbl: "Other", Icon: MapPin },
                      ] as const
                    ).map(({ lbl, Icon }) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setAddressLabel(lbl)}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                          addressLabel === lbl
                            ? "border-[#9b1b45] bg-[#fdf2f6] text-[#9b1b45]"
                            : "border-[#e5dce2] bg-white text-[#5e4d57] hover:border-[#d4c5cf]"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{lbl}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-[#5e4d57] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={saveForFuture}
                    onChange={(e) => setSaveForFuture(e.target.checked)}
                    className="accent-[#9b1b45] w-4 h-4 rounded"
                  />
                  Save for future orders
                </label>

                {addressError && (
                  <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2">
                    {addressError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleUseAddress}
                  className="w-full py-3.5 rounded-xl bg-[#9b1b45] hover:bg-[#7d1538] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>{confirmedAddress ? "Update delivery address" : "Use this address"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Invoice & updates + Special Instructions stacked matching live giftlaya.com/cart */}
              <div className="space-y-4">
                <div className="bg-white border border-[#eae5e9] rounded-[20px] p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-[#eef6ff] text-[#2563eb] grid place-items-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-[#292229]">
                        Invoice &amp; updates
                      </h3>
                      <p className="text-[11px] text-[#7c6a76]">
                        Your booking details, right in your inbox
                      </p>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="cart-invoice-email"
                      className="block text-xs font-semibold text-[#493f49] mb-1"
                    >
                      Email address *
                    </label>
                    <input
                      id="cart-invoice-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd8e0] outline-none focus:border-[#9b1b45]"
                    />
                  </div>
                </div>

                <div className="bg-white border border-[#eae5e9] rounded-[20px] p-4 sm:p-5">
                  <button
                    type="button"
                    onClick={() => setSpecialInstOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-[#eef6ff] text-[#2563eb] grid place-items-center shrink-0">
                        <MessageSquarePlus className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-[#292229]">
                          Special Instructions
                        </h3>
                        <p className="text-[11px] text-[#7c6a76]">
                          Theme, floor, access notes… (optional)
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-[#7c6a76] transition-transform shrink-0 ${
                        specialInstOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {specialInstOpen && (
                    <div className="mt-3 pt-3 border-t border-[#f5eff3]">
                      <input
                        type="text"
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        placeholder="Theme, floor, access notes..."
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd8e0] outline-none focus:border-[#9b1b45]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* PAYMENT (Matches 100% live giftlaya.com/cart) */}
            <section
              ref={paymentSectionRef}
              id="payment-section"
              aria-label="Payment"
              className="space-y-4"
            >
              <p className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#7c6a76]">
                PAYMENT
              </p>

              {/* Order Summary Card matching live giftlaya.com/cart */}
              <div className="bg-white border border-[#eae5e9] rounded-[20px] overflow-hidden">
                <div className="p-4 sm:p-5 space-y-2.5">
                  <h3 className="text-sm font-bold text-[#292229]">Order Summary</h3>
                  <div className="space-y-2 text-xs text-[#493f49] pt-1">
                    {cart.map((it) => {
                      const lineKey = getCartItemLineKey(it);
                      const unit = getCartItemUnitPrice(it);
                      return (
                        <div key={lineKey} className="space-y-1">
                          <div className="flex justify-between gap-2 font-semibold text-[#292229]">
                            <span>
                              {it.product.title || it.product.name}
                              {it.quantity > 1 ? ` × ${it.quantity}` : ""}
                            </span>
                            <span>₹{(unit * it.quantity).toLocaleString("en-IN")}</span>
                          </div>
                          {(it.selectedAddons || []).map((ad) => (
                            <div
                              key={String(ad.id)}
                              className="flex justify-between gap-2 pl-3 text-[11px] text-[#7c6a76]"
                            >
                              <span>
                                ↳ {ad.name}
                                {(ad.quantity || 1) > 1 ? ` × ${ad.quantity}` : ""}
                              </span>
                              <span>
                                ₹{(ad.price * (ad.quantity || 1)).toLocaleString("en-IN")}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    <div className="pt-2.5 border-t border-[#f5eff3] flex justify-between text-[#5e4d57]">
                      <span>Subtotal</span>
                      <span>₹{cartTotal.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-[#5e4d57]">
                      <span>Convenience fee</span>
                      <span className={deliveryFee === 0 ? "text-[#246448] font-semibold" : ""}>
                        {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                      </span>
                    </div>
                    {slotSurcharge > 0 && (
                      <div className="flex justify-between text-[#5e4d57]">
                        <span>Slot timing fee</span>
                        <span>+₹{slotSurcharge.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-[#246448] font-semibold">
                        <span>Coupon ({appliedCoupon?.code})</span>
                        <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {coinsApplied > 0 && (
                      <div className="flex justify-between text-[#246448] font-semibold">
                        <span>Giftlaya Coins ({coinsApplied})</span>
                        <span>-₹{coinsApplied.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-4 sm:px-5 py-3.5 bg-[#fdf2f6] border-t border-[#f7e1ea] flex justify-between items-center font-extrabold text-sm text-[#292229]">
                  <span>Total Amount</span>
                  <span className="text-base text-[#9b1b45]">
                    ₹{grandTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Payment Card matching live giftlaya.com/cart */}
              <div className="bg-white border border-[#eae5e9] rounded-[20px] p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-[#f4effc] text-[#7c3aed] grid place-items-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#292229]">Payment</h3>
                    <p className="text-[11px] text-[#7c6a76]">
                      Pay securely to confirm your order
                    </p>
                  </div>
                </div>

                {!customer && (
                  <button
                    type="button"
                    onClick={openAuth}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-[#f5d5e1] bg-[#fdf2f6]/70 hover:bg-[#fdf2f6] text-xs text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b1b45] cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2 text-[#512638] font-semibold">
                      <Coins className="w-4 h-4 text-[#9b1b45] shrink-0" />
                      Sign in to redeem Giftlaya Coins &amp; saved addresses
                    </span>
                    <span className="text-[11px] font-bold text-[#9b1b45] shrink-0">
                      Sign in
                    </span>
                  </button>
                )}

                {availableCoins > 0 && maxRedeemableCoins > 0 && (
                  <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#f5d5e1] bg-[#fdf2f6]/70 text-xs cursor-pointer">
                    <span className="flex items-center gap-2 text-[#512638] font-semibold">
                      <Coins className="w-4 h-4 text-[#9b1b45]" />
                      Redeem {maxRedeemableCoins} Giftlaya Coins (₹{maxRedeemableCoins} off · max {maxRedeemPercent}%)
                    </span>
                    <input
                      type="checkbox"
                      checked={useCoins}
                      onChange={(e) => setUseCoins(e.target.checked)}
                      className="accent-[#9b1b45] w-4 h-4"
                    />
                  </label>
                )}

                <div className="flex items-center justify-between text-xs py-1">
                  <div>
                    <p className="font-semibold text-[#292229]">Pay in full</p>
                    <p className="text-[11px] text-[#7c6a76]">Amount payable now</p>
                  </div>
                  <strong className="text-base font-extrabold text-[#292229]">
                    ₹{grandTotal.toLocaleString("en-IN")}
                  </strong>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(["UPI", "Card", "COD"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer ${
                        paymentMethod === m
                          ? "border-[#9b1b45] bg-[#fdf2f6] text-[#9b1b45]"
                          : "border-[#eae5e9] bg-white text-[#493f49] hover:border-[#9b1b45]"
                      }`}
                    >
                      {m === "COD" ? "Cash on Delivery" : `Pay via ${m}`}
                    </button>
                  ))}
                </div>

                {orderError && (
                  <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2">
                    {orderError}
                  </p>
                )}

                {confirmedAddress && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handlePlaceOrder}
                    className="w-full py-3.5 rounded-xl bg-[#9b1b45] hover:bg-[#7d1538] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
                  >
                    <span>
                      {submitting
                        ? "Placing order..."
                        : `Pay ₹${grandTotal.toLocaleString("en-IN")} & Confirm Order`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <div className="pt-2 border-t border-[#f5eff3] flex items-center justify-between text-[11px] text-[#7c6a76]">
                  <span className="inline-flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> Secured by Razorpay
                  </span>
                  <span>UPI · Cards · Net banking</span>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT SIDEBAR: CONTACT + COUPONS & OFFERS + BILL SUMMARY + TRUST */}
          <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-6">
            {/* CONTACT card */}
            <div className="bg-white border border-[#eae5e9] rounded-[18px] p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-[#eef6ff] text-[#2563eb] grid place-items-center shrink-0">
                    <UserRound className="w-4 h-4" />
                  </span>
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#7c6a76]">
                    CONTACT
                  </h2>
                </div>
                {confirmedAddress && (
                  <button
                    type="button"
                    onClick={() =>
                      addressSectionRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                    }
                    className="text-[11px] font-bold text-[#9b1b45] hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                )}
              </div>
              {confirmedAddress ? (
                <div className="text-xs text-[#292229] space-y-0.5 pt-1">
                  <p className="font-bold">
                    {confirmedAddress.forSomeoneElse && confirmedAddress.receiverName
                      ? `${confirmedAddress.receiverName} (Gift from ${confirmedAddress.fullName})`
                      : confirmedAddress.fullName}
                  </p>
                  <p className="text-[#5e4d57]">
                    +91{" "}
                    {confirmedAddress.forSomeoneElse && confirmedAddress.receiverPhone
                      ? confirmedAddress.receiverPhone
                      : confirmedAddress.phone}
                  </p>
                  <p className="text-[#7c6a76] text-[11px] leading-snug">
                    {confirmedAddress.flat}, {confirmedAddress.area}
                    {confirmedAddress.landmark ? `, ${confirmedAddress.landmark}` : ""},{" "}
                    {confirmedAddress.city} - {confirmedAddress.pincode}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#5e4d57]">Add a delivery address below</p>
              )}
            </div>

            {/* Coupons & offers */}
            <div className="bg-white border border-[#eae5e9] rounded-[18px] p-4 sm:p-5 space-y-3">
              <div>
                <h2 className="text-sm font-bold text-[#29232a] flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#9b1b45]" /> Coupons &amp; offers
                </h2>
                <p className="text-[11px] text-[#856e7b] mt-0.5">
                  A little saving for your celebration
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] text-[#5e4d57]">Have a coupon code?</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    applyCouponCode(coupon);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-[#ddd8e0] p-1 bg-white focus-within:border-[#9b1b45]"
                >
                  <input
                    type="text"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    disabled={Boolean(appliedCoupon)}
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-xs placeholder:normal-case outline-none bg-transparent disabled:bg-[#faf8fa]"
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={removeAppliedCoupon}
                      aria-label="Remove coupon"
                      className="px-3 py-1.5 rounded-lg border border-[#ddd8e0] text-xs font-semibold text-[#79717c] hover:text-[#9b1b45] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={couponLoading || !coupon.trim()}
                      className="px-4 py-1.5 rounded-lg bg-[#9b1b45] text-white text-xs font-bold hover:bg-[#7d1538] transition-colors disabled:bg-[#e7c4d0] disabled:text-white cursor-pointer shrink-0"
                    >
                      {couponLoading ? "..." : "Apply"}
                    </button>
                  )}
                </form>
              </div>

              {couponMsg && (
                <p
                  className={`text-[11px] font-semibold flex items-center gap-1 ${
                    couponMsg.type === "ok" ? "text-[#246448]" : "text-rose-600"
                  }`}
                >
                  {couponMsg.type === "ok" && <Check className="w-3.5 h-3.5 shrink-0" />}
                  <span>{couponMsg.text}</span>
                </p>
              )}

              {availableCoupons.length > 0 && (
                <div className="pt-2 border-t border-[#f5eff3]">
                  <button
                    type="button"
                    onClick={() => setOffersOpen((v) => !v)}
                    className="w-full flex items-center justify-between text-xs font-bold text-[#9b1b45] py-1 cursor-pointer"
                  >
                    <span>Explore {availableCoupons.length} offers</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        offersOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {offersOpen && (
                    <div className="mt-2 space-y-2 max-h-52 overflow-y-auto">
                      {availableCoupons.map((cp) => (
                        <div
                          key={cp.code}
                          className="p-2.5 rounded-xl border border-[#eee5e9] bg-[#fcfafb] flex items-center justify-between gap-2 text-[11px]"
                        >
                          <div className="min-w-0">
                            <span className="inline-block px-2 py-0.5 rounded bg-[#fdf2f6] text-[#9b1b45] font-bold">
                              {cp.code}
                            </span>
                            <p className="text-[#625865] mt-1 line-clamp-2">
                              {cp.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => applyCouponCode(cp.code)}
                            className="shrink-0 text-xs font-bold text-[#9b1b45] hover:underline cursor-pointer"
                          >
                            Apply
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* BILL SUMMARY */}
            <div className="bg-white border border-[#eae5e9] rounded-[18px] p-4 sm:p-5 space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#7c6a76] border-b border-[#f0edf0] pb-2.5">
                BILL SUMMARY
              </h2>
              <div className="space-y-2 text-xs text-[#625865]">
                <div className="flex justify-between">
                  <span>Item Total</span>
                  <span className="font-semibold text-[#292229]">
                    ₹{itemsSubtotal.toLocaleString("en-IN")}
                  </span>
                </div>
                {addonsTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Add-on Total</span>
                    <span className="font-semibold text-[#292229]">
                      ₹{addonsTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {slotSurcharge > 0 && (
                  <div className="flex justify-between">
                    <span>Slot Charge</span>
                    <span className="font-semibold text-[#292229]">
                      +₹{slotSurcharge.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#246448] font-semibold">
                    <span>Coupon Discount ({appliedCoupon?.code})</span>
                    <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {coinsApplied > 0 && (
                  <div className="flex justify-between text-[#246448] font-semibold">
                    <span>Reward Coins</span>
                    <span>-₹{coinsApplied.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span
                    className={
                      deliveryFee === 0
                        ? "text-[#246448] font-semibold"
                        : "font-semibold text-[#292229]"
                    }
                  >
                    {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className="pt-2.5 border-t border-[#f0edf0] flex justify-between text-base font-extrabold text-[#292229]">
                  <span>Grand Total</span>
                  <span className="text-[#9b1b45]">
                    ₹{grandTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {!confirmedAddress && (
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 pt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Add a delivery address to continue</span>
                </p>
              )}

              <button
                type="button"
                disabled={submitting}
                onClick={handlePlaceOrder}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  confirmedAddress
                    ? "bg-[#a7194b] hover:bg-[#89113b] text-white shadow-md"
                    : "bg-[#e7dfe4] text-[#6d5965] hover:bg-[#dcd2d8]"
                }`}
              >
                <span>{submitting ? "Processing..." : "Proceed"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom 3-column Trust Box (matching giftlaya.com/cart) */}
            <div className="bg-white border border-[#eae5e9] rounded-[18px] p-4 space-y-3 text-center">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <span className="w-8 h-8 mx-auto rounded-full bg-[#e9f7ef] text-[#246448] grid place-items-center">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <strong className="block text-[10px] font-bold text-[#292229]">
                    Secure payments
                  </strong>
                  <span className="block text-[9px] text-[#7c6a76]">Via Razorpay</span>
                </div>
                <div className="space-y-1">
                  <span className="w-8 h-8 mx-auto rounded-full bg-[#f4effc] text-[#6d28d9] grid place-items-center">
                    <FileText className="w-4 h-4" />
                  </span>
                  <strong className="block text-[10px] font-bold text-[#292229]">
                    Clear policies
                  </strong>
                  <span className="block text-[9px] text-[#7c6a76]">
                    Returns &amp; cancellations
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="w-8 h-8 mx-auto rounded-full bg-[#fff5eb] text-[#b45309] grid place-items-center">
                    <Headphones className="w-4 h-4" />
                  </span>
                  <strong className="block text-[10px] font-bold text-[#292229]">
                    Here to help
                  </strong>
                  <span className="block text-[9px] text-[#7c6a76]">
                    Talk to our team
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-[#8d7a85] border-t border-[#f5eff3] pt-2.5">
                UPI · Cards · Net banking
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile sticky footer CTA */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white border-t border-[#eee5e9] px-4 py-3 flex items-center justify-between gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div>
          <span className="block text-[10px] text-[#7c6a76]">Grand Total</span>
          <strong className="text-lg font-extrabold text-[#9b1b45]">
            ₹{grandTotal.toLocaleString("en-IN")}
          </strong>
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={handlePlaceOrder}
          className="px-6 py-3 rounded-2xl bg-[#a7194b] hover:bg-[#89113b] text-white text-sm font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          <span>{confirmedAddress ? "Place Order" : "Proceed"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Modal: Change Delivery Date & Time Slot */}
      {editingScheduleKey && activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Change delivery date and time"
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#292229]">
                Change delivery date &amp; time
              </h3>
              <button
                type="button"
                onClick={() => setEditingScheduleKey(null)}
                aria-label="Close modal"
                className="w-8 h-8 rounded-full border border-[#eee5e9] grid place-items-center text-[#5e4d57] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#493f49]">
                Select Date
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((offset) => {
                  const dt = new Date(Date.now() + offset * 86400000);
                  const iso = toLocalDateStr(dt);
                  const lbl =
                    offset === 0
                      ? "Today"
                      : offset === 1
                      ? "Tomorrow"
                      : dt.toLocaleDateString("en-IN", { weekday: "short" });
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setModalDate(iso)}
                      className={`py-2 px-2 rounded-xl border text-center cursor-pointer ${
                        modalDate === iso
                          ? "border-[#9b1b45] bg-[#fdf2f6] text-[#9b1b45]"
                          : "border-[#eee5e9] bg-white text-[#292229]"
                      }`}
                    >
                      <span className="block text-[11px] font-bold">{lbl}</span>
                      <span className="block text-[10px] opacity-80">
                        {dt.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
              <input
                type="date"
                min={toLocalDateStr(new Date())}
                value={modalDate}
                onChange={(e) => setModalDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#ddd8e0] outline-none focus:border-[#9b1b45]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#493f49]">
                Select Time Slot
              </label>
              {slotsLoading ? (
                <p className="text-xs text-[#7c6a76]">Loading available slots...</p>
              ) : modalSlots.length === 0 ? (
                <p className="text-xs text-rose-600">
                  No slots open on this date. Try another day.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                  {modalSlots.map((sl) => {
                    const selected = selectedModalSlot?.id === sl.id;
                    return (
                      <button
                        key={sl.id}
                        type="button"
                        disabled={!sl.is_available}
                        onClick={() => setSelectedModalSlot(sl)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-colors cursor-pointer disabled:opacity-40 ${
                          selected
                            ? "border-[#9b1b45] bg-[#fdf2f6] text-[#9b1b45] font-bold"
                            : "border-[#eee5e9] bg-white text-[#292229]"
                        }`}
                      >
                        <span className="block">{sl.label}</span>
                        {sl.extra_charge_paise > 0 && (
                          <span className="text-[10px] font-semibold text-[#9b1b45]">
                            +₹{Math.round(sl.extra_charge_paise / 100)} midnight charge
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!selectedModalSlot}
              onClick={saveScheduleModal}
              className="w-full py-3 rounded-2xl bg-[#9b1b45] hover:bg-[#7d1538] text-white text-xs sm:text-sm font-bold disabled:opacity-50 cursor-pointer"
            >
              Save date &amp; time
            </button>
          </div>
        </div>
      )}

      {/* Modal: Add Extra Add-ons from Cart */}
      {addonPickerKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add extras to your order"
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-[#292229]">
                  Make it a little more special
                </h3>
                <p className="text-xs text-[#7c6a76]">
                  Add chocolates, bento cakes, lights or bouquets
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddonPickerKey(null)}
                aria-label="Close extras modal"
                className="w-8 h-8 rounded-full border border-[#eee5e9] grid place-items-center text-[#5e4d57] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1">
              {addonsLoading ? (
                <p className="col-span-full text-xs text-[#7c6a76] py-8 text-center">
                  Loading add-ons...
                </p>
              ) : (
                catalogAddons.map((ad) => (
                  <div
                    key={String(ad.id)}
                    className="border border-[#eee5e9] rounded-2xl p-2.5 flex flex-col justify-between gap-2 bg-[#fcfafb]"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-white">
                      {ad.image && (
                        <Image
                          src={ad.image}
                          alt={ad.name}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#292229] line-clamp-1">
                        {ad.name}
                      </p>
                      <p className="text-[11px] font-semibold text-[#9b1b45]">
                        ₹{ad.price.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        addAddonToItem(addonPickerKey, {
                          id: ad.id,
                          name: ad.name,
                          price: ad.price,
                          image: ad.image,
                          quantity: 1,
                        });
                      }}
                      className="w-full py-1.5 rounded-xl border border-[#9b1b45] text-[#9b1b45] hover:bg-[#9b1b45] hover:text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setAddonPickerKey(null)}
              className="w-full py-3 rounded-2xl bg-[#9b1b45] text-white text-sm font-bold shrink-0 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
