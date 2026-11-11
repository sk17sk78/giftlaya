"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface CityContextType {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  isCityModalOpen: boolean;
  openCityModal: () => void;
  closeCityModal: () => void;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [selectedCity, setSelectedCityState] = useState<string>("Select your city");
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("giftlaya_city");
      if (saved) setSelectedCityState(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsCityModalOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const setSelectedCity = (city: string) => {
    setSelectedCityState(city);
    try {
      localStorage.setItem("giftlaya_city", city);
    } catch {
      // ignore
    }
    setIsCityModalOpen(false);
  };

  const openCityModal = () => setIsCityModalOpen(true);
  const closeCityModal = () => setIsCityModalOpen(false);

  return (
    <CityContext.Provider
      value={{
        selectedCity,
        setSelectedCity,
        isCityModalOpen,
        openCityModal,
        closeCityModal,
      }}
    >
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) {
    throw new Error("useCity must be used within CityProvider");
  }
  return ctx;
}

