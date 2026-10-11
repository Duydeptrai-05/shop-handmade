"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import CartLink from "./CartLink";

// Các link dành cho khách chưa đăng nhập.
// Ẩn hoàn toàn trên các trang /admin (Admin không có đăng ký, không dùng giỏ hàng).
export default function GuestNav({
  linkClass,
  menu,
}: {
  linkClass: string;
  menu?: ReactNode; // Menu "Sản phẩm" do Header truyền vào
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <Link href="/" className={linkClass}>
        Trang chủ
      </Link>
      {menu}
      <CartLink className={linkClass} />
      <Link href="/login" className={linkClass}>
        Đăng nhập
      </Link>
      <Link
        href="/register"
        className="rounded-lg bg-ink px-3 py-1.5 text-paper hover:opacity-90"
      >
        Đăng ký
      </Link>
    </>
  );
}
