"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Link "Đơn hàng của tôi" kèm chấm số đơn đang giao
export default function OrdersLink({ className }: { className?: string }) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  // Header nằm trong layout nên không tự tải lại khi chuyển trang,
  // vì vậy gọi lại API mỗi khi đường dẫn thay đổi.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/orders/shipping-count", {
          cache: "no-store",
        });
        const json = await res.json();
        if (!cancelled && res.ok && json.success) {
          setCount(json.data.count);
        }
      } catch {
        // lỗi mạng thì giữ nguyên số cũ, không cần báo khách
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <Link
      href="/orders"
      className={`${className ?? ""} inline-flex items-center gap-2`}
    >
      Đơn hàng của tôi
      {count > 0 && (
        <span
          title={`${count} đơn đang trên đường giao`}
          className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ochre px-1.5 text-[11px] font-bold leading-none text-ink"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
