"use client";

import React from "react";
import { useUI } from "./UIContext";
import { useCity } from "./CityContext";
import { useCart } from "./CartContext";

export function useApp() {
  const ui = useUI();
  const city = useCity();
  const cart = useCart();

  return {
    ...ui,
    ...city,
    ...cart,
  };
}

export { useUI } from "./UIContext";
export { useCity } from "./CityContext";
export { useCart } from "./CartContext";
