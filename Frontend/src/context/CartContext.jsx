import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem("agridirect_cart");
      if (storedCart) {
        setItems(JSON.parse(storedCart));
      }
    } catch (e) {
      console.error("Cart hydration error:", e);
    }
  }, []);

  const saveCart = (newItems) => {
    setItems(newItems);
    localStorage.setItem("agridirect_cart", JSON.stringify(newItems));
  };

  const addItem = (listing, grams = 1000) => {
    const existingIndex = items.findIndex((i) => i.listing._id === listing._id);
    let updatedItems;

    if (existingIndex > -1) {
      updatedItems = [...items];
      updatedItems[existingIndex].grams += grams;
    } else {
      updatedItems = [...items, { listing, grams }];
    }

    saveCart(updatedItems);
  };

  const updateQuantity = (listingId, newGrams) => {
    if (newGrams <= 0) {
      removeItem(listingId);
      return;
    }
    const updated = items.map((i) =>
      i.listing._id === listingId ? { ...i, grams: newGrams } : i
    );
    saveCart(updated);
  };

  const removeItem = (listingId) => {
    const updated = items.filter((i) => i.listing._id !== listingId);
    saveCart(updated);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const totalGrams = items.reduce((sum, i) => sum + i.grams, 0);
  const subtotalPaise = items.reduce(
    (sum, i) => sum + Math.round((i.grams / 1000) * i.listing.pricePaisePerKg),
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalGrams,
        subtotalPaise,
        itemCount: items.length,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
