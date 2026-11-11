"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Pencil,
  Check,
  ChevronRight,
  Home,
  Briefcase,
  MapPin,
  Plus,
  Trash2,
  ShieldAlert,
  LogOut,
} from "lucide-react";
import { useUI } from "@/context/UIContext";
import { API_BASE_URL, deletePublicAPI, postPublicAPI, putPublicAPI } from "@/services/api";
import { DashboardSvgIcon } from "@/components/dashboard/DashboardIcons";

interface ProfileAddress {
  id: string;
  db_id?: number;
  type: "home" | "work" | "other";
  fullName: string;
  phone: string;
  flat: string;
  area: string;
  landmark: string;
  city: string;
  pincode: string;
}

const ADDRESS_META: Record<
  ProfileAddress["type"],
  { label: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  home: { label: "Home", Icon: Home },
  work: { label: "Work", Icon: Briefcase },
  other: { label: "Other", Icon: MapPin },
};

const EMPTY_FORM: Omit<ProfileAddress, "id"> = {
  type: "home",
  fullName: "",
  phone: "",
  flat: "",
  area: "",
  landmark: "",
  city: "",
  pincode: "",
};

export default function AccountSettingsPage() {
  const { customer, setCustomer, logoutCustomer } = useUI();
  const baseUrl = API_BASE_URL || "http://localhost:8080/api/v1/public";

  const [profile, setProfile] = useState({
    name: customer?.name || "",
    phone: customer?.phone || (customer?.target && !customer.target.includes("@") ? customer.target : "") || "",
    email: customer?.email || (customer?.target?.includes("@") ? customer.target : "") || "",
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [draftProfile, setDraftProfile] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ scope: string; type: "ok" | "err"; text: string } | null>(
    null
  );

  const [addresses, setAddresses] = useState<ProfileAddress[]>([]);
  const [addrForm, setAddrForm] = useState<Omit<ProfileAddress, "id"> | null>(null);
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [addrErrors, setAddrErrors] = useState<Record<string, string>>({});

  const syncAddressesToLocal = (list: ProfileAddress[]) => {
    try {
      const mappedForCart = list.map((a) => ({
        id: a.id,
        label:
          a.type === "work" ? "Work" : a.type === "other" ? "Other" : "Home",
        fullName: a.fullName,
        phone: a.phone,
        flat: a.flat,
        area: a.area,
        landmark: a.landmark,
        city: a.city,
        pincode: a.pincode,
      }));
      localStorage.setItem("giftlaya_saved_addresses", JSON.stringify(mappedForCart));
    } catch {
      // ignore
    }
  };

  const loadAccount = useCallback(async () => {
    if (!customer?.id) return;
    try {
      const res = await fetch(`${baseUrl}/customers/${customer.id}`);
      if (!res.ok) return;
      const d = await res.json();
      const loaded = {
        name: d.name || "",
        phone: d.phone || "",
        email: d.email || "",
      };
      setProfile(loaded);
      setDraftProfile(loaded);
      const rawAddrs: any[] = Array.isArray(d.addresses) ? d.addresses : [];
      const mapped = rawAddrs.map((a) => ({
        id: String(a.id || a.db_id),
        db_id: Number(a.db_id || a.id),
        type: (["home", "work", "other"].includes(String(a.type).toLowerCase())
          ? String(a.type).toLowerCase()
          : "home") as ProfileAddress["type"],
        fullName: a.fullName || "",
        phone: a.phone || "",
        flat: a.flat || "",
        area: a.area || "",
        landmark: a.landmark || "",
        city: a.city || "",
        pincode: a.pincode || "",
      }));
      setAddresses(mapped);
      syncAddressesToLocal(mapped);
    } catch {
      // ignore
    }
  }, [baseUrl, customer?.id]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) return;
    setSaving(true);
    setNotice(null);
    try {
      const updated = await putPublicAPI<{
        id: number;
        name: string;
        phone: string;
        email: string;
        coins_balance: number;
        created_at: string;
      }>(`/customers/${customer.id}`, {
        name: draftProfile.name,
        phone: draftProfile.phone,
        email: draftProfile.email,
      });
      setProfile({
        name: updated.name || "",
        phone: updated.phone || "",
        email: updated.email || "",
      });
      setCustomer({
        ...customer,
        name: updated.name || customer.name,
        phone: updated.phone || customer.phone,
        email: updated.email || customer.email,
        coins_balance: updated.coins_balance ?? customer.coins_balance,
      });
      setEditingProfile(false);
      setNotice({ scope: "profile", type: "ok", text: "Profile details updated." });
    } catch (err) {
      setNotice({
        scope: "profile",
        type: "err",
        text: (err as Error).message || "Could not update profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrForm || !customer?.id) return;
    const errs: Record<string, string> = {};
    if (!addrForm.fullName.trim()) errs.fullName = "This field is required";
    if (!/^\d{10}$/.test(addrForm.phone)) errs.phone = "Enter a 10-digit mobile number";
    if (!addrForm.flat.trim()) errs.flat = "This field is required";
    if (!addrForm.area.trim()) errs.area = "This field is required";
    if (!addrForm.city.trim()) errs.city = "This field is required";
    if (!/^\d{6}$/.test(addrForm.pincode)) errs.pincode = "Enter a 6-digit pincode";
    setAddrErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setNotice(null);
    try {
      const res = editingAddrId
        ? await putPublicAPI<any[]>(
            `/customers/${customer.id}/addresses/${editingAddrId}`,
            addrForm
          )
        : await postPublicAPI<any[]>(`/customers/${customer.id}/addresses`, addrForm);
      const mapped = (Array.isArray(res) ? res : []).map((a) => ({
        id: String(a.id || a.db_id),
        db_id: Number(a.db_id || a.id),
        type: (["home", "work", "other"].includes(String(a.type).toLowerCase())
          ? String(a.type).toLowerCase()
          : "home") as ProfileAddress["type"],
        fullName: a.fullName || "",
        phone: a.phone || "",
        flat: a.flat || "",
        area: a.area || "",
        landmark: a.landmark || "",
        city: a.city || "",
        pincode: a.pincode || "",
      }));
      setAddresses(mapped);
      syncAddressesToLocal(mapped);
      setAddrForm(null);
      setEditingAddrId(null);
      setNotice({
        scope: "addresses",
        type: "ok",
        text: editingAddrId ? "Address updated." : "Address saved for your next order.",
      });
    } catch (err) {
      setNotice({
        scope: "addresses",
        type: "err",
        text: (err as Error).message || "Could not save address.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (addrId: string) => {
    if (!customer?.id) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await deletePublicAPI<any[]>(
        `/customers/${customer.id}/addresses/${addrId}`
      );
      const mapped = (Array.isArray(res) ? res : []).map((a) => ({
        id: String(a.id || a.db_id),
        db_id: Number(a.db_id || a.id),
        type: (["home", "work", "other"].includes(String(a.type).toLowerCase())
          ? String(a.type).toLowerCase()
          : "home") as ProfileAddress["type"],
        fullName: a.fullName || "",
        phone: a.phone || "",
        flat: a.flat || "",
        area: a.area || "",
        landmark: a.landmark || "",
        city: a.city || "",
        pincode: a.pincode || "",
      }));
      setAddresses(mapped);
      syncAddressesToLocal(mapped);
      setConfirmDeleteId(null);
      setNotice({ scope: "addresses", type: "ok", text: "Address removed." });
    } catch (err) {
      setNotice({
        scope: "addresses",
        type: "err",
        text: (err as Error).message || "Could not remove address.",
      });
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile.name?.trim() || "Your Giftlaya account";
  const initials =
    displayName
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "G";

  const renderNotice = (scope: string) => {
    if (!notice || notice.scope !== scope) return null;
    return (
      <p
        role={notice.type === "err" ? "alert" : "status"}
        className={`text-[11px] px-3 py-2.5 rounded-[10px] ${
          notice.type === "err"
            ? "bg-[#fff1f4] text-[#b4405b]"
            : "bg-[#eff9f3] text-[#398268]"
        }`}
      >
        {notice.text}
      </p>
    );
  };

  return (
    <div className="grid gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.1em] text-[#a18e9c] mb-1">
            Your account
          </p>
          <h1 className="text-[21px] font-semibold tracking-[-0.035em] leading-[1.4] text-[#352c36]">
            My profile
          </h1>
          <p className="text-xs text-[#887c89] mt-1 leading-relaxed">
            A few details for more personal celebrations.
          </p>
        </div>
        <DashboardSvgIcon kind="profile" size={44} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4 items-start">
        {/* Left Stack: Personal Details + Account & Support */}
        <div className="grid gap-4">
          <section className="bg-white border border-[#e9e2e9] rounded-[18px] p-4 space-y-4">
            <div className="flex items-center gap-2.5">
              <DashboardSvgIcon kind="profile" />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-[#292229]">Personal details</h2>
                <p className="text-[11px] text-[#918093] mt-0.5">
                  Let&apos;s keep in touch
                </p>
              </div>
            </div>

            {renderNotice("profile")}

            {editingProfile ? (
              <form onSubmit={handleSaveProfile} className="grid gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#514254] mb-1">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={draftProfile.name}
                    onChange={(e) =>
                      setDraftProfile((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Your name"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#e4d9e4] outline-none focus:border-[#a72055]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#514254] mb-1">
                    Mobile
                  </label>
                  <div className="flex items-center rounded-xl border border-[#e4d9e4] overflow-hidden focus-within:border-[#a72055]">
                    <span className="px-3 py-2.5 text-xs text-[#887c89] bg-[#faf8fa] border-r border-[#f0eaef]">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={draftProfile.phone}
                      onChange={(e) =>
                        setDraftProfile((p) => ({
                          ...p,
                          phone: e.target.value.replace(/\D/g, "").slice(-10),
                        }))
                      }
                      placeholder="10-digit mobile number"
                      className="flex-1 min-w-0 px-3 py-2.5 text-xs outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#514254] mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={draftProfile.email}
                    onChange={(e) =>
                      setDraftProfile((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#e4d9e4] outline-none focus:border-[#a72055]"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setEditingProfile(false);
                      setNotice(null);
                    }}
                    className="flex-1 min-h-[44px] rounded-[11px] bg-white border border-[#e4d9e4] text-[#876680] text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 min-h-[44px] rounded-[11px] bg-[#a72055] hover:bg-[#901a48] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{saving ? "Saving…" : "Save changes"}</span>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-3 pb-4 border-b border-[#f0e9ef]">
                  <span className="w-12 h-12 rounded-[16px] bg-[#fceef4] border border-[#f4dbe6] text-[#a82b5b] grid place-items-center text-base font-semibold shrink-0">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <strong className="block text-[15px] font-semibold text-[#292229] break-words">
                      {displayName}
                    </strong>
                    <p className="text-[11px] text-[#9a8597] mt-1">
                      Your personal celebration space
                    </p>
                  </div>
                </div>

                <dl className="divide-y divide-[#f2edf1] text-xs">
                  <div className="flex items-center gap-3 py-3">
                    <dt className="w-16 shrink-0 text-[11px] text-[#968697]">Full name</dt>
                    <dd className="text-[#514254] break-words">
                      {profile.name || "Add your name"}
                    </dd>
                  </div>
                  <div className="flex items-center gap-3 py-3">
                    <dt className="w-16 shrink-0 text-[11px] text-[#968697]">Mobile</dt>
                    <dd className="text-[#514254] break-words">
                      {profile.phone ? `+91 ${profile.phone}` : "Not added"}
                    </dd>
                  </div>
                  <div className="flex items-center gap-3 py-3">
                    <dt className="w-16 shrink-0 text-[11px] text-[#968697]">Email</dt>
                    <dd className="text-[#514254] break-words">
                      {profile.email || "Add your email address"}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={() => {
                    setDraftProfile(profile);
                    setEditingProfile(true);
                    setNotice(null);
                  }}
                  className="w-full min-h-[44px] rounded-[11px] bg-white border border-[#e4d9e4] hover:border-[#dcb9cd] text-[#876680] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit profile</span>
                </button>
              </>
            )}
          </section>

          <section className="bg-white border border-[#e9e2e9] rounded-[18px] p-4">
            <div className="flex items-center gap-2.5 mb-2">
              <DashboardSvgIcon kind="security" />
              <div>
                <h2 className="text-sm font-semibold text-[#292229]">
                  Account &amp; support
                </h2>
                <p className="text-[11px] text-[#918093] mt-0.5">
                  Help with your account, whenever you need it
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/support"
              className="flex items-center gap-2.5 min-h-[46px] text-xs text-[#8d7188] hover:text-[#a72958] border-t border-[#f0e8ef] mt-2 pt-1.5"
            >
              <DashboardSvgIcon kind="support" size={28} />
              <span>Get account help</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto" />
            </Link>
            <Link
              href="/account-deletion"
              className="flex items-center gap-2.5 min-h-[46px] text-xs text-[#8d7188] hover:text-[#a72958] border-t border-[#f0e8ef] pt-1.5"
            >
              <ShieldAlert className="w-4 h-4 ml-1.5 text-[#8d7188]" />
              <span>Account deletion information</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto" />
            </Link>
          </section>
        </div>

        {/* Right: Saved Addresses (#addresses) */}
        <section
          id="addresses"
          aria-labelledby="saved-addresses-title"
          className="bg-white border border-[#e9e2e9] rounded-[18px] p-4 space-y-4 scroll-mt-36"
        >
          <div className="flex items-center gap-2.5">
            <DashboardSvgIcon kind="address" />
            <div className="min-w-0 flex-1">
              <h2 id="saved-addresses-title" className="text-sm font-semibold text-[#292229]">
                Saved addresses
              </h2>
              <p className="text-[11px] text-[#918093] mt-0.5">
                {addresses.length > 0
                  ? `${addresses.length} saved ${addresses.length === 1 ? "place" : "places"} for your deliveries`
                  : "Your favourite places to send a little joy"}
              </p>
            </div>
          </div>

          {renderNotice("addresses")}

          {addrForm ? (
            <form onSubmit={handleSaveAddress} noValidate className="grid gap-3">
              <div>
                <h3 className="text-xs font-semibold text-[#292229]">
                  {editingAddrId ? "Edit address" : "New address"}
                </h3>
                <p className="text-[10px] text-[#918093]">Fields marked * are required</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#514254] mb-1">
                  Full name *
                </label>
                <input
                  type="text"
                  value={addrForm.fullName}
                  onChange={(e) =>
                    setAddrForm((p) => p && { ...p, fullName: e.target.value })
                  }
                  placeholder="Receiver's full name"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#e4d9e4] outline-none focus:border-[#a72055]"
                />
                {addrErrors.fullName && (
                  <p className="text-[10px] text-rose-600 mt-1">{addrErrors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#514254] mb-1">
                  Mobile number *
                </label>
                <div className="flex items-center rounded-xl border border-[#e4d9e4] overflow-hidden focus-within:border-[#a72055]">
                  <span className="px-3 py-2.5 text-xs text-[#887c89] bg-[#faf8fa] border-r border-[#f0eaef]">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={addrForm.phone}
                    onChange={(e) =>
                      setAddrForm(
                        (p) => p && { ...p, phone: e.target.value.replace(/\D/g, "") }
                      )
                    }
                    placeholder="10-digit mobile number"
                    className="flex-1 min-w-0 px-3 py-2.5 text-xs outline-none"
                  />
                </div>
                {addrErrors.phone && (
                  <p className="text-[10px] text-rose-600 mt-1">{addrErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#514254] mb-1">
                  Flat, house or building *
                </label>
                <input
                  type="text"
                  value={addrForm.flat}
                  onChange={(e) =>
                    setAddrForm((p) => p && { ...p, flat: e.target.value })
                  }
                  placeholder="House number and building name"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#e4d9e4] outline-none focus:border-[#a72055]"
                />
                {addrErrors.flat && (
                  <p className="text-[10px] text-rose-600 mt-1">{addrErrors.flat}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#514254] mb-1">
                  Area or street *
                </label>
                <input
                  type="text"
                  value={addrForm.area}
                  onChange={(e) =>
                    setAddrForm((p) => p && { ...p, area: e.target.value })
                  }
                  placeholder="Street, area or locality"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#e4d9e4] outline-none focus:border-[#a72055]"
                />
                {addrErrors.area && (
                  <p className="text-[10px] text-rose-600 mt-1">{addrErrors.area}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#514254] mb-1">
                  Landmark{" "}
                  <span className="text-[10px] text-[#968697]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={addrForm.landmark}
                  onChange={(e) =>
                    setAddrForm((p) => p && { ...p, landmark: e.target.value })
                  }
                  placeholder="A nearby place to help us find you"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#e4d9e4] outline-none focus:border-[#a72055]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#514254] mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={addrForm.city}
                    onChange={(e) =>
                      setAddrForm((p) => p && { ...p, city: e.target.value })
                    }
                    placeholder="City"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#e4d9e4] outline-none focus:border-[#a72055]"
                  />
                  {addrErrors.city && (
                    <p className="text-[10px] text-rose-600 mt-1">{addrErrors.city}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#514254] mb-1">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={addrForm.pincode}
                    onChange={(e) =>
                      setAddrForm(
                        (p) => p && { ...p, pincode: e.target.value.replace(/\D/g, "") }
                      )
                    }
                    placeholder="6 digits"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#e4d9e4] outline-none focus:border-[#a72055]"
                  />
                  {addrErrors.pincode && (
                    <p className="text-[10px] text-rose-600 mt-1">{addrErrors.pincode}</p>
                  )}
                </div>
              </div>

              <fieldset>
                <legend className="text-xs text-[#79677e] mb-2">Save address as</legend>
                <div className="flex gap-2">
                  {(["home", "work", "other"] as const).map((t) => {
                    const meta = ADDRESS_META[t];
                    const TIcon = meta.Icon;
                    const checked = addrForm.type === t;
                    return (
                      <label key={t} className="flex-1 cursor-pointer">
                        <input
                          type="radio"
                          name="saved-address-type"
                          checked={checked}
                          onChange={() => setAddrForm((p) => p && { ...p, type: t })}
                          className="sr-only"
                        />
                        <span
                          className={`flex justify-center items-center gap-1.5 border rounded-[10px] min-h-[42px] text-xs ${
                            checked
                              ? "bg-[#fdf4f8] border-[#bc7597] text-[#a62859] font-semibold"
                              : "border-[#e7dfe7] text-[#8b748e]"
                          }`}
                        >
                          <TIcon className="w-3.5 h-3.5" />
                          {meta.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setAddrForm(null);
                    setEditingAddrId(null);
                    setAddrErrors({});
                  }}
                  className="flex-1 min-h-[44px] rounded-[11px] bg-white border border-[#e4d9e4] text-[#876680] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 min-h-[44px] rounded-[11px] bg-[#a72055] hover:bg-[#901a48] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{saving ? "Saving…" : "Save address"}</span>
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            <>
              {addresses.length === 0 ? (
                <p className="text-xs text-[#918093] py-2">
                  Save an address now for a quicker checkout next time.
                </p>
              ) : (
                <div className="grid gap-3">
                  {addresses.map((addr) => {
                    const meta = ADDRESS_META[addr.type];
                    return (
                      <article
                        key={addr.id}
                        className="border border-[#e9e1e9] rounded-xl p-3.5"
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <strong className="text-xs font-semibold text-[#292229]">
                            {addr.fullName}
                          </strong>
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#f5f1f8] rounded text-[#93819e]">
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8b7c90] leading-relaxed">
                          {[addr.flat, addr.area, addr.landmark].filter(Boolean).join(", ")}
                        </p>
                        <p className="text-[11px] text-[#8b7c90] leading-relaxed">
                          {[addr.city, addr.pincode].filter(Boolean).join(" – ")}
                        </p>
                        {addr.phone && (
                          <p className="text-[11px] text-[#8b7c90]">+91 {addr.phone}</p>
                        )}

                        {confirmDeleteId === addr.id ? (
                          <div className="mt-3 pt-2.5 border-t border-[#f2ecf1] space-y-2">
                            <p className="text-xs font-medium text-[#514254]">
                              Remove this saved address?
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 min-h-[38px] rounded-[10px] border border-[#e4d9e4] text-xs font-semibold text-[#876680] cursor-pointer"
                              >
                                Keep address
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleDeleteAddress(addr.id)}
                                className="flex-1 min-h-[38px] rounded-[10px] bg-[#a72055] text-white text-xs font-semibold cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-4 border-t border-[#f2ecf1] mt-2.5 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAddrId(addr.id);
                                setAddrForm({
                                  type: addr.type,
                                  fullName: addr.fullName,
                                  phone: addr.phone,
                                  flat: addr.flat,
                                  area: addr.area,
                                  landmark: addr.landmark,
                                  city: addr.city,
                                  pincode: addr.pincode,
                                });
                                setAddrErrors({});
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-[#96778e] hover:text-[#a72958] min-h-[36px] cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(addr.id)}
                              className="inline-flex items-center gap-1 text-[11px] text-[#96778e] hover:text-rose-600 min-h-[36px] cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setEditingAddrId(null);
                  setAddrForm({
                    ...EMPTY_FORM,
                    fullName: profile.name,
                    phone: profile.phone,
                  });
                  setAddrErrors({});
                }}
                className="w-full min-h-[44px] rounded-[11px] border border-dashed border-[#d9ced9] hover:border-[#a72958] text-[#876680] hover:text-[#a72958] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add a new address
              </button>
            </>
          )}
        </section>
      </div>

      {/* Mobile Log out button */}
      <button
        type="button"
        onClick={logoutCustomer}
        className="lg:hidden min-h-[44px] rounded-[11px] border border-[#e4d9e4] bg-white text-[#876680] text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5" /> Log out
      </button>
    </div>
  );
}

