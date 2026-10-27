"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPasswordSchema } from "../../../lib/validation/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Có lỗi xảy ra, vui lòng thử lại");
        return;
      }
      setSent(true);
    } catch {
      setError("Không kết nối được máy chủ, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-14 sm:py-20">
      <div className="relative rounded-3xl bg-blush pb-6">
        {/* Nắp phong thư */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 rounded-t-3xl bg-peach/60"
          style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
        />
        {/* Con dấu sáp */}
        <div className="relative z-10 flex justify-center pt-[6rem]">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-moss-dark font-heading text-lg text-white ring-4 ring-blush">
            C
          </div>
        </div>

        {/* Tờ giấy viết thư */}
        <div className="relative z-10 mx-5 mt-4 rounded-md border-l-4 border-moss bg-white px-6 py-7">
          {sent ? (
            <div className="text-center">
              <h1 className="font-heading text-2xl text-ink">
                Thư đã được gửi đi
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">
                Nếu <span className="font-semibold text-ink">{email}</span> đã
                đăng ký, bạn sẽ nhận được thư hướng dẫn đặt lại mật khẩu trong
                ít phút. Liên kết có hiệu lực 30 phút và chỉ dùng được một lần.
              </p>
              <p className="mt-3 text-sm text-ink/60">
                Chưa thấy thư? Hãy kiểm tra cả mục Spam.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-sm font-semibold text-moss-dark underline underline-offset-4"
                >
                  Dùng email khác
                </button>
                <Link
                  href="/login"
                  className="text-sm text-ink/70 hover:text-ink"
                >
                  ← Về trang đăng nhập
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h1 className="font-heading text-2xl text-ink">Quên mật khẩu?</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">
                Nhập email đã đăng ký, Cỏ May sẽ gửi cho bạn một lá thư kèm liên
                kết để đặt mật khẩu mới.
              </p>

              <label
                htmlFor="email"
                className="mt-6 block text-sm font-semibold text-ink"
              >
                Email của bạn
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten@example.com"
                className="mt-1 w-full border-0 border-b-2 border-ink/20 bg-transparent px-0 py-2 text-ink outline-none placeholder:text-ink/30 focus:border-moss"
              />

              {error && (
                <p role="alert" className="mt-3 text-sm text-moss-dark">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-full bg-moss px-6 py-3 font-semibold text-white transition hover:bg-moss-dark disabled:opacity-60"
              >
                {loading ? "Đang gửi..." : "Gửi thư cho tôi"}
              </button>

              <div className="mt-5 text-center">
                <Link
                  href="/login"
                  className="text-sm text-ink/70 hover:text-ink"
                >
                  ← Nhớ ra rồi, về đăng nhập
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
