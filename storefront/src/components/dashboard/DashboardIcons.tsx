import React from "react";

export type DashboardIconKind =
  | "overview"
  | "orders"
  | "coins"
  | "profile"
  | "address"
  | "support"
  | "gift"
  | "security";

const PALETTE: Record<DashboardIconKind, [string, string, string]> = {
  overview: ["#fff1f6", "#b53869", "#f8b8d0"],
  orders: ["#eff5ff", "#568bca", "#c0dcff"],
  coins: ["#fff7e1", "#c48b21", "#ffe4a2"],
  profile: ["#f4f0ff", "#9270c6", "#dfd0ff"],
  address: ["#edf9f3", "#449a7b", "#bce9d7"],
  support: ["#fff3e8", "#c18b4a", "#ffddb5"],
  gift: ["#fff1f6", "#bd4576", "#fac6db"],
  security: ["#eef8f7", "#49988f", "#c0e8df"],
};

export function DashboardSvgIcon({
  kind,
  size = 38,
}: {
  kind: DashboardIconKind;
  size?: number;
}) {
  const [bg, stroke, accent] = PALETTE[kind] || PALETTE.overview;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      stroke={stroke}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <rect x="1" y="1" width="38" height="38" rx="13" fill={bg} stroke="none" />
      {kind === "overview" && (
        <>
          <rect x="9" y="9" width="9" height="9" rx="3" fill={accent} />
          <rect x="22" y="9" width="9" height="9" rx="3" fill="white" />
          <rect x="9" y="22" width="9" height="9" rx="3" fill="white" />
          <rect x="22" y="22" width="9" height="9" rx="3" fill={accent} />
        </>
      )}
      {kind === "orders" && (
        <>
          <path d="m9 14 11-5 11 5v14l-11 5-11-5V14Z" fill="white" />
          <path d="m9 14 11 5 11-5M20 19v14m-6-21 11 5v7l-5 2v-7" fill={accent} />
        </>
      )}
      {kind === "coins" && (
        <>
          <circle cx="24" cy="16" r="9" fill="white" />
          <circle cx="16" cy="24" r="10" fill={accent} />
          <path d="M12 19h8m-8 4h8m-6-4c6 0 6 5 0 5l5 5m12-21V4m-2 2h4" />
        </>
      )}
      {kind === "profile" && (
        <>
          <circle cx="20" cy="15" r="6" fill={accent} />
          <path d="M9 31v-3c0-5 5-7 11-7s11 2 11 7v3H9Z" fill="white" />
        </>
      )}
      {kind === "address" && (
        <>
          <path d="m7 24 8-3 10 3 8-3v10l-8 3-10-3-8 3V24Z" fill={accent} />
          <path d="M15 26v5m10-3v6" />
          <path d="M28 14c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" fill="white" />
          <circle cx="20" cy="14" r="3" fill={accent} />
        </>
      )}
      {kind === "support" && (
        <>
          <path d="M10 22v-4a10 10 0 0 1 20 0v8c0 4-3 6-8 6" />
          <rect x="7" y="18" width="6" height="10" rx="3" fill={accent} />
          <rect x="27" y="18" width="6" height="10" rx="3" fill={accent} />
          <rect x="18" y="30" width="6" height="4" rx="2" fill="white" />
        </>
      )}
      {kind === "gift" && (
        <>
          <rect x="9" y="18" width="22" height="15" rx="3" fill="white" />
          <rect x="7" y="13" width="26" height="7" rx="2" fill={accent} />
          <path d="M20 13v20m0-20c-12 0-10-10-5-7 3 2 5 7 5 7Zm0 0c12 0 10-10 5-7-3 2-5 7-5 7Z" />
        </>
      )}
      {kind === "security" && (
        <>
          <path d="m20 7 11 4v8c0 8-11 14-11 14S9 27 9 19v-8l11-4Z" fill={accent} />
          <rect x="15" y="17" width="10" height="9" rx="3" fill="white" />
          <path d="M17 17v-3a3 3 0 0 1 6 0v3m-3 4v1" />
        </>
      )}
    </svg>
  );
}

