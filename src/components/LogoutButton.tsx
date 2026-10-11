"use client";

import { useState } from "react";

export default function LogoutButton({
  redirectTo = "/",
  className = "",
}: {
  redirectTo?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // bỏ qua: dù lỗi mạng vẫn chuyển trang, trang đích sẽ tự kiểm tra lại phiên
    }
    // Tải lại toàn trang để mọi trạng thái đăng nhập được làm mới
    window.location.href = redirectTo;
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={className + " disabled:opacity-50"}
    >
      {loading ? "Đang thoát..." : "Đăng xuất"}
    </button>
  );
}
