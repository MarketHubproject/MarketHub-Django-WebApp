import React, { createContext, useContext, useReducer, ReactNode } from "react";
import AnalyticsService from '../utils/analyticsStub';

export interface CartItem {
  id: number;
  product: {
    id: number;
    name: string;
    price: number;
    image?: string;
    images?: string[];
    category: string;
    stock: number;
  };
  quantity: number;
  subtotal: number;
}

export interface CartState {
  items: CartItem[];
  total: number;
  itemsCount: number;
  lastUpdated: Date | null;
}

type CartAction =
  | { type: "SET_CART"; payload: CartState }
  | {
      type: "ADD_ITEM";
      payload: { product: CartItem["product"]; quantity: number };
    }
  | { type: "UPDATE_ITEM"; payload: { itemId: number; quantity: number } }
  | { type: "REMOVE_ITEM"; payload: { itemId: number } }
  | { type: "CLEAR_CART" }
  | { type: "SET_LOADING"; payload: boolean };

interface CartContextType extends CartState {
  loading: boolean;
  addToCart: (product: CartItem["product"], quantity: number) => void;
  updateCartItem: (itemId: number, quantity: number) => void;
  removeFromCart: (itemId: number) => void;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const initialState: CartState = {
  items: [],
  total: 0,
  itemsCount: 0,
  lastUpdated: null,
};

function cartReducer(
  state: CartState & { loading: boolean },
  action: CartAction
): CartState & { loading: boolean } {
  switch (action.type) {
    case "SET_CART":
      return {
        ...action.payload,
        loading: false,
        lastUpdated: new Date(),
      };

    case "ADD_ITEM": {
      const { product, quantity } = action.payload;
      const existingItemIndex = state.items.findIndex(
        (item) => item.product.id === product.id
      );

      let updatedItems: CartItem[];
      if (existingItemIndex >= 0) {
        // Update existing item
        updatedItems = state.items.map((item, index) => {
          if (index === existingItemIndex) {
            const newQuantity = item.quantity + quantity;
            return {
              ...item,
              quantity: Math.min(newQuantity, item.product.stock),
              subtotal:
                item.product.price * Math.min(newQuantity, item.product.stock),
            };
          }
          return item;
        });
      } else {
        // Add new item
        const newItem: CartItem = {
          id: Date.now(), // Generate temporary ID
          product,
          quantity: Math.min(quantity, product.stock),
          subtotal: product.price * Math.min(quantity, product.stock),
        };
        updatedItems = [...state.items, newItem];
      }

      const newTotal = updatedItems.reduce(
        (sum, item) => sum + item.subtotal,
        0
      );
      const newItemsCount = updatedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      return {
        ...state,
        items: updatedItems,
        total: newTotal,
        itemsCount: newItemsCount,
        lastUpdated: new Date(),
      };
    }

    case "UPDATE_ITEM": {
      const { itemId, quantity } = action.payload;
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        return cartReducer(state, { type: "REMOVE_ITEM", payload: { itemId } });
      }

      const updatedItems = state.items.map((item) => {
        if (item.id === itemId) {
          const newQuantity = Math.min(quantity, item.product.stock);
          return {
            ...item,
            quantity: newQuantity,
            subtotal: item.product.price * newQuantity,
          };
        }
        return item;
      });

      const newTotal = updatedItems.reduce(
        (sum, item) => sum + item.subtotal,
        0
      );
      const newItemsCount = updatedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      return {
        ...state,
        items: updatedItems,
        total: newTotal,
        itemsCount: newItemsCount,
        lastUpdated: new Date(),
      };
    }

    case "REMOVE_ITEM": {
      const { itemId } = action.payload;
      const updatedItems = state.items.filter((item) => item.id !== itemId);
      const newTotal = updatedItems.reduce(
        (sum, item) => sum + item.subtotal,
        0
      );
      const newItemsCount = updatedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      return {
        ...state,
        items: updatedItems,
        total: newTotal,
        itemsCount: newItemsCount,
        lastUpdated: new Date(),
      };
    }

    case "CLEAR_CART":
      return {
        ...initialState,
        loading: state.loading,
        lastUpdated: new Date(),
      };

    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };

    default:
      return state;
  }
}

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    ...initialState,
    loading: false,
  });

  const addToCart = (product: CartItem["product"], quantity: number) => {
    dispatch({ type: "ADD_ITEM", payload: { product, quantity } });

    // Track add to cart event (funnel step 2)
    AnalyticsService.trackAddToCart({
      item_id: product.id.toString(),
      item_name: product.name,
      item_category: product.category,
      price: product.price,
      currency: "ZAR",
      quantity: quantity,
    });
  };

  const updateCartItem = (itemId: number, quantity: number) => {
    dispatch({ type: "UPDATE_ITEM", payload: { itemId, quantity } });
  };

  const removeFromCart = (itemId: number) => {
    dispatch({ type: "REMOVE_ITEM", payload: { itemId } });
  };

  const clearCart = () => {
    dispatch({ type: "CLEAR_CART" });
  };

  const refreshCart = async () => {
    // In a real app, this would fetch from an API
    // For now, we'll just simulate a refresh
    dispatch({ type: "SET_LOADING", payload: true });

    setTimeout(() => {
      dispatch({ type: "SET_LOADING", payload: false });
    }, 1000);
  };

  const value: CartContextType = {
    ...state,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
