"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type CartItem = {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  // Tồn kho tại thời điểm thêm vào giỏ. Optional để giỏ cũ trong localStorage
  // (chưa có trường này) vẫn đọc được, khi đó coi như chưa giới hạn.
  stock?: number;
};

type AddItemResult = {
  added: number; // số lượng thực sự được thêm
  limited: boolean; // true nếu bị cắt xuống vì chạm tồn kho
};

type CartContextType = {
  items: CartItem[];
  addItem: (
    item: Omit<CartItem, "quantity">,
    quantity?: number,
  ) => AddItemResult;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "shop-handmade-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Đọc giỏ hàng từ localStorage khi component mount (chỉ chạy ở client)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Không đọc được giỏ hàng từ localStorage:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Ghi lại localStorage mỗi khi items thay đổi (bỏ qua lần đầu trước khi load xong)
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Không lưu được giỏ hàng vào localStorage:", error);
    }
  }, [items, isLoaded]);

  function addItem(
    item: Omit<CartItem, "quantity">,
    quantity: number = 1,
  ): AddItemResult {
    const existing = items.find((i) => i.id === item.id);
    const currentQty = existing ? existing.quantity : 0;

    // Ưu tiên stock mới nhất truyền vào, nếu không có thì dùng stock đã lưu
    const stock = item.stock ?? existing?.stock;

    // Còn thêm được tối đa bao nhiêu (không giới hạn nếu chưa biết stock)
    const room =
      stock === undefined ? quantity : Math.max(0, stock - currentQty);
    const added = Math.min(quantity, room);

    if (added > 0) {
      setItems((prev) => {
        const found = prev.find((i) => i.id === item.id);
        if (found) {
          return prev.map((i) =>
            i.id === item.id
              ? { ...i, stock, quantity: i.quantity + added }
              : i,
          );
        }
        return [...prev, { ...item, stock, quantity: added }];
      });
    }

    return { added, limited: added < quantity };
  }

  function removeItem(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateQuantity(id: number, quantity: number) {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        // Không cho vượt tồn kho (nếu đã biết stock)
        const next =
          i.stock === undefined ? quantity : Math.min(quantity, i.stock);
        return { ...i, quantity: next };
      }),
    );
  }

  function clearCart() {
    setItems([]);
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart phải được dùng bên trong CartProvider");
  }
  return context;
}
