"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ProductSearchProps = {
  initialKeyword: string;
  categoryId: number | null;
};

const DEBOUNCE_MS = 300;

export default function ProductSearch({
  initialKeyword,
  categoryId,
}: ProductSearchProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialKeyword);

  // Từ khóa gần nhất đã đẩy lên URL (hoặc đến từ URL). Dùng để tránh
  // đẩy trùng và để không ghi đè chữ đang gõ dở khi trang tải lại.
  const lastPushed = useRef(initialKeyword);

  // Từ khóa trên URL đổi do nguyên nhân bên ngoài (ví dụ bấm "Xóa tìm kiếm")
  // thì cập nhật lại ô nhập.
  useEffect(() => {
    if (initialKeyword !== lastPushed.current) {
      lastPushed.current = initialKeyword;
      setValue(initialKeyword);
    }
  }, [initialKeyword]);

  // Gõ xong khoảng 0,3 giây thì tự cập nhật URL, giữ danh mục đang chọn.
  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === lastPushed.current) return;

    const timer = setTimeout(() => {
      lastPushed.current = trimmed;
      const params = new URLSearchParams();
      if (categoryId) params.set("category", String(categoryId));
      if (trimmed) params.set("q", trimmed);
      const qs = params.toString();
      router.replace(qs ? `/products?${qs}` : "/products", { scroll: false });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, categoryId, router]);

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      role="search"
      className="flex w-full items-center gap-2.5 rounded-lg border border-peach bg-white px-3.5 transition-colors focus-within:border-moss focus-within:ring-2 focus-within:ring-moss/20 md:max-w-xs"
    >
      {/* Biểu tượng kính lúp */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0 text-moss-dark"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="m20 20-4-4" />
      </svg>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tìm theo tên..."
        aria-label="Tìm sản phẩm theo tên"
        className="w-full bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink/40"
      />

      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Xóa nội dung tìm kiếm"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blush text-sm leading-none text-moss-dark transition-colors hover:bg-moss hover:text-white"
        >
          ×
        </button>
      )}
    </form>
  );
}
