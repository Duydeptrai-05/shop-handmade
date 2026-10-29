"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

type ToggleResult = "added" | "removed" | "login" | "error";

type WishlistContextValue = {
  count: number;
  isLiked: (productId: number) => boolean;
  toggle: (productId: number) => Promise<ToggleResult>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ids, setIds] = useState<Set<number>>(new Set());

  // Tải danh sách yêu thích. Chưa đăng nhập hoặc là Admin thì API trả 401
  // và danh sách để trống.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/wishlist", { cache: "no-store" });
      if (!res.ok) {
        setIds(new Set());
        return;
      }
      const json = await res.json();
      const list: { productId: number }[] = json.data ?? [];
      setIds(new Set(list.map((i) => i.productId)));
    } catch {
      // mất mạng: giữ nguyên danh sách hiện có
    }
  }, []);

  // Tải lại mỗi khi đổi trang, để sau khi đăng nhập/đăng xuất
  // thì trái tim cập nhật đúng
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  const isLiked = useCallback((productId: number) => ids.has(productId), [ids]);

  const toggle = useCallback(
    async (productId: number): Promise<ToggleResult> => {
      const wasLiked = ids.has(productId);

      // Cập nhật giao diện ngay cho mượt, lỗi thì hoàn lại
      setIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(productId);
        else next.add(productId);
        return next;
      });

      const revert = () =>
        setIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(productId);
          else next.delete(productId);
          return next;
        });

      try {
        const res = await fetch(
          wasLiked ? `/api/wishlist/${productId}` : "/api/wishlist",
          wasLiked
            ? { method: "DELETE" }
            : {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId }),
              }
        );
        if (res.status === 401) {
          revert();
          return "login";
        }
        if (!res.ok) {
          revert();
          return "error";
        }
        return wasLiked ? "removed" : "added";
      } catch {
        revert();
        return "error";
      }
    },
    [ids]
  );

  return (
    <WishlistContext.Provider value={{ count: ids.size, isLiked, toggle }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist phải được dùng bên trong WishlistProvider");
  }
  return ctx;
}