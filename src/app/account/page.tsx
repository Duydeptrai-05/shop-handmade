"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addressSchema } from "../../../lib/validation/address";

type Profile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
};
type Address = {
  id: number;
  recipientName: string;
  phone: string;
  address: string;
  isDefault: boolean;
};
type Tab = "profile" | "addresses" | "password";
type Notify = (text: string, type?: "ok" | "error") => void;

const PHONE_REGEX = /^(0|\+84)\d{9,10}$/;

const inputClass =
  "w-full rounded-xl bg-white px-4 py-3 text-ink outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-moss";
const primaryBtn =
  "rounded-full bg-moss px-6 py-3 font-medium text-white transition hover:bg-moss-dark disabled:opacity-50";
const ghostBtn =
  "rounded-full px-5 py-3 font-medium text-ink/70 transition hover:bg-ink/5";

// Gọi API, luôn trả về { ok, status, data, message } để phía giao diện xử lý đồng nhất
async function api<T>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<{ ok: boolean; status: number; data?: T; message?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.success) {
      return { ok: true, status: res.status, data: json.data as T };
    }
    return {
      ok: false,
      status: res.status,
      message: json?.message ?? "Có lỗi xảy ra, vui lòng thử lại",
    };
  } catch {
    return { ok: false, status: 0, message: "Không kết nối được máy chủ" };
  }
}

export default function AccountPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{
    text: string;
    type: "ok" | "error";
  } | null>(null);

  const notify: Notify = useCallback((text, type = "ok") => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 3000);
  }, []);

  const loadAddresses = useCallback(async () => {
    const res = await api<Address[]>("/api/account/addresses");
    if (res.ok && res.data) setAddresses(res.data);
  }, []);

  useEffect(() => {
    (async () => {
      const [p, a] = await Promise.all([
        api<Profile>("/api/account/profile"),
        api<Address[]>("/api/account/addresses"),
      ]);
      if (p.status === 401) {
        router.replace("/login?next=/account");
        return;
      }
      if (p.ok && p.data) setProfile(p.data);
      if (a.ok && a.data) setAddresses(a.data);
      setLoading(false);
    })();
  }, [router]);

  if (loading || !profile) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-ink/60">
        Đang tải tài khoản...
      </main>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "profile", label: "Hồ sơ" },
    { key: "addresses", label: `Sổ địa chỉ (${addresses.length})` },
    { key: "password", label: "Mật khẩu" },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      {/* Dải hồ sơ */}
      <div className="flex items-center gap-5">
        <div className="font-heading flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-moss text-4xl text-white">
          {profile.name.trim().charAt(0).toUpperCase() || "C"}
        </div>
        <div className="min-w-0">
          <h1 className="font-heading truncate text-3xl text-ink">
            {profile.name}
          </h1>
          <p className="truncate text-sm text-ink/60">{profile.email}</p>
        </div>
      </div>

      {/* Tab dạng viên thuốc */}
      <div className="mt-8 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "bg-ink text-paper"
                : "bg-blush text-ink hover:bg-peach/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="mt-6 rounded-2xl bg-blush/60 p-6 sm:p-8">
        {tab === "profile" && (
          <ProfileForm profile={profile} onSaved={setProfile} notify={notify} />
        )}
        {tab === "addresses" && (
          <AddressSection
            profile={profile}
            addresses={addresses}
            onChanged={loadAddresses}
            notify={notify}
          />
        )}
        {tab === "password" && <PasswordForm notify={notify} />}
      </section>

      {notice && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-3 text-sm text-white shadow-lg ${
            notice.type === "ok" ? "bg-ink" : "bg-moss-dark"
          }`}
        >
          {notice.text}
        </div>
      )}
    </main>
  );
}

/* ---------------------------- Hồ sơ ---------------------------- */

function ProfileForm({
  profile,
  onSaved,
  notify,
}: {
  profile: Profile;
  onSaved: (p: Profile) => void;
  notify: Notify;
}) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Vui lòng nhập họ tên");
    if (phone.trim() && !PHONE_REGEX.test(phone.trim())) {
      return setError("Số điện thoại không hợp lệ");
    }

    setSaving(true);
    const res = await api<Profile>("/api/account/profile", "PATCH", {
      name,
      phone,
    });
    setSaving(false);
    if (!res.ok || !res.data) return setError(res.message ?? "");

    onSaved(res.data);
    notify("Đã lưu hồ sơ");
    router.refresh(); // cập nhật tên hiển thị trên Header
  }

  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">
          Họ tên
        </span>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">
          Số điện thoại
        </span>
        <input
          className={inputClass}
          value={phone}
          inputMode="tel"
          placeholder="Ví dụ 0912345678"
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
        <input
          className={`${inputClass} cursor-not-allowed opacity-60`}
          value={profile.email}
          disabled
        />
        <span className="mt-1.5 block text-xs text-ink/60">
          Email dùng để đăng nhập nên không đổi được.
        </span>
      </label>

      {error && (
        <p className="text-sm font-medium text-moss-dark sm:col-span-2">
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button type="submit" disabled={saving} className={primaryBtn}>
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  );
}

/* ------------------------- Sổ địa chỉ ------------------------- */

function AddressSection({
  profile,
  addresses,
  onChanged,
  notify,
}: {
  profile: Profile;
  addresses: Address[];
  onChanged: () => Promise<void>;
  notify: Notify;
}) {
  // null = đóng form, "new" = thêm mới, Address = đang sửa địa chỉ đó
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function openNew() {
    setRecipientName(profile.name);
    setPhone(profile.phone ?? "");
    setAddress("");
    setIsDefault(false);
    setError("");
    setEditing("new");
  }

  function openEdit(a: Address) {
    setRecipientName(a.recipientName);
    setPhone(a.phone);
    setAddress(a.address);
    setIsDefault(a.isDefault);
    setError("");
    setEditing(a);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = addressSchema.safeParse({
      recipientName,
      phone,
      address,
      isDefault,
    });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    if (!editing) return;

    setSaving(true);
    const res =
      editing === "new"
        ? await api("/api/account/addresses", "POST", parsed.data)
        : await api(`/api/account/addresses/${editing.id}`, "PATCH", {
            ...parsed.data,
            // chỉ gửi khi tick, vì API không cho bỏ mặc định trực tiếp
            isDefault: parsed.data.isDefault ? true : undefined,
          });
    setSaving(false);
    if (!res.ok) return setError(res.message ?? "");

    await onChanged();
    notify(editing === "new" ? "Đã thêm địa chỉ" : "Đã cập nhật địa chỉ");
    setEditing(null);
  }

  async function setDefault(a: Address) {
    const res = await api(`/api/account/addresses/${a.id}`, "PATCH", {
      isDefault: true,
    });
    if (!res.ok) return notify(res.message ?? "Có lỗi xảy ra", "error");
    await onChanged();
    notify("Đã đặt làm địa chỉ mặc định");
  }

  async function remove(a: Address) {
    if (!confirm("Xóa địa chỉ này?")) return;
    const res = await api(`/api/account/addresses/${a.id}`, "DELETE");
    if (!res.ok) return notify(res.message ?? "Có lỗi xảy ra", "error");
    await onChanged();
    notify("Đã xóa địa chỉ");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/70">
          Lưu sẵn địa chỉ nhận hàng để chọn nhanh khi thanh toán (tối đa 10 địa
          chỉ).
        </p>
        {editing === null && (
          <button type="button" onClick={openNew} className={primaryBtn}>
            + Thêm địa chỉ
          </button>
        )}
      </div>

      {editing !== null && (
        <form
          onSubmit={submit}
          className="mt-5 grid gap-4 rounded-2xl bg-white p-5 sm:grid-cols-2"
        >
          <h2 className="font-heading text-xl text-ink sm:col-span-2">
            {editing === "new" ? "Địa chỉ mới" : "Sửa địa chỉ"}
          </h2>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              Người nhận
            </span>
            <input
              className={inputClass}
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              Số điện thoại
            </span>
            <input
              className={inputClass}
              value={phone}
              inputMode="tel"
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              Địa chỉ (số nhà, đường, phường/xã, tỉnh/thành)
            </span>
            <textarea
              className={`${inputClass} min-h-24 resize-y`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
            <input
              type="checkbox"
              checked={isDefault}
              disabled={editing !== "new" && editing.isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 accent-[#f4604f]"
            />
            Đặt làm địa chỉ mặc định
          </label>

          {error && (
            <p className="text-sm font-medium text-moss-dark sm:col-span-2">
              {error}
            </p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={saving} className={primaryBtn}>
              {saving ? "Đang lưu..." : "Lưu địa chỉ"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className={ghostBtn}
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {addresses.length === 0 && editing === null ? (
        <p className="mt-8 text-center text-ink/60">
          Bạn chưa lưu địa chỉ nào. Thêm một địa chỉ để đặt hàng nhanh hơn.
        </p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li
              key={a.id}
              className={`flex flex-col rounded-2xl p-5 ${
                a.isDefault ? "bg-ink text-paper" : "bg-white text-ink"
              }`}
            >
              {a.isDefault && (
                <span className="mb-3 inline-block self-start rounded-full bg-ochre px-3 py-0.5 text-xs font-semibold text-ink">
                  Mặc định
                </span>
              )}
              <p className="font-heading text-lg">{a.recipientName}</p>
              <p
                className={`text-sm ${a.isDefault ? "text-paper/70" : "text-ink/60"}`}
              >
                {a.phone}
              </p>
              <p className="mt-2 flex-1 text-sm leading-relaxed">{a.address}</p>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => openEdit(a)}
                  className="underline-offset-4 hover:underline"
                >
                  Sửa
                </button>
                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={() => setDefault(a)}
                    className="text-moss-dark underline-offset-4 hover:underline"
                  >
                    Đặt mặc định
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(a)}
                  className={`underline-offset-4 hover:underline ${
                    a.isDefault ? "text-peach" : "text-moss-dark"
                  }`}
                >
                  Xóa
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* --------------------------- Mật khẩu --------------------------- */

function PasswordForm({ notify }: { notify: Notify }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!current) return setError("Vui lòng nhập mật khẩu hiện tại");
    if (next.length < 6)
      return setError("Mật khẩu mới phải có ít nhất 6 ký tự");
    if (next !== confirm) return setError("Nhập lại mật khẩu mới chưa khớp");

    setSaving(true);
    const res = await api("/api/account/password", "POST", {
      currentPassword: current,
      newPassword: next,
    });
    setSaving(false);
    if (!res.ok) return setError(res.message ?? "");

    setCurrent("");
    setNext("");
    setConfirm("");
    notify("Đã đổi mật khẩu");
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-5">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">
          Mật khẩu hiện tại
        </span>
        <input
          type="password"
          autoComplete="current-password"
          className={inputClass}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">
          Mật khẩu mới
        </span>
        <input
          type="password"
          autoComplete="new-password"
          className={inputClass}
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">
          Nhập lại mật khẩu mới
        </span>
        <input
          type="password"
          autoComplete="new-password"
          className={inputClass}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </label>

      {error && <p className="text-sm font-medium text-moss-dark">{error}</p>}
      <button type="submit" disabled={saving} className={primaryBtn}>
        {saving ? "Đang đổi..." : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
