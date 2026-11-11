"use client";

import React, { useState, useMemo, useEffect, useId, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { City } from "@/types";
import citiesMock from "@/data/cities.json";
import styles from "./CityModal.module.css";

interface CityModalProps {
  cities?: {
    popularCities: City[];
    allCities: string[];
  };
  citiesData?: {
    popularCities: City[];
    allCities: string[];
  };
}

function MapPinIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="m4 15 8-3 8 3 8-3v14l-8 3-8-3-8 3V15Z"
        fill="#f8e4ec"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 19v7m8-6v9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity=".45"
      />
      <path
        d="M22 9c0 4.5-6 10-6 10S10 13.5 10 9a6 6 0 1 1 12 0Z"
        fill="white"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="9" r="2" fill="currentColor" />
    </svg>
  );
}

function CheckIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

const MINAR_DOME_ART = (
  <path d="M12 47V28h40v19M9 28h46M17 28v-6l6-7 9 7 9-7 6 7v6M23 15v-4m18 4v-4M20 34v9m8-9v9m8-9v9m8-9v9M9 51h46" />
);

const TOWER_SKYLINE_ART = (
  <path d="M12 47V27h15v20m0 0V13h17v34m0 0V32h9v15M9 48h47M17 33h4m-4 7h4m12-20h5m-5 8h5m-5 8h5M32 13V8" />
);

const CITY_LANDMARKS: Record<string, React.ReactNode> = {
  ahmedabad: MINAR_DOME_ART,
  bangalore: (
    <path d="M11 47V29h42v18M8 29h48M15 29v-8h34v8M27 21v-5a5 5 0 0 1 10 0v5M32 7v4M18 34v9m9-9v9m10-9v9m9-9v9M8 51h48" />
  ),
  chennai: (
    <>
      <path d="m17 46 3-10h24l3 10M20 36l3-9h18l3 9M23 27l3-9h12l3 9M26 18l3-7h6l3 7M15 47h34" />
      <path d="M28 46v-7h8v7" fill="white" />
      <path d="M29 23h6m-9 8h12M31 7h2" />
    </>
  ),
  delhi: (
    <>
      <path d="M16 47V21h32v26M13 21h38M18 16h28v5M23 16v-5h18v5" />
      <path d="M26 47V34a6 6 0 0 1 12 0v13" fill="white" />
      <path d="M21 27h2m18 0h2M20 42h3m18 0h3" />
    </>
  ),
  gandhinagar: MINAR_DOME_ART,
  gurgaon: TOWER_SKYLINE_ART,
  kolkata: (
    <>
      <path d="M6 45h52M12 45V17m40 28V17M8 21h48M12 24l20 18 20-18M12 42l20-18 20 18M22 24v18m20-18v18" />
      <path d="M6 51c5-3 8 3 13 0s8 3 13 0 8 3 13 0 8 3 13 0" />
    </>
  ),
  mumbai: (
    <>
      <path d="M13 47V25h38v22M10 25h44M13 25V15h9v10m20 0V15h9v10M12 15l5-6 6 6m18 0 5-6 6 6M24 25v-6h16v6" />
      <path d="M26 47V36a6 6 0 0 1 12 0v11" fill="white" />
      <path d="M18 32v4m28-4v4" />
    </>
  ),
  "navi mumbai": (
    <>
      <path d="M7 46h50M20 46V14m24 32V14M20 18 7 40m13-22 12 22 12-22 13 22M14 31v15m12-16v16m12-16v16m12-15v15" />
      <path d="M10 52h44" />
    </>
  ),
  pune: (
    <>
      <path d="M11 47V24h42v23M11 24v-8h6v5h6v-5h6v5h6v-5h6v5h6v-5h6v8M18 32v4m28-4v4" />
      <path d="M26 47V36a6 6 0 0 1 12 0v11" fill="white" />
    </>
  ),
  surat: TOWER_SKYLINE_ART,
  visakhapatnam: (
    <path d="m25 44 3-23h10l3 23M26 21h14v-7H26v7m-2-7 9-7 9 7M30 29h7m-8 7h9M7 48c5-4 8 4 13 0s8 4 13 0 8 4 13 0 8 4 13 0M8 19l7 3m35-4 7-3" />
  ),
};

function CityLandmarkIcon({ name }: { name: string }) {
  const art = CITY_LANDMARKS[name.toLowerCase()] || TOWER_SKYLINE_ART;
  return (
    <svg
      viewBox="0 0 64 60"
      width="64"
      height="60"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="34" cy="29" r="23" fill="#f8e8ef" />
      <circle cx="51" cy="10" r="3" fill="#e8bece" />
      <g
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {art}
      </g>
      <path
        d="M9 54h46"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity=".18"
      />
    </svg>
  );
}

export function CityModal({ cities, citiesData }: CityModalProps) {
  const activeCities =
    cities ||
    citiesData ||
    (citiesMock as { popularCities: City[]; allCities: string[] });
  const { isCityModalOpen, closeCityModal, selectedCity, setSelectedCity } =
    useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const titleId = useId();
  const descId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isCityModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 30);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = prevOverflow;
    };
  }, [isCityModalOpen]);

  const filteredCities = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return activeCities.allCities;
    return activeCities.allCities.filter((c) => c.toLowerCase().includes(q));
  }, [activeCities.allCities, searchTerm]);

  const handlePickCity = (cityName: string) => {
    setSelectedCity(cityName);
    setSearchTerm("");
  };

  if (!isCityModalOpen) return null;

  const hasChosenCity =
    Boolean(selectedCity) &&
    selectedCity.toLowerCase() !== "select your city";

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={closeCityModal} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className={styles.panel}
      >
        <div className={styles.handle} aria-hidden="true" />

        <div className={styles.header}>
          <div className={styles.heroIcon}>
            <MapPinIcon size={34} />
          </div>
          <button
            type="button"
            onClick={closeCityModal}
            aria-label="Close city selector"
            className={styles.closeBtn}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m7 7 10 10M17 7 7 17" />
            </svg>
          </button>
          <h2 id={titleId}>Where are we celebrating?</h2>
          <p id={descId}>
            Choose your city for local gifts &amp; delivery slots.
          </p>
        </div>

        <div className={styles.searchArea}>
          <label className={styles.search}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input
              ref={inputRef}
              aria-label="Search city or area"
              placeholder="Search city or area"
              autoComplete="off"
              spellCheck={false}
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchTerm("");
                  inputRef.current?.focus();
                }}
                className={styles.clearBtn}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m7 7 10 10M17 7 7 17" />
                </svg>
              </button>
            )}
          </label>
        </div>

        <div className={styles.content}>
          {hasChosenCity && !searchTerm && (
            <div className={styles.current}>
              <MapPinIcon size={23} />
              <div className={styles.currentText}>
                <span>Currently delivering to</span>
                <strong>{selectedCity}</strong>
              </div>
              <CheckIcon size={20} />
            </div>
          )}

          {!searchTerm && (
            <section aria-labelledby={`${titleId}-popular`}>
              <h3 className={styles.sectionLabel} id={`${titleId}-popular`}>
                Popular cities <span>Quick picks</span>
              </h3>
              <div className={styles.grid}>
                {activeCities.popularCities.map((city) => {
                  const isSelected =
                    selectedCity.toLowerCase() === city.name.toLowerCase();
                  return (
                    <button
                      key={city.name}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handlePickCity(city.name)}
                      className={styles.tile}
                    >
                      <CityLandmarkIcon name={city.name} />
                      <span className={styles.tileLabel}>{city.name}</span>
                      {isSelected && (
                        <span className={styles.selectedTick}>
                          <CheckIcon size={12} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {filteredCities.length > 0 ? (
            <section aria-labelledby={`${titleId}-all`}>
              <h3 className={styles.sectionLabel} id={`${titleId}-all`}>
                {searchTerm ? "Search results" : "All cities"}{" "}
                <span>
                  {searchTerm
                    ? `${filteredCities.length} matches`
                    : `${activeCities.allCities.length} destinations`}
                </span>
              </h3>
              <div className={styles.rows}>
                {filteredCities.map((city) => {
                  const isSelected =
                    selectedCity.toLowerCase() === city.toLowerCase();
                  return (
                    <button
                      key={city}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handlePickCity(city)}
                      className={styles.row}
                    >
                      <span className={styles.rowDot} aria-hidden="true" />
                      <span className={styles.rowText}>{city}</span>
                      {isSelected ? (
                        <CheckIcon size={16} />
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="m9 6 6 6-6 6" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className={styles.empty}>
              <MapPinIcon size={48} />
              <h3>We couldn’t find that city</h3>
              <p>Try another spelling or search for a nearby area.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  inputRef.current?.focus();
                }}
              >
                Browse all cities
              </button>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <CheckIcon size={14} />
          <span>Your city helps us show the right prices &amp; availability.</span>
        </div>
      </div>
    </div>
  );
}

export default CityModal;
