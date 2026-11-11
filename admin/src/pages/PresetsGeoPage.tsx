import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sliders,
  MapPin,
  Clock,
  CalendarOff,
  Users,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import { adminApi, type Preset } from "@/api/client";
import { PermissionGuard } from "@/components/ui/PermissionGuard";
import { useToast } from "@/components/ui/Toast";
import { CouponsPage } from "@/pages/CouponsPage";

export function PresetsGeoPage() {
  const location = useLocation();
  const qc = useQueryClient();
  const { showToast } = useToast();

  const slug = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "city";
  }, [location.pathname]);

  if (slug === "coupon") {
    return <CouponsPage />;
  }

  const initialTab =
    slug === "city"
      ? "cities"
      : slug === "state"
      ? "states"
      : slug === "delivery-type"
      ? "slots"
      : "presets";

  const [tab, setTab] = useState<"cities" | "pincodes" | "slots" | "blackouts" | "decorators" | "states" | "presets">(initialTab);

  useEffect(() => {
    setTab(
      slug === "city"
        ? "cities"
        : slug === "state"
        ? "states"
        : slug === "delivery-type"
        ? "slots"
        : "presets"
    );
  }, [slug]);
  const [cityName, setCityName] = useState("");
  const [cityChargeRs, setCityChargeRs] = useState("0");
  const [cityCutoff, setCityCutoff] = useState("17:00");
  const [cityPopular, setCityPopular] = useState(true);

  const [pinCityId, setPinCityId] = useState("1");
  const [pinCode, setPinCode] = useState("");
  const [pinArea, setPinArea] = useState("");

  const [slotLabel, setSlotLabel] = useState("Midnight (11 PM - 12 AM)");
  const [slotStart, setSlotStart] = useState("23:00");
  const [slotEnd, setSlotEnd] = useState("23:59");
  const [slotChargeRs, setSlotChargeRs] = useState("199");
  const [slotCap, setSlotCap] = useState("20");
  const [slotMidnight, setSlotMidnight] = useState(true);

  const [ledgerCityId, setLedgerCityId] = useState("1");
  const [ledgerDate, setLedgerDate] = useState(new Date().toISOString().slice(0, 10));

  const [blackoutDate, setBlackoutDate] = useState("");
  const [blackoutReason, setBlackoutReason] = useState("Valentine / Festival Surge");
  const [blackoutSurgeRs, setBlackoutSurgeRs] = useState("149");

  const [teamCityId, setTeamCityId] = useState("1");
  const [teamName, setTeamName] = useState("");
  const [teamPhone, setTeamPhone] = useState("");

  const [stateName, setStateName] = useState("");
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetHex, setPresetHex] = useState("#9B1B45");
  const [presetHref, setPresetHref] = useState("");
  const [presetNote, setPresetNote] = useState("");
  const [presetNum1, setPresetNum1] = useState("18");
  const [presetNum2, setPresetNum2] = useState("24");

  const { data: cities = [] } = useQuery({
    queryKey: ["cities"],
    queryFn: () => adminApi.listCities(),
  });

  const { data: states = [] } = useQuery({
    queryKey: ["states"],
    queryFn: () => adminApi.listStates(),
    enabled: tab === "states",
  });

  const { data: pincodesData } = useQuery({
    queryKey: ["pincodes"],
    queryFn: () => adminApi.listPincodes(),
    enabled: tab === "pincodes",
  });

  const { data: slots = [] } = useQuery({
    queryKey: ["time-slots"],
    queryFn: () => adminApi.listTimeSlots(),
    enabled: tab === "slots",
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ["slot-ledger", ledgerCityId, ledgerDate],
    queryFn: () => adminApi.listSlotCapacity(Number(ledgerCityId), ledgerDate),
    enabled: tab === "slots" && Number(ledgerCityId) > 0,
  });

  const { data: blackouts = [] } = useQuery({
    queryKey: ["blackout-dates"],
    queryFn: () => adminApi.listBlackoutDates(),
    enabled: tab === "blackouts",
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["decorator-teams"],
    queryFn: () => adminApi.listDecoratorTeams(),
    enabled: tab === "decorators",
  });

  const { data: presets = [] } = useQuery({
    queryKey: ["presets", slug],
    queryFn: () => adminApi.listPresets(slug),
    enabled: tab === "presets",
  });

  const saveCityMut = useMutation({
    mutationFn: () =>
      adminApi.saveCity({
        name: cityName,
        base_delivery_charge_paise: Math.round(Number(cityChargeRs) * 100),
        same_day_cutoff_time: cityCutoff,
        is_popular: cityPopular,
        midnight_available: true,
        is_active: true,
      }),
    onSuccess: () => {
      showToast("City saved", "success");
      setCityName("");
      qc.invalidateQueries({ queryKey: ["cities"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const savePinMut = useMutation({
    mutationFn: () =>
      adminApi.savePincode({
        city_id: Number(pinCityId),
        code: pinCode,
        area_name: pinArea,
        is_express_available: true,
        is_serviceable: true,
      }),
    onSuccess: () => {
      showToast("Pincode saved", "success");
      setPinCode("");
      setPinArea("");
      qc.invalidateQueries({ queryKey: ["pincodes"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const saveSlotMut = useMutation({
    mutationFn: () =>
      adminApi.saveTimeSlot({
        label: slotLabel,
        start_time: slotStart,
        end_time: slotEnd,
        is_midnight: slotMidnight,
        extra_charge_paise: Math.round(Number(slotChargeRs) * 100),
        default_capacity: Number(slotCap),
        is_active: true,
      }),
    onSuccess: () => {
      showToast("Time slot template added", "success");
      qc.invalidateQueries({ queryKey: ["time-slots"] });
      qc.invalidateQueries({ queryKey: ["slot-ledger"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const toggleSlotBlockMut = useMutation({
    mutationFn: (ov: { slot_template_id: number; max_capacity: number; is_blocked: boolean }) =>
      adminApi.upsertSlotCapacity({
        city_id: Number(ledgerCityId),
        service_date: ledgerDate,
        slot_template_id: ov.slot_template_id,
        max_capacity: ov.max_capacity,
        is_blocked: !ov.is_blocked,
      }),
    onSuccess: () => {
      showToast("Slot capacity updated", "success");
      qc.invalidateQueries({ queryKey: ["slot-ledger"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const saveBlackoutMut = useMutation({
    mutationFn: () =>
      adminApi.saveBlackoutDate({
        blackout_date: blackoutDate,
        reason: blackoutReason,
        block_same_day: true,
        extra_surge_paise: Math.round(Number(blackoutSurgeRs) * 100),
      }),
    onSuccess: () => {
      showToast("Blackout / peak date added", "success");
      setBlackoutDate("");
      qc.invalidateQueries({ queryKey: ["blackout-dates"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const saveTeamMut = useMutation({
    mutationFn: () =>
      adminApi.saveDecoratorTeam({
        city_id: Number(teamCityId),
        name: teamName,
        phone: teamPhone,
        daily_capacity: 6,
        is_active: true,
      }),
    onSuccess: () => {
      showToast("Decorator team saved", "success");
      setTeamName("");
      setTeamPhone("");
      qc.invalidateQueries({ queryKey: ["decorator-teams"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const saveStateMut = useMutation({
    mutationFn: () => adminApi.saveState({ name: stateName, is_active: true }),
    onSuccess: () => {
      showToast("State saved", "success");
      setStateName("");
      qc.invalidateQueries({ queryKey: ["states"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const savePresetMut = useMutation({
    mutationFn: () => {
      const metadata: Record<string, unknown> = {};
      if (slug === "color" || slug === "balloon-color" || slug === "label" || slug === "promotion-tags") {
        metadata.hex = presetHex;
      }
      if (slug === "quick-links" || slug === "trending-searches") {
        metadata.href = presetHref || "/";
      }
      if (slug === "faq") {
        metadata.answer = presetNote;
      }
      if (slug === "care-info" || slug === "delivery-info") {
        metadata.instructions = presetNote;
      }
      if (slug === "meta-title-template" || slug === "meta-description-template") {
        metadata.template = presetNote || "{{category}} in {{city}} | Giftlaya";
      }
      if (slug === "gst") {
        metadata.rate_percent = Number(presetNum1) || 18;
        if (presetNote) metadata.hsn = presetNote;
      }
      if (slug === "advance-payment") {
        metadata.percent = Number(presetNum1) || 50;
      }
      if (slug === "cancellation-policy") {
        metadata.cutoff_hours = Number(presetNum2) || 24;
        metadata.fee_percent = Number(presetNum1) || 25;
      }
      if (slug === "enhancement") {
        metadata.extra_paise = Math.round((Number(presetNum1) || 0) * 100);
      }
      if (slug === "processing-time") {
        metadata.hours = Number(presetNum1) || 2;
      }
      return adminApi.savePreset({
        id: editingPreset?.id,
        preset_type: slug,
        name: presetName,
        slug: editingPreset?.slug || presetName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        metadata: metadata as unknown as Preset["metadata"],
        is_active: true,
      });
    },
    onSuccess: () => {
      showToast(`${editingPreset ? "Updated" : "Added"} ${slug} preset`, "success");
      setEditingPreset(null);
      setPresetName("");
      setPresetNote("");
      setPresetHref("");
      qc.invalidateQueries({ queryKey: ["presets", slug] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const delPresetMut = useMutation({
    mutationFn: (id: number) => adminApi.deletePreset(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["presets", slug] }),
  });

  return (
    <PermissionGuard module="preset">
      <div className="space-y-4 animate-bd-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold capitalize flex items-center gap-2">
              <Sliders size={20} className="text-[#4f6ef7]" />
              {slug.replaceAll("-", " ")} & Delivery Operations
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Cities, pincodes, time slots, slot capacity ledger, blackout dates, decorator teams & catalog presets.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
          {(
            [
              ["cities", "Cities & Cutoffs", MapPin],
              ["pincodes", "Pincodes", MapPin],
              ["slots", "Time Slots & Capacity", Clock],
              ["blackouts", "Blackout / Peak Dates", CalendarOff],
              ["decorators", "Decorator Teams", Users],
              ["states", "States", MapPin],
              ["presets", `${slug.replaceAll("-", " ")} Items`, Sliders],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold capitalize cursor-pointer ${
                tab === id
                  ? "bg-[#4f6ef7] text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {tab === "cities" && (
          <div className="space-y-4 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCityMut.mutate();
              }}
              className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800"
            >
              <div>
                <label className="block font-semibold mb-1">City Name *</label>
                <input
                  required
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  placeholder="Kolkata"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Delivery Fee (INR)</label>
                <input
                  type="number"
                  value={cityChargeRs}
                  onChange={(e) => setCityChargeRs(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 w-28"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Same-Day Cutoff</label>
                <input
                  type="time"
                  value={cityCutoff}
                  onChange={(e) => setCityCutoff(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>
              <label className="inline-flex items-center gap-1.5 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cityPopular}
                  onChange={(e) => setCityPopular(e.target.checked)}
                />
                Popular Metro
              </label>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                <Plus size={13} className="inline mr-1" /> Add City
              </button>
            </form>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3">Base Delivery Fee</th>
                    <th className="px-4 py-3">Same-Day Cutoff</th>
                    <th className="px-4 py-3">Popular</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No cities configured yet.
                      </td>
                    </tr>
                  ) : (
                    cities.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 font-semibold">{c.name}</td>
                        <td className="px-4 py-3 text-slate-500">{c.slug}</td>
                        <td className="px-4 py-3">₹{((c.base_delivery_charge_paise ?? 0) / 100).toFixed(0)}</td>
                        <td className="px-4 py-3 font-mono">{c.same_day_cutoff_time}</td>
                        <td className="px-4 py-3">{c.is_popular ? "Yes (Hero Modal)" : "Standard"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "pincodes" && (
          <div className="space-y-4 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                savePinMut.mutate();
              }}
              className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800"
            >
              <div>
                <label className="block font-semibold mb-1">City</label>
                <select
                  value={pinCityId}
                  onChange={(e) => setPinCityId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Pincode *</label>
                <input
                  required
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="700001"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 w-32"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Area Name</label>
                <input
                  value={pinArea}
                  onChange={(e) => setPinArea(e.target.value)}
                  placeholder="Salt Lake"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                Add Pincode
              </button>
            </form>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Area</th>
                    <th className="px-4 py-3">Express</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(pincodesData?.items || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        No pincodes configured yet.
                      </td>
                    </tr>
                  ) : (
                    (pincodesData?.items || []).map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-mono font-bold">{p.code}</td>
                        <td className="px-4 py-3">{p.city_name}</td>
                        <td className="px-4 py-3">{p.area_name}</td>
                        <td className="px-4 py-3">{p.is_express_available ? "Yes" : "No"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "slots" && (
          <div className="space-y-4 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveSlotMut.mutate();
              }}
              className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800"
            >
              <div>
                <label className="block font-semibold mb-1">Slot Label</label>
                <input value={slotLabel} onChange={(e) => setSlotLabel(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Start</label>
                <input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label className="block font-semibold mb-1">End</label>
                <input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Extra Charge (INR)</label>
                <input type="number" value={slotChargeRs} onChange={(e) => setSlotChargeRs(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 w-24" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Capacity</label>
                <input type="number" value={slotCap} onChange={(e) => setSlotCap(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 w-20" />
              </div>
              <label className="inline-flex items-center gap-1 py-2">
                <input type="checkbox" checked={slotMidnight} onChange={(e) => setSlotMidnight(e.target.checked)} /> Midnight
              </label>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                Add Slot
              </button>
            </form>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">Daily Slot Capacity Ledger ({slots.length} templates)</p>
                <div className="flex gap-2">
                  <select value={ledgerCityId} onChange={(e) => setLedgerCityId(e.target.value)} className="px-2.5 py-1.5 rounded-xl border border-slate-200">
                    {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input type="date" value={ledgerDate} onChange={(e) => setLedgerDate(e.target.value)} className="px-2.5 py-1.5 rounded-xl border border-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {ledger.map((ov) => (
                  <div key={ov.slot_template_id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{ov.slot_label}</p>
                      <p className="text-[11px] text-slate-400">
                        Reserved: {ov.reserved_count} / {ov.max_capacity}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        toggleSlotBlockMut.mutate({
                          slot_template_id: ov.slot_template_id!,
                          max_capacity: ov.max_capacity || 25,
                          is_blocked: Boolean(ov.is_blocked),
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                        ov.is_blocked ? "bg-rose-100 text-rose-700" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {ov.is_blocked ? "Blocked" : "Open"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "blackouts" && (
          <div className="space-y-4 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveBlackoutMut.mutate();
              }}
              className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800"
            >
              <div>
                <label className="block font-semibold mb-1">Date *</label>
                <input type="date" required value={blackoutDate} onChange={(e) => setBlackoutDate(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Reason</label>
                <input value={blackoutReason} onChange={(e) => setBlackoutReason(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Peak Surge (INR)</label>
                <input type="number" value={blackoutSurgeRs} onChange={(e) => setBlackoutSurgeRs(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 w-28" />
              </div>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                Add Peak/Blackout Date
              </button>
            </form>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Surge Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {blackouts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        No peak surge or blackout dates set.
                      </td>
                    </tr>
                  ) : (
                    blackouts.map((b) => (
                      <tr key={b.id}>
                        <td className="px-4 py-3 font-mono font-bold">{b.blackout_date}</td>
                        <td className="px-4 py-3">{b.city_name || "All Cities"}</td>
                        <td className="px-4 py-3">{b.reason}</td>
                        <td className="px-4 py-3">₹{((b.extra_surge_paise ?? 0) / 100).toFixed(0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "decorators" && (
          <div className="space-y-4 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveTeamMut.mutate();
              }}
              className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800"
            >
              <div>
                <label className="block font-semibold mb-1">City</label>
                <select value={teamCityId} onChange={(e) => setTeamCityId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200">
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Team Name *</label>
                <input required value={teamName} onChange={(e) => setTeamName(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Phone *</label>
                <input required value={teamPhone} onChange={(e) => setTeamPhone(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200" />
              </div>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                Add Decorator Team
              </button>
            </form>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teams.length === 0 ? (
                <div className="sm:col-span-2 lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center text-slate-400">
                  No decorator teams added yet.
                </div>
              ) : (
                teams.map((tm) => (
                  <div key={tm.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <p className="font-bold">{tm.name}</p>
                    <p className="text-slate-500">{tm.city_name} · {tm.phone}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Daily Capacity: {tm.daily_capacity}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "states" && (
          <div className="space-y-4 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveStateMut.mutate();
              }}
              className="flex gap-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800"
            >
              <input required value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="State name (e.g. West Bengal)" className="px-3 py-2 rounded-xl border border-slate-200 w-64" />
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                Add State
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              {states.length === 0 ? (
                <p className="text-slate-400 py-4">No states added yet.</p>
              ) : (
                states.map((st) => (
                  <span key={st.id} className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold">
                    {st.name}
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "presets" && (
          <div className="space-y-4 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                savePresetMut.mutate();
              }}
              className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800"
            >
              <div>
                <label className="block font-semibold mb-1 capitalize">{slug.replaceAll("-", " ")} Title *</label>
                <input
                  required
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder={`New ${slug.replaceAll("-", " ")} value...`}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 w-64"
                />
              </div>

              {(slug === "color" || slug === "balloon-color" || slug === "label" || slug === "promotion-tags") && (
                <div>
                  <label className="block font-semibold mb-1">Swatch / Badge Hex</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={presetHex} onChange={(e) => setPresetHex(e.target.value)} className="h-9 w-11 rounded cursor-pointer" />
                    <input value={presetHex} onChange={(e) => setPresetHex(e.target.value)} className="w-28 px-2.5 py-2 rounded-xl border border-slate-200 font-mono" />
                  </div>
                </div>
              )}

              {(slug === "quick-links" || slug === "trending-searches") && (
                <div>
                  <label className="block font-semibold mb-1">Target Link (href)</label>
                  <input value={presetHref} onChange={(e) => setPresetHref(e.target.value)} placeholder="/collections/birthday-decoration" className="px-3 py-2 rounded-xl border border-slate-200 w-64" />
                </div>
              )}

              {slug === "gst" && (
                <>
                  <div>
                    <label className="block font-semibold mb-1">GST Rate %</label>
                    <input type="number" value={presetNum1} onChange={(e) => setPresetNum1(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 w-24" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">HSN Code</label>
                    <input value={presetNote} onChange={(e) => setPresetNote(e.target.value)} placeholder="998599" className="px-3 py-2 rounded-xl border border-slate-200 w-32" />
                  </div>
                </>
              )}

              {slug === "advance-payment" && (
                <div>
                  <label className="block font-semibold mb-1">Advance %</label>
                  <input type="number" value={presetNum1} onChange={(e) => setPresetNum1(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 w-28" />
                </div>
              )}

              {slug === "cancellation-policy" && (
                <>
                  <div>
                    <label className="block font-semibold mb-1">Fee %</label>
                    <input type="number" value={presetNum1} onChange={(e) => setPresetNum1(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 w-24" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Cutoff (Hours)</label>
                    <input type="number" value={presetNum2} onChange={(e) => setPresetNum2(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 w-28" />
                  </div>
                </>
              )}

              {slug === "enhancement" && (
                <div>
                  <label className="block font-semibold mb-1">Extra Charge (INR)</label>
                  <input type="number" value={presetNum1} onChange={(e) => setPresetNum1(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 w-32" />
                </div>
              )}

              {slug === "processing-time" && (
                <div>
                  <label className="block font-semibold mb-1">Hours</label>
                  <input type="number" value={presetNum1} onChange={(e) => setPresetNum1(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 w-24" />
                </div>
              )}

              {(slug === "faq" || slug === "care-info" || slug === "delivery-info" || slug === "meta-title-template" || slug === "meta-description-template") && (
                <div className="flex-1 min-w-[240px]">
                  <label className="block font-semibold mb-1">
                    {slug.includes("meta") ? "Template Pattern ({{city}}, {{category}})" : slug === "faq" ? "Answer" : "Details / Note"}
                  </label>
                  <input value={presetNote} onChange={(e) => setPresetNote(e.target.value)} placeholder="Enter value..." className="w-full px-3 py-2 rounded-xl border border-slate-200" />
                </div>
              )}

              <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                {editingPreset ? "Update Preset" : `Add ${slug.replaceAll("-", " ")}`}
              </button>
              {editingPreset && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPreset(null);
                    setPresetName("");
                    setPresetNote("");
                    setPresetHref("");
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </form>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {presets.length === 0 ? (
                <p className="p-8 text-center text-slate-400">
                  No items created yet under preset type <code>{slug}</code>.
                </p>
              ) : (
                presets.map((pr) => {
                  const meta = (pr.metadata || {}) as Record<string, unknown>;
                  const hex = meta.hex ? String(meta.hex) : "";
                  return (
                    <div key={pr.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {hex && (
                          <span
                            className="w-6 h-6 rounded-lg border border-slate-200 shrink-0"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{pr.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            slug: {pr.slug}
                            {Object.keys(meta).length > 0 ? ` · ${JSON.stringify(meta)}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPreset(pr);
                            setPresetName(pr.name || "");
                            if (meta.hex) setPresetHex(String(meta.hex));
                            if (meta.href) setPresetHref(String(meta.href));
                            setPresetNote(String(meta.answer || meta.instructions || meta.template || meta.hsn || ""));
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button type="button" onClick={() => delPresetMut.mutate(pr.id!)} className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

