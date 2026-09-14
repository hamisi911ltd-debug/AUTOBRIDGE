"use client";

import { createContext, useContext } from "react";

export type CartContextValue = {
  cart: Set<string>;
  toggleCart: (id: string) => void;
};

/**
 * VehicleCard is used from a dozen+ places (home sections, search, detail's
 * "similar vehicles", the invoice picker...) - threading cart state and
 * toggleCart down through every one of those parent components' props would
 * touch far more files than the feature itself warrants. A context lets
 * VehicleCard (and the Header's cart icon, and CartPage) reach the same
 * cart state directly, with the actual state still living in one place
 * (AutoBridgeApp, alongside favorites, which follows the same pattern).
 */
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ value, children }: { value: CartContextValue; children: React.ReactNode }) {
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
