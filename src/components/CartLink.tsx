"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "../../lib/cart-context";

export default function CartLink({ className = "" }: { className?: string }) {
  const { totalItems } = useCart();

  // Giỏ đọc từ localStorage nên chỉ hiện số sau khi trang đã chạy ở trình duyệt,
  // tránh lệch giữa HTML server và client
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const hasItems = mounted && totalItems > 0;

  return (
    <Link
      href="/cart"
      className={`inline-flex items-center gap-1.5 ${className}`}
      aria-label={hasItems ? `Giỏ hàng, ${totalItems} sản phẩm` : "Giỏ hàng"}
    >
      {/* Biểu tượng giỏ hàng */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.1L20 8H6.2" />
        <circle cx="9.5" cy="19.5" r="1.2" />
        <circle cx="17" cy="19.5" r="1.2" />
      </svg>
      Giỏ hàng
      {hasItems && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-moss px-1.5 text-[11px] font-semibold leading-none text-white">
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      )}
    </Link>
  );
}
