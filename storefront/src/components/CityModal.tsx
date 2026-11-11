"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { City } from "@/types";
import { X, Search, Check, ChevronRight } from "lucide-react";

interface CityModalProps {
  citiesData: {
    popularCities: City[];
    allCities: string[];
  };
}

export default function CityModal({ citiesData }: CityModalProps) {
  const { isCityModalOpen, closeCityModal, selectedCity, setSelectedCity } = useApp();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCities = useMemo(() => {
    if (!searchTerm.trim()) return citiesData.allCities;
    return citiesData.allCities.filter(c =>
      c.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [citiesData.allCities, searchTerm]);

  if (!isCityModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity"
        onClick={closeCityModal}
      />

      {/* Modal Dialog Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select delivery city"
        className="relative w-full max-w-[620px] max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#f0e9ec] relative">
          <button
            type="button"
            onClick={closeCityModal}
            aria-label="Close city selector"
            className="absolute top-5 right-5 w-8 h-8 rounded-full border border-[#ebe5e9] flex items-center justify-center text-[#70636c] hover:bg-[#faf3f6] hover:text-[#9b1b45] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-11 h-11 rounded-2xl bg-[#fdf2f5] border border-[#f8c2d2] flex items-center justify-center mb-3">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <path d="m4 15 8-3 8 3 8-3v14l-8 3-8-3-8 3V15Z" fill="#f8e4ec" stroke="#9b1b45" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M12 19v7m8-6v9" stroke="#9b1b45" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
              <path d="M22 9c0 4.5-6 10-6 10S10 13.5 10 9a6 6 0 1 1 12 0Z" fill="white" stroke="#9b1b45" strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="16" cy="9" r="2" fill="#9b1b45" />
            </svg>
          </div>

          <h2 className="font-heading text-[20px] font-bold text-[#29232a]">
            Where are we celebrating?
          </h2>
          <p className="text-[12px] sm:text-[13px] text-[#70636c] mt-0.5">
            Choose your city for local gifts &amp; delivery slots.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="px-6 py-3 border-b border-[#f7f2f5] bg-[#fffbfd]">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#8d7b87] absolute left-3 pointer-events-none" />
            <input
              type="search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search city or area"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#faf7f9] border border-[#eae2e8] text-[13px] text-[#29232a] placeholder-[#9a8996] focus:outline-none focus:border-[#9b1b45] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Content: Popular Cities Grid & All Cities List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Popular Cities */}
          {!searchTerm && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[12px] font-bold text-[#29232a] uppercase tracking-wider">
                  Popular cities
                </h3>
                <span className="text-[11px] text-[#9b7d91]">Quick picks</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {citiesData.popularCities.map(city => {
                  const isSelected = selectedCity.toLowerCase() === city.name.toLowerCase();
                  return (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => setSelectedCity(city.name)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? "border-[#9b1b45] bg-[#fdf2f5] text-[#9b1b45] font-bold shadow-sm"
                          : "border-[#f0e8ed] bg-white text-[#34212a] hover:border-[#d9a9bd] hover:bg-[#fffbfd]"
                      }`}
                    >
                      {/* Skyline illustration pill */}
                      <span className="w-8 h-8 rounded-full bg-[#faf7f9] border border-[#f0e9ed] flex items-center justify-center text-[10px] font-black text-[#9b1b45] mb-1.5">
                        {city.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="text-[12px] font-semibold">{city.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Cities List */}
          <div>
            <h3 className="text-[12px] font-bold text-[#29232a] uppercase tracking-wider mb-2">
              {searchTerm ? `Matching cities (${filteredCities.length})` : "All cities in India"}
            </h3>

            <div className="divide-y divide-[#f7f2f5] border border-[#f0e8ed] rounded-2xl overflow-hidden bg-white">
              {filteredCities.length > 0 ? (
                filteredCities.map(city => {
                  const isSelected = selectedCity.toLowerCase() === city.toLowerCase();
                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setSelectedCity(city)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[13px] hover:bg-[#faf7f9] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? "bg-[#9b1b45]" : "bg-[#dfd5da]"
                          }`}
                        />
                        <span className={`font-medium ${isSelected ? "text-[#9b1b45] font-bold" : "text-[#49333f]"}`}>
                          {city}
                        </span>
                      </div>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-[#9b1b45]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#bcaab8]" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="p-6 text-center text-[#70636c] text-[13px]">
                  No cities found for &quot;{searchTerm}&quot;.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#f0e9ec] bg-[#faf8f9] flex items-center gap-2 text-[11px] text-[#70636c]">
          <Check className="w-3.5 h-3.5 text-[#47816b] shrink-0" />
          <span>Your city helps us show the right prices &amp; availability.</span>
        </div>
      </div>
    </div>
  );
}
