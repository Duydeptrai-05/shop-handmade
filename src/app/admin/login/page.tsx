"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const fieldClass =
  "w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-ink placeholder:text-ink/35 " +
  "transition focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 " +
  "[&:-webkit-autofill]:[-webkit-text-fill-color:#33202a] " +
  "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#fff7f3]";

// Chiếc cúc áo 4 lỗ, màu lấy từ currentColor
function ButtonShape({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <circle cx="50" cy="50" r="48" fill="currentColor" />
      <circle
        cx="50"
        cy="50"
        r="36"
        fill="none"
        stroke="#33202a"
        strokeOpacity="0.1"
        strokeWidth="3"
      />
      <g fill="#33202a" fillOpacity="0.25">
        <circle cx="40" cy="40" r="5" />
        <circle cx="60" cy="40" r="5" />
        <circle cx="40" cy="60" r="5" />
        <circle cx="60" cy="60" r="5" />
      </g>
      <g
        stroke="#33202a"
        strokeOpacity="0.3"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <line x1="40" y1="40" x2="60" y2="60" />
        <line x1="60" y1="40" x2="40" y2="60" />
      </g>
    </svg>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Chỉ chấp nhận quay lại các trang thuộc khu /admin, còn lại về trang tổng quan
  const rawNext = searchParams.get("next");
  const next =
    rawNext && rawNext.startsWith("/admin") && !rawNext.startsWith("//")
      ? rawNext
      : "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message);
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Không thể kết nối tới server, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }

  return (
    // Phủ kín màn hình để che Header/Footer của khu khách
    <div className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-paper text-ink">
      <style>{`
        @keyframes admin-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .admin-bob { animation: admin-bob 7s ease-in-out infinite; }
        }
      `}</style>

      {/* Cúc áo trang trí, màu nhạt để không tranh với form */}
      <ButtonShape className="admin-bob pointer-events-none absolute -left-16 -top-16 h-56 w-56 text-blush sm:h-72 sm:w-72" />
      <ButtonShape className="admin-bob pointer-events-none absolute -bottom-20 -right-12 h-64 w-64 text-peach/60 sm:h-80 sm:w-80" />
      <ButtonShape className="admin-bob pointer-events-none absolute bottom-16 left-[12%] hidden h-14 w-14 text-ochre/70 md:block" />

      <div className="relative flex min-h-full flex-col items-center justify-center px-5 py-10">
        <div className="relative w-full max-w-md">
          {/* Nhãn vàng nghiêng đè lên mép trên thẻ */}
          <span className="absolute -top-4 right-6 z-10 rotate-3 bg-ochre px-4 py-1.5 text-sm font-semibold tracking-wide text-ink shadow-warm">
            Chỉ dành cho quản trị
          </span>

          <div className="overflow-hidden rounded-3xl bg-card shadow-warm-lg">
            {/* Đầu thẻ màu mận */}
            <div className="relative bg-ink px-8 pb-8 pt-9 text-paper sm:px-10">
              {/* Đường chỉ khâu dọc theo mép dưới */}
              <div className="pointer-events-none absolute inset-x-4 bottom-3 border-t-2 border-dashed border-paper/25" />

              <div className="flex items-center gap-3">
                <span className="font-heading flex h-10 w-10 items-center justify-center rounded-full bg-moss text-lg font-semibold text-white">
                  C
                </span>
                <span className="text-xs font-medium tracking-[0.2em] text-paper/70">
                  CỎ MAY · HANDMADE
                </span>
              </div>
              <h1 className="font-heading mt-6 text-4xl font-semibold leading-tight">
                Khu vực quản trị
              </h1>
              <p className="mt-2 text-sm text-paper/65">
                Đăng nhập để quản lý đơn hàng và sản phẩm của shop.
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-5 px-8 pb-8 pt-7 sm:px-10 sm:pb-10"
            >
              <div>
                <label
                  htmlFor="username"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Tên đăng nhập
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className={fieldClass}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={`${fieldClass} pr-16`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 px-4 text-sm font-medium text-moss-dark transition-colors hover:text-ink"
                  >
                    {showPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border-l-4 border-moss-dark bg-blush px-4 py-3 text-sm text-moss-dark"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 rounded-full bg-moss py-3.5 font-semibold text-white shadow-warm transition hover:bg-moss-dark disabled:opacity-50"
              >
                {loading ? "Đang xử lý..." : "Vào trang quản trị"}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-ink/60 underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              ← Về cửa hàng
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-paper text-ink/60">
          Đang tải...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
