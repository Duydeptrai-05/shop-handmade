"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type Voucher = {
  id: number;
  code: string;
  description: string | null;
  type: "discount" | "shipping";
  discountKind: "percent" | "fixed";
  value: string | number;
  maxDiscount: string | number | null;
  minOrderValue: string | number;
  startsAt: string | null;
  expiresAt: string | null;
  usageLimit: number | null;
  isActive: boolean;
  usedCount: number;
};

type StatusKey = "running" | "upcoming" | "full" | "expired" | "off";
type FilterKey = "all" | "running" | "upcoming" | "ended" | "off";

const STATUS_META: Record<StatusKey, { label: string; badge: string }> = {
  running: { label: "Đang chạy", badge: "bg-emerald-100 text-emerald-800" },
  upcoming: { label: "Sắp bắt đầu", badge: "bg-ochre/30 text-ink" },
  full: { label: "Hết lượt", badge: "bg-ink/10 text-ink/60" },
  expired: { label: "Hết hạn", badge: "bg-ink/10 text-ink/60" },
  off: { label: "Đã tắt", badge: "bg-ink/10 text-ink/60" },
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "running", label: "Đang chạy" },
  { key: "upcoming", label: "Sắp bắt đầu" },
  { key: "ended", label: "Hết hạn / hết lượt" },
  { key: "off", label: "Đã tắt" },
];

const money = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");

function getStatus(v: Voucher): StatusKey {
  const now = Date.now();
  if (!v.isActive) return "off";
  if (v.expiresAt && now > new Date(v.expiresAt).getTime()) return "expired";
  if (v.startsAt && now < new Date(v.startsAt).getTime()) return "upcoming";
  if (v.usageLimit !== null && v.usedCount >= v.usageLimit) return "full";
  return "running";
}

function matchFilter(status: StatusKey, f: FilterKey) {
  if (f === "all") return true;
  if (f === "ended") return status === "expired" || status === "full";
  return status === f;
}

// Chữ lớn ở cuống vé: 10% hoặc 20K
function stubValue(v: Voucher) {
  const n = Number(v.value);
  if (v.discountKind === "percent") return `${n}%`;
  return n % 1000 === 0 ? `${n / 1000}K` : money(n);
}

// Ngày (yyyy-mm-dd) <-> ISO, theo giờ máy người dùng
function toDateInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const startOfDayISO = (d: string) => new Date(`${d}T00:00:00`).toISOString();
const endOfDayISO = (d: string) => new Date(`${d}T23:59:59`).toISOString();

type FormState = {
  code: string;
  description: string;
  type: "discount" | "shipping";
  discountKind: "percent" | "fixed";
  value: string;
  maxDiscount: string;
  minOrderValue: string;
  startDate: string;
  endDate: string;
  usageLimit: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  code: "",
  description: "",
  type: "discount",
  discountKind: "percent",
  value: "",
  maxDiscount: "",
  minOrderValue: "",
  startDate: "",
  endDate: "",
  usageLimit: "",
  isActive: true,
};

function formFromVoucher(v: Voucher): FormState {
  return {
    code: v.code,
    description: v.description ?? "",
    type: v.type,
    discountKind: v.discountKind,
    value: String(Number(v.value)),
    maxDiscount: v.maxDiscount === null ? "" : String(Number(v.maxDiscount)),
    minOrderValue: Number(v.minOrderValue)
      ? String(Number(v.minOrderValue))
      : "",
    startDate: toDateInput(v.startsAt),
    endDate: toDateInput(v.expiresAt),
    usageLimit: v.usageLimit === null ? "" : String(v.usageLimit),
    isActive: v.isActive,
  };
}

const inputCls =
  "w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-moss disabled:bg-ink/5 disabled:text-ink/50";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/50">{hint}</span>}
    </label>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`rounded-xl border px-3 py-2 text-sm transition disabled:cursor-not-allowed ${
            value === o.value
              ? "border-ink bg-ink text-paper"
              : "border-ink/15 bg-white text-ink hover:border-ink/40"
          } ${disabled && value !== o.value ? "opacity-40" : ""}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(
    null,
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/vouchers");
      const json = await res.json();
      if (!json.success) {
        setLoadError(json.message ?? "Không tải được danh sách voucher");
        return;
      }
      setVouchers(json.data);
      setLoadError("");
    } catch {
      setLoadError("Không kết nối được máy chủ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function flash(text: string, ok = true) {
    setNotice({ text, ok });
    setTimeout(() => setNotice(null), 3000);
  }

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: vouchers.length,
      running: 0,
      upcoming: 0,
      ended: 0,
      off: 0,
    };
    for (const v of vouchers) {
      const s = getStatus(v);
      if (s === "running") c.running++;
      else if (s === "upcoming") c.upcoming++;
      else if (s === "off") c.off++;
      else c.ended++;
    }
    return c;
  }, [vouchers]);

  const shown = vouchers.filter((v) => matchFilter(getStatus(v), filter));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setDrawerOpen(true);
  }

  function openEdit(v: Voucher) {
    setEditing(v);
    setForm(formFromVoucher(v));
    setFormError("");
    setDrawerOpen(true);
  }

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const value = Number(form.value);
    if (!form.value || !(value > 0))
      return setFormError("Nhập mức giảm lớn hơn 0");
    if (form.discountKind === "percent" && value > 100)
      return setFormError("Giảm theo % không được quá 100");
    if (!editing && !form.code.trim()) return setFormError("Nhập mã voucher");
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      return setFormError("Ngày hết hạn phải sau ngày bắt đầu");

    const isPercent = form.discountKind === "percent";
    let url = "/api/admin/vouchers";
    let method = "POST";
    let body: Record<string, unknown>;

    if (editing) {
      url = `/api/admin/vouchers/${editing.id}`;
      method = "PATCH";
      // Khi sửa: ô để trống nghĩa là xóa giá trị đó, nên gửi null
      body = {
        description: form.description.trim(),
        value,
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
        startsAt: form.startDate ? startOfDayISO(form.startDate) : null,
        expiresAt: form.endDate ? endOfDayISO(form.endDate) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        isActive: form.isActive,
        ...(isPercent && {
          maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        }),
      };
    } else {
      // Khi tạo: ô để trống thì không gửi
      body = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        discountKind: form.discountKind,
        value,
        isActive: form.isActive,
        ...(form.description.trim() && {
          description: form.description.trim(),
        }),
        ...(isPercent &&
          form.maxDiscount && { maxDiscount: Number(form.maxDiscount) }),
        ...(form.minOrderValue && {
          minOrderValue: Number(form.minOrderValue),
        }),
        ...(form.startDate && { startsAt: startOfDayISO(form.startDate) }),
        ...(form.endDate && { expiresAt: endOfDayISO(form.endDate) }),
        ...(form.usageLimit && { usageLimit: Number(form.usageLimit) }),
      };
    }

    setSaving(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setFormError(json.message ?? "Không lưu được voucher");
        return;
      }
      setDrawerOpen(false);
      flash(editing ? "Đã cập nhật voucher" : "Đã tạo voucher mới");
      await load();
    } catch {
      setFormError("Không kết nối được máy chủ");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(v: Voucher) {
    if (busyId !== null) return;
    setBusyId(v.id);
    try {
      const res = await fetch(`/api/admin/vouchers/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !v.isActive }),
      });
      const json = await res.json();
      if (!json.success)
        return flash(json.message ?? "Không đổi được trạng thái", false);
      flash(v.isActive ? `Đã tắt ${v.code}` : `Đã bật ${v.code}`);
      await load();
    } catch {
      flash("Không kết nối được máy chủ", false);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(v: Voucher) {
    if (busyId !== null) return;
    if (
      !window.confirm(
        `Xóa voucher ${v.code}? Thao tác này không hoàn tác được.`,
      )
    )
      return;
    setBusyId(v.id);
    try {
      const res = await fetch(`/api/admin/vouchers/${v.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success)
        return flash(json.message ?? "Không xóa được voucher", false);
      flash(`Đã xóa ${v.code}`);
      await load();
    } catch {
      flash("Không kết nối được máy chủ", false);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-ink sm:text-4xl">
            Mã giảm giá
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            {counts.running} đang chạy trên tổng {counts.all} voucher
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-white shadow-warm transition hover:bg-moss-dark"
        >
          + Tạo voucher
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              filter === f.key
                ? "bg-ink text-paper"
                : "bg-white text-ink/70 ring-1 ring-ink/10 hover:text-ink"
            }`}
          >
            {f.label}
            <span
              className={`ml-1.5 text-xs ${filter === f.key ? "text-paper/60" : "text-ink/40"}`}
            >
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-4 rounded-xl px-4 py-2.5 text-sm ${
              notice.ok
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {notice.text}
          </motion.div>
        )}
      </AnimatePresence>

      {loadError && (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {loading && (
          <p className="py-12 text-center text-sm text-ink/50">
            Đang tải voucher...
          </p>
        )}

        {!loading && !loadError && shown.length === 0 && (
          <p className="rounded-2xl border border-dashed border-ink/20 py-14 text-center text-sm text-ink/50">
            {vouchers.length === 0
              ? 'Chưa có voucher nào. Bấm "Tạo voucher" để thêm.'
              : "Không có voucher nào ở mục này."}
          </p>
        )}

        {shown.map((v) => {
          const status = getStatus(v);
          const meta = STATUS_META[status];
          const live = status === "running";
          const pct =
            v.usageLimit !== null && v.usageLimit > 0
              ? Math.min(100, Math.round((v.usedCount / v.usageLimit) * 100))
              : 0;
          const busy = busyId === v.id;

          return (
            <motion.article
              key={v.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative flex overflow-hidden rounded-2xl bg-white shadow-warm"
            >
              {/* Cuống vé */}
              <div
                className={`flex w-32 shrink-0 flex-col items-center justify-center px-2 py-5 text-center ${
                  live ? "bg-ink text-paper" : "bg-ink/10 text-ink/40"
                }`}
              >
                <span className="font-heading text-3xl leading-none">
                  {stubValue(v)}
                </span>
                <span className="mt-2 text-[11px] leading-tight opacity-80">
                  {v.type === "discount" ? "Giảm tiền hàng" : "Giảm phí ship"}
                </span>
              </div>

              {/* Khuyết tròn ở đường xé */}
              <span className="absolute -top-3 left-[116px] h-6 w-6 rounded-full bg-paper" />
              <span className="absolute -bottom-3 left-[116px] h-6 w-6 rounded-full bg-paper" />

              {/* Thân vé */}
              <div className="flex min-w-0 flex-1 flex-col gap-3 border-l-2 border-dashed border-ink/15 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-mono text-lg font-bold tracking-wider text-ink">
                      {v.code}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  {v.description && (
                    <p className="mt-1 text-sm text-ink/70">{v.description}</p>
                  )}
                  <p className="mt-2 text-xs text-ink/55">
                    {Number(v.minOrderValue) > 0
                      ? `Đơn từ ${money(Number(v.minOrderValue))}`
                      : "Mọi đơn hàng"}
                    {v.maxDiscount !== null &&
                      ` · Giảm tối đa ${money(Number(v.maxDiscount))}`}
                    {v.discountKind === "fixed" &&
                      ` · Giảm ${money(Number(v.value))}`}
                    {v.startsAt && ` · Từ ${fmtDate(v.startsAt)}`}
                    {v.expiresAt
                      ? ` · HSD ${fmtDate(v.expiresAt)}`
                      : " · Không hạn"}
                  </p>

                  <div className="mt-3 max-w-xs">
                    <div className="flex justify-between text-xs text-ink/60">
                      <span>
                        Đã dùng {v.usedCount}
                        {v.usageLimit !== null
                          ? ` / ${v.usageLimit}`
                          : " (không giới hạn)"}
                      </span>
                      {v.usageLimit !== null && <span>{pct}%</span>}
                    </div>
                    {v.usageLimit !== null && (
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
                        <div
                          className={`h-full rounded-full ${pct >= 100 ? "bg-ink/40" : "bg-moss"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2 sm:flex-col">
                  <button
                    onClick={() => openEdit(v)}
                    disabled={busy}
                    className="rounded-full border border-ink/20 px-4 py-1.5 text-sm text-ink transition hover:border-ink disabled:opacity-50"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => toggle(v)}
                    disabled={busy}
                    className="rounded-full border border-ink/20 px-4 py-1.5 text-sm text-ink transition hover:border-ink disabled:opacity-50"
                  >
                    {v.isActive ? "Tắt" : "Bật"}
                  </button>
                  <button
                    onClick={() => remove(v)}
                    disabled={busy}
                    className="rounded-full px-4 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Ngăn kéo tạo / sửa */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[70] bg-ink/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setDrawerOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-paper shadow-warm-lg"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
            >
              <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
                <h2 className="font-heading text-xl text-ink">
                  {editing ? `Sửa ${editing.code}` : "Tạo voucher mới"}
                </h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-full px-3 py-1 text-sm text-ink/60 hover:bg-ink/5"
                >
                  Đóng
                </button>
              </div>

              <form
                onSubmit={submit}
                className="flex-1 space-y-5 overflow-y-auto px-6 py-5"
              >
                {editing ? (
                  <p className="rounded-xl bg-blush px-3 py-2 text-xs text-ink/70">
                    Mã, loại voucher và kiểu giảm không đổi được sau khi tạo.
                    Muốn đổi thì tạo voucher mới.
                  </p>
                ) : (
                  <Field
                    label="Mã voucher"
                    hint="Tự động viết hoa. Khách sẽ nhập đúng mã này ở bước thanh toán."
                  >
                    <input
                      className={`${inputCls} font-mono uppercase tracking-wider`}
                      value={form.code}
                      onChange={(e) =>
                        set("code", e.target.value.toUpperCase())
                      }
                      placeholder="VD: GIAM10"
                    />
                  </Field>
                )}

                <Field label="Loại voucher">
                  <Segmented
                    value={form.type}
                    disabled={!!editing}
                    onChange={(t) => set("type", t)}
                    options={[
                      { value: "discount", label: "Giảm tiền hàng" },
                      { value: "shipping", label: "Giảm phí ship" },
                    ]}
                  />
                </Field>

                <Field label="Kiểu giảm">
                  <Segmented
                    value={form.discountKind}
                    disabled={!!editing}
                    onChange={(k) => set("discountKind", k)}
                    options={[
                      { value: "percent", label: "Theo %" },
                      { value: "fixed", label: "Số tiền cố định" },
                    ]}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label={
                      form.discountKind === "percent"
                        ? "Mức giảm (%)"
                        : "Mức giảm (đ)"
                    }
                    hint={
                      form.type === "shipping" &&
                      form.discountKind === "percent"
                        ? "Nhập 100 để miễn phí ship"
                        : undefined
                    }
                  >
                    <input
                      type="number"
                      min={1}
                      className={inputCls}
                      value={form.value}
                      onChange={(e) => set("value", e.target.value)}
                    />
                  </Field>
                  {form.discountKind === "percent" && (
                    <Field
                      label="Giảm tối đa (đ)"
                      hint="Để trống nếu không giới hạn"
                    >
                      <input
                        type="number"
                        min={0}
                        className={inputCls}
                        value={form.maxDiscount}
                        onChange={(e) => set("maxDiscount", e.target.value)}
                      />
                    </Field>
                  )}
                </div>

                <Field
                  label="Đơn tối thiểu (đ)"
                  hint="Để trống nếu áp dụng cho mọi đơn"
                >
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={form.minOrderValue}
                    onChange={(e) => set("minOrderValue", e.target.value)}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Bắt đầu từ ngày">
                    <input
                      type="date"
                      className={inputCls}
                      value={form.startDate}
                      onChange={(e) => set("startDate", e.target.value)}
                    />
                  </Field>
                  <Field label="Hết hạn hết ngày">
                    <input
                      type="date"
                      className={inputCls}
                      value={form.endDate}
                      onChange={(e) => set("endDate", e.target.value)}
                    />
                  </Field>
                </div>

                <Field
                  label="Số lượt dùng tối đa"
                  hint={
                    editing && editing.usedCount > 0
                      ? `Đã dùng ${editing.usedCount} lượt, không đặt nhỏ hơn số này. Để trống nếu không giới hạn.`
                      : "Để trống nếu không giới hạn"
                  }
                >
                  <input
                    type="number"
                    min={1}
                    className={inputCls}
                    value={form.usageLimit}
                    onChange={(e) => set("usageLimit", e.target.value)}
                  />
                </Field>

                <Field label="Mô tả (hiện cho khách)">
                  <input
                    className={inputCls}
                    maxLength={255}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="VD: Giảm 10% cho đơn từ 150.000đ"
                  />
                </Field>

                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => set("isActive", e.target.checked)}
                    className="h-4 w-4 accent-[#f4604f]"
                  />
                  Bật voucher ngay
                </label>

                {formError && (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-full bg-moss py-3 text-sm font-semibold text-white transition hover:bg-moss-dark disabled:opacity-60"
                >
                  {saving
                    ? "Đang lưu..."
                    : editing
                      ? "Lưu thay đổi"
                      : "Tạo voucher"}
                </button>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
