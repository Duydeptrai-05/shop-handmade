"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatVND } from "../../../lib/format";

// Voucher đang dùng được, lấy từ /api/vouchers
type VoucherItem = {
  id: number;
  code: string;
  description: string | null;
  type: "discount" | "shipping";
  discountKind: "percent" | "fixed";
  value: number;
  maxDiscount: number | null;
  minOrderValue: number;
  expiresAt: string | null;
  remaining: number | null;
  soldOut: boolean;
  usedByMe: boolean;
};

type Tab = "all" | "discount" | "shipping";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "discount", label: "Giảm tiền hàng" },
  { key: "shipping", label: "Giảm phí ship" },
];

// Chữ số lớn trên thẻ
function badge(v: VoucherItem) {
  if (v.discountKind === "percent") {
    return v.type === "shipping" && v.value >= 100 ? "FREESHIP" : `${v.value}%`;
  }
  return v.value % 1000 === 0 ? `${v.value / 1000}K` : formatVND(v.value);
}

// Số ngày còn lại đến hạn (làm tròn lên), không có hạn thì trả null
function daysLeft(expiresAt: string | null) {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

function VoucherCard({
  v,
  copied,
  onCopy,
}: {
  v: VoucherItem;
  copied: boolean;
  onCopy: (code: string) => void;
}) {
  const dead = v.usedByMe || v.soldOut;
  const reason = v.usedByMe
    ? "Bạn đã dùng mã này"
    : v.soldOut
      ? "Đã hết lượt sử dụng"
      : null;
  const left = daysLeft(v.expiresAt);
  const soon = left !== null && left <= 3 && !dead;
  const isShip = v.type === "shipping";

  const lines: string[] = [
    v.minOrderValue > 0
      ? `Áp dụng cho đơn từ ${formatVND(v.minOrderValue)}`
      : "Áp dụng cho mọi đơn hàng",
    v.expiresAt
      ? `Dùng đến ${new Date(v.expiresAt).toLocaleDateString("vi-VN")}`
      : "Không giới hạn thời gian",
    "Mỗi tài khoản dùng một lần",
  ];
  if (v.remaining !== null) lines.push(`Còn ${v.remaining} lượt`);

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white ${
        dead ? "opacity-60" : "shadow-warm"
      }`}
    >
      {/* Phần trên: loại voucher và con số lớn */}
      <div
        className={`px-6 pb-7 pt-6 text-white ${
          dead ? "bg-ink/30" : isShip ? "bg-ink" : "bg-moss"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
            {isShip ? "Giảm phí ship" : "Giảm tiền hàng"}
          </span>
          {soon && (
            <span className="rounded-full bg-ochre px-2.5 py-0.5 text-[11px] font-semibold text-ink">
              Sắp hết hạn
            </span>
          )}
        </div>
        <p className="mt-3 font-heading text-6xl font-semibold leading-none">
          {badge(v)}
        </p>
        {v.discountKind === "percent" && v.maxDiscount !== null && (
          <p className="mt-2 text-sm opacity-80">
            Giảm tối đa {formatVND(v.maxDiscount)}
          </p>
        )}
      </div>

      {/* Đường xé vé */}
      <div className="relative" aria-hidden>
        <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-paper" />
        <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-paper" />
        <div className="mx-6 border-t-2 border-dashed border-ink/15" />
      </div>

      {/* Phần dưới: mã, mô tả, điều kiện, nút */}
      <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
        <p className="font-mono text-lg font-semibold tracking-widest">
          {v.code}
        </p>
        {v.description && (
          <p className="mt-1 text-sm text-ink/70">{v.description}</p>
        )}
        <ul className="mt-3 space-y-1 text-sm text-ink/60">
          {lines.map((l) => (
            <li key={l}>• {l}</li>
          ))}
        </ul>

        <div className="mt-auto pt-5">
          {dead ? (
            <p className="text-sm font-medium text-red-700">{reason}</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => onCopy(v.code)}
                className="rounded-xl border-2 border-dashed border-moss px-4 py-2.5 text-sm font-semibold text-moss-dark transition hover:bg-blush"
              >
                {copied ? "Đã chép mã" : "Sao chép mã"}
              </button>
              <Link
                href="/products"
                className="rounded-xl bg-moss px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-moss-dark"
              >
                Mua sắm ngay
              </Link>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function VouchersPage() {
  const [list, setList] = useState<VoucherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [needLogin, setNeedLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/vouchers");
      if (res.status === 401) {
        setNeedLogin(true);
        return;
      }
      const json = await res.json();
      if (res.ok && json.success) {
        setList(json.data as VoucherItem[]);
        setNeedLogin(false);
        setError(null);
      } else {
        setError(json.message ?? "Không tải được danh sách voucher");
      }
    } catch {
      setError("Không kết nối được máy chủ, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }, []);

  // Tải khi mở trang và tải lại khi khách quay lại tab,
  // nên Admin vừa tạo voucher mới thì khách chỉ cần quay lại trang là thấy
  useEffect(() => {
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [load]);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1800);
    } catch {
      // Trình duyệt không cho sao chép thì bỏ qua, khách tự chép tay được
    }
  }

  const usable = list.filter((v) => !v.usedByMe && !v.soldOut).length;
  const countOf = (t: Tab) =>
    t === "all" ? list.length : list.filter((v) => v.type === t).length;
  // Voucher dùng được xếp trước, mã đã dùng hoặc hết lượt xuống cuối
  const shown = list
    .filter((v) => tab === "all" || v.type === tab)
    .sort(
      (a, b) =>
        Number(a.usedByMe || a.soldOut) - Number(b.usedByMe || b.soldOut),
    );

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-moss-dark">
            Kho voucher
          </p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
            Mã giảm giá dành cho bạn
          </h1>
          <p className="mt-2 max-w-xl text-ink/65">
            Voucher mới của shop sẽ tự xuất hiện ở đây. Bạn chọn mã ở bước thanh
            toán để được giảm.
          </p>
        </div>
        {!loading && !needLogin && !error && (
          <div className="rounded-2xl bg-blush px-6 py-4 text-center">
            <p className="font-heading text-5xl font-semibold leading-none text-moss-dark">
              {usable}
            </p>
            <p className="mt-1 text-xs text-ink/60">voucher dùng được</p>
          </div>
        )}
      </header>

      {needLogin ? (
        <div className="mt-12 rounded-2xl bg-blush px-6 py-10 text-center">
          <p className="text-lg font-semibold">
            Đăng nhập để xem voucher của bạn
          </p>
          <p className="mt-2 text-ink/65">
            Mỗi tài khoản có lượt dùng riêng nên bạn cần đăng nhập trước nhé.
          </p>
          <Link
            href="/login?next=/vouchers"
            className="mt-6 inline-block rounded-xl bg-moss px-7 py-3.5 font-semibold text-white transition hover:bg-moss-dark"
          >
            Đăng nhập
          </Link>
        </div>
      ) : (
        <>
          <div role="tablist" className="mt-8 flex flex-wrap gap-2">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-ink text-paper"
                      : "border border-ink/15 text-ink/70 hover:border-peach hover:text-ink"
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 tabular-nums opacity-60">
                    {countOf(t.key)}
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <div
              role="alert"
              className="mt-8 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-2xl bg-ink/5"
                />
              ))}
            </div>
          ) : shown.length === 0 && !error ? (
            <div className="mt-8 rounded-2xl border border-dashed border-ink/20 px-6 py-12 text-center">
              <p className="font-semibold">Hiện chưa có voucher nào</p>
              <p className="mt-1 text-sm text-ink/60">
                Shop sẽ cập nhật sớm, bạn quay lại sau nhé.
              </p>
              <Link
                href="/products"
                className="mt-5 inline-block text-sm font-medium text-moss-dark underline underline-offset-4"
              >
                Xem sản phẩm
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {shown.map((v) => (
                <VoucherCard
                  key={v.id}
                  v={v}
                  copied={copied === v.code}
                  onCopy={copy}
                />
              ))}
            </div>
          )}

          <p className="mt-10 text-sm leading-relaxed text-ink/55">
            Cách dùng: thêm sản phẩm vào giỏ, sang trang thanh toán, ở bước 3
            &quot;Mã giảm giá&quot; bấm chọn voucher (hoặc nhập mã). Mỗi đơn
            dùng được 1 mã giảm tiền hàng và 1 mã giảm phí ship cùng lúc.
          </p>
        </>
      )}
    </main>
  );
}
