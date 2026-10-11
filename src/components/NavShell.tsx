"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function NavShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Chuyển trang thì tự đóng menu
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Đóng menu" : "Mở menu"}
        aria-expanded={open}
        aria-controls="main-menu"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors md:hidden ${
          open
            ? "border-moss bg-moss text-white"
            : "border-peach bg-card text-ink hover:bg-blush"
        }`}
      >
        {/* Biểu tượng 3 gạch, khi mở thì thành dấu X */}
        <span aria-hidden className="relative block h-3 w-4">
          <span
            className={`absolute left-0 h-0.5 w-4 rounded-full bg-current transition-all duration-200 ${
              open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 rounded-full bg-current transition-opacity duration-200 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-0 h-0.5 w-4 rounded-full bg-current transition-all duration-200 ${
              open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"
            }`}
          />
        </span>
        {open ? "Đóng" : "Menu"}
      </button>

      <div
        id="main-menu"
        className={`${
          open ? "flex" : "hidden"
        } w-full flex-col items-start gap-1 rounded-2xl border border-peach/40 bg-card p-3 text-sm shadow-warm md:flex md:w-auto md:flex-row md:flex-wrap md:items-center md:gap-1 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
      >
        {children}
      </div>
    </>
  );
}
