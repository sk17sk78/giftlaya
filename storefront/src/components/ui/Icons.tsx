import React from "react";

export function PromiseCelebrationsIcon({ className = "w-16 h-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 88" width="64" height="70" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="p1-grad" x1="18" y1="15" x2="62" y2="67" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffc3d2" />
          <stop offset="0.42" stopColor="#e7799a" />
          <stop offset="1" stopColor="#9b1b45" />
        </linearGradient>
        <radialGradient id="p1-shadow">
          <stop stopColor="#8f284b" stopOpacity="0.22" />
          <stop offset="1" stopColor="#8f284b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="41" cy="79" rx="28" ry="6" fill="url(#p1-shadow)" />
      <g transform="rotate(-9 40 40)">
        <path d="M40 64C34 60 15 47 15 32C15 19 31 15 40 27C49 15 65 19 65 32C65 47 46 60 40 64Z" transform="translate(3 5)" fill="#8f2549" />
        <path d="M40 64C34 60 15 47 15 32C15 19 31 15 40 27C49 15 65 19 65 32C65 47 46 60 40 64Z" fill="url(#p1-grad)" stroke="#f6b5c8" strokeWidth="1" strokeLinejoin="round" />
        <path d="M23 31C23 26 28 25 31 27" fill="none" stroke="#ffe4ec" strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx="11" cy="58" r="2.5" fill="#eec0ce" />
    </svg>
  );
}

export function PromiseDecoratorsIcon({ className = "w-16 h-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 88" width="64" height="70" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="p2-grad" x1="15" y1="15" x2="65" y2="65" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffd8a8" />
          <stop offset="0.5" stopColor="#f59f00" />
          <stop offset="1" stopColor="#d9480f" />
        </linearGradient>
      </defs>
      <ellipse cx="40" cy="78" rx="24" ry="5" fill="#f59f00" fillOpacity="0.18" />
      <path d="M40 18L58 26V44C58 56 40 66 40 66C40 66 22 56 22 44V26L40 18Z" fill="url(#p2-grad)" stroke="#ffe066" strokeWidth="1.5" />
      <path d="M33 42L38 47L48 35" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PromiseOnTimeIcon({ className = "w-16 h-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 88" width="64" height="70" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="p3-grad" x1="16" y1="16" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b2f2bb" />
          <stop offset="0.45" stopColor="#37b24d" />
          <stop offset="1" stopColor="#1b642a" />
        </linearGradient>
      </defs>
      <ellipse cx="40" cy="78" rx="24" ry="5" fill="#37b24d" fillOpacity="0.18" />
      <circle cx="40" cy="42" r="24" fill="url(#p3-grad)" stroke="#8ce99a" strokeWidth="1.5" />
      <circle cx="40" cy="42" r="18" fill="#ffffff" fillOpacity="0.15" />
      <path d="M40 28V42L48 46" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PromiseSecureIcon({ className = "w-16 h-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 88" width="64" height="70" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="p4-grad" x1="15" y1="15" x2="65" y2="65" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d0ebff" />
          <stop offset="0.5" stopColor="#339af0" />
          <stop offset="1" stopColor="#1864ab" />
        </linearGradient>
      </defs>
      <ellipse cx="40" cy="78" rx="24" ry="5" fill="#339af0" fillOpacity="0.18" />
      <rect x="22" y="28" width="36" height="28" rx="6" fill="url(#p4-grad)" stroke="#a5d8ff" strokeWidth="1.5" />
      <path d="M30 28V22C30 16.5 34.5 12 40 12C45.5 12 50 16.5 50 22V28" fill="none" stroke="#339af0" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="42" r="3" fill="#ffffff" />
    </svg>
  );
}

export function AppCardIcon({ className = "w-7 h-7 sm:w-8 sm:h-8" }: { className?: string }) {
  return (
    <svg viewBox="71 49 370 403" role="img" aria-label="Giftlaya" className={className}>
      <path fill="#9B1B45" d="M252 204C213 201 142 183 132 144C120 99 157 77 192 97C228 118 244 166 252 204Z" />
      <path fill="#F6BDCE" d="M222 178C202 171 167 158 163 142C158 126 170 119 183 128C199 139 213 160 222 178Z" />
      <path fill="#9B1B45" d="M251 204C261 156 287 95 326 89C367 82 390 115 367 149C345 180 290 198 251 204Z" />
      <path fill="#F6BDCE" d="M282 174C294 150 313 124 329 121C344 118 348 129 338 140C326 153 302 166 282 174Z" />
      <path fill="#9B1B45" d="M116 255H396L387 373C385 404 365 424 334 424H178C147 424 127 404 125 373L116 255Z" />
      <path fill="#F6BDCE" d="M231 268H281V424H231V268Z" />
      <path fill="#7E1538" d="M117 268H395L393 287H119L117 268Z" />
      <rect fill="#9B1B45" x="99" y="197" width="314" height="79" rx="26" />
      <path fill="#F6BDCE" d="M231 197H281V276H231V197Z" />
      <rect fill="#9B1B45" x="233" y="177" width="46" height="38" rx="17" />
    </svg>
  );
}

export function GooglePlayBadgeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3.6 2.5C3.3 2.8 3.1 3.3 3.1 3.9V20.1C3.1 20.7 3.3 21.2 3.6 21.5L3.7 21.6L13.1 12.2V11.8L3.7 2.4L3.6 2.5Z" fill="#2196F3" />
      <path d="M16.2 15.3L13.1 12.2V11.8L16.2 8.7L16.3 8.8L20 10.9C21 11.5 21 12.5 20 13.1L16.3 15.2L16.2 15.3Z" fill="#FFC107" />
      <path d="M16.3 15.3L13.1 12.1L3.6 21.6C4 22 4.6 22 5.4 21.6L16.3 15.3Z" fill="#F44336" />
      <path d="M16.3 8.7L5.4 2.4C4.6 2 4 2 3.6 2.4L13.1 11.9L16.3 8.7Z" fill="#4CAF50" />
    </svg>
  );
}

export function SupportHeadsetIllustration({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#FDF2F5" />
      <path
        d="M15 24C15 19.0294 19.0294 15 24 15C28.9706 15 33 19.0294 33 24V29C33 30.6569 31.6569 32 30 32H29"
        stroke="#9B1B45"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="13" y="23" width="5" height="9" rx="2.5" fill="#9B1B45" />
      <rect x="30" y="23" width="5" height="9" rx="2.5" fill="#9B1B45" />
      <path
        d="M24 32V35C24 35.5523 23.5523 36 23 36H21"
        stroke="#9B1B45"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="20" cy="36" r="1.5" fill="#9B1B45" />
    </svg>
  );
}

