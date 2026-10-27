"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPasswordSchema } from "../../../lib/validation/auth";

function Chip({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
        ok ? "bg-moss text-white" : "bg-ink/10 text-ink/50"
      }`}
    >
      <span aria-hidden>{ok ? "✓" : "○"}</span>
      {children}
    </span>
  );
}

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [linkBad, setLinkBad] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const longEnough = password.length >= 6;
  const matches = password.length > 0 && password === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLinkBad(false);

    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (password !== confirm) {
      setError("Hai lần nhập mật khẩu chưa giống nhau");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Có lỗi xảy ra, vui lòng thử lại");
        if (res.status === 400 && String(json.message).startsWith("Liên kết")) {
          setLinkBad(true);
        }
        return;
      }
      setDone(true);
    } catch {
      setError("Không kết nối được máy chủ, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }

  const state = !token ? "no-token" : done ? "done" : "form";

  const title =
    state === "no-token"
      ? "Liên kết chưa đúng"
      : state === "done"
        ? "Xong rồi"
        : "Đặt mật khẩu mới";

  const sub =
    state === "no-token"
      ? "Đường dẫn này thiếu mã đặt lại mật khẩu. Hãy mở đúng liên kết trong thư, hoặc xin một liên kết mới."
      : state === "done"
        ? "Mật khẩu mới đã có hiệu lực, bạn đăng nhập được ngay bây giờ."
        : "Chọn một mật khẩu bạn nhớ được. Liên kết trong thư chỉ dùng được một lần.";

  const inputClass =
    "mt-1.5 w-full rounded-xl bg-blush px-4 py-3.5 text-ink outline-none placeholder:text-ink/30 focus:ring-2 focus:ring-moss";
  const buttonClass =
    "inline-block rounded-full bg-moss px-8 py-3.5 font-semibold text-white transition hover:bg-moss-dark disabled:opacity-60";

  return (
    <main className="relative overflow-hidden">
      {/* Vòng tròn màu làm nền */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-28 -top-28 h-96 w-96 rounded-full bg-blush"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 right-10 h-56 w-56 rounded-full bg-peach/40"
      />

      <div className="relative z-10 mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 sm:py-24 md:grid-cols-2 md:gap-16">
        {/* Cột chữ lớn */}
        <div>
          <h1 className="font-heading text-5xl leading-[1.05] text-ink sm:text-6xl">
            {title}
            <span className="text-moss">.</span>
          </h1>
          <p className="mt-5 max-w-sm text-lg leading-relaxed text-ink/70">
            {sub}
          </p>
        </div>

        {/* Cột thao tác */}
        <div>
          {state === "form" && (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-ink"
                >
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass + " pr-16"}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-moss-dark"
                  >
                    {show ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm"
                  className="text-sm font-semibold text-ink"
                >
                  Nhập lại mật khẩu
                </label>
                <input
                  id="confirm"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Chip ok={longEnough}>Từ 6 ký tự</Chip>
                <Chip ok={matches}>Hai ô giống nhau</Chip>
              </div>

              {error && (
                <div role="alert" className="text-sm text-moss-dark">
                  <p>{error}</p>
                  {linkBad && (
                    <Link
                      href="/forgot-password"
                      className="mt-1 inline-block font-semibold underline"
                    >
                      Xin liên kết mới
                    </Link>
                  )}
                </div>
              )}

              <button type="submit" disabled={loading} className={buttonClass}>
                {loading ? "Đang lưu..." : "Lưu mật khẩu mới"}
              </button>
            </form>
          )}

          {state === "no-token" && (
            <div>
              <div className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-blush font-heading text-4xl text-moss-dark">
                !
              </div>
              <Link href="/forgot-password" className={buttonClass}>
                Xin liên kết mới
              </Link>
            </div>
          )}

          {state === "done" && (
            <div>
              <div className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-moss text-4xl text-white">
                ✓
              </div>
              <Link href="/login" className={buttonClass}>
                Đến trang đăng nhập
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
