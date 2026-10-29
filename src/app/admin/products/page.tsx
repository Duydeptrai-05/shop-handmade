"use client";

import { useCallback, useEffect, useState } from "react";
import { animate, motion } from "motion/react";
import { productSchema } from "../../../../lib/validation/product";

type Category = { id: number; name: string };
type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stock: number;
  isActive: boolean;
  categoryId: number;
  category: Category;
};
type FormState = {
  name: string;
  description: string;
  price: string;
  stock: string;
  imageUrl: string;
  categoryId: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  price: "",
  stock: "0",
  imageUrl: "",
  categoryId: "",
};

// Kho dưới mức này thì cảnh báo "Sắp hết"
const LOW_STOCK = 10;

const formatPrice = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n) + " ₫";

// Số đếm chạy từ 0 lên giá trị thật
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value]);
  return <>{display}</>;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Bộ lọc
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [status, setStatus] = useState("");

  // Form thêm/sửa
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  function goLogin() {
    window.location.href = "/admin/login?next=/admin/products";
  }

  const loadProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (appliedKeyword) params.set("q", appliedKeyword);
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (res.status === 401) {
        goLogin();
        return;
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setProducts(json.data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải sản phẩm");
    } finally {
      setLoading(false);
    }
  }, [appliedKeyword, status]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCategories(json.data);
      })
      .catch(() => {});
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setUploadError("");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      stock: String(p.stock),
      imageUrl: p.imageUrl ?? "",
      categoryId: String(p.categoryId),
    });
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setFormError("");

    const parsed = productSchema.safeParse(form);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0].message);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/admin/products/${editing.id}` : "/api/admin/products",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      if (res.status === 401) {
        goLogin();
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setFormError(json.message);
        return;
      }
      closeForm();
      await loadProducts();
    } catch {
      setFormError("Không thể kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: Product) {
    if (
      p.isActive &&
      !window.confirm(`Ẩn sản phẩm "${p.name}" khỏi cửa hàng?`)
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      if (res.status === 401) {
        goLogin();
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setError(json.message);
        return;
      }
      await loadProducts();
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  function setField(name: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại đúng file vừa chọn
    if (!file) return;

    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      if (res.status === 401) {
        goLogin();
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setUploadError(json.message);
        return;
      }
      setField("imageUrl", json.data.url);
    } catch {
      setUploadError("Không thể kết nối máy chủ");
    } finally {
      setUploading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-ink/20 bg-paper px-3 py-2 text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-ochre/30";

  // Số liệu thống kê (tính theo danh sách đang hiển thị)
  const stats = [
    {
      label: "Tổng sản phẩm",
      value: products.length,
      icon: "📦",
      accent: "border-ink/40",
    },
    {
      label: "Đang bán",
      value: products.filter((p) => p.isActive).length,
      icon: "✅",
      accent: "border-moss",
    },
    {
      label: "Đã ẩn",
      value: products.filter((p) => !p.isActive).length,
      icon: "🙈",
      accent: "border-ink/20",
    },
    {
      label: "Sắp hết hàng",
      value: products.filter((p) => p.isActive && p.stock < LOW_STOCK).length,
      icon: "⚠️",
      accent: "border-ochre",
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Tiêu đề */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">
            Quản lý sản phẩm
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            Thêm, chỉnh sửa và ẩn/hiện sản phẩm của cửa hàng
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={openCreate}
          className="rounded-full bg-ink px-5 py-2.5 font-medium text-paper shadow-md transition-shadow hover:shadow-lg"
        >
          + Thêm sản phẩm
        </motion.button>
      </motion.div>

      {/* Thẻ thống kê */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            whileHover={{ y: -4 }}
            className={`rounded-xl border-l-4 bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${s.accent}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink/60">{s.label}</span>
              <span className="text-lg">{s.icon}</span>
            </div>
            <p className="mt-2 text-3xl font-semibold text-ink">
              <AnimatedNumber value={s.value} />
            </p>
          </motion.div>
        ))}
      </div>

      {/* Bộ lọc: tìm kiếm và trạng thái cùng một hàng */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form
          className="flex flex-1 gap-2 sm:max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedKeyword(keyword.trim());
          }}
        >
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="🔍 Tìm theo tên..."
            className={inputClass}
          />
          <button className="rounded-lg bg-ink px-4 py-2 text-paper transition hover:opacity-90">
            Tìm
          </button>
        </form>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={inputClass + " sm:w-48"}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang bán</option>
          <option value="inactive">Đã ẩn</option>
        </select>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-red-700">
          {error}
        </p>
      )}

      {/* Form thêm/sửa */}
      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          onSubmit={handleSubmit}
          className="mb-6 grid gap-3 rounded-xl border border-ink/10 bg-card p-5 shadow-md sm:grid-cols-2"
        >
          <h2 className="text-lg font-semibold text-ink sm:col-span-2">
            {editing ? `Sửa sản phẩm #${editing.id}` : "Thêm sản phẩm mới"}
          </h2>

          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm text-ink">Tên sản phẩm</span>
            <input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className={inputClass}
            />
          </label>

          <label>
            <span className="mb-1 block text-sm text-ink">Giá (₫)</span>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setField("price", e.target.value)}
              className={inputClass}
            />
          </label>

          <label>
            <span className="mb-1 block text-sm text-ink">Tồn kho</span>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setField("stock", e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm text-ink">Danh mục</span>
            <select
              value={form.categoryId}
              onChange={(e) => setField("categoryId", e.target.value)}
              className={inputClass}
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2">
            <span className="mb-1 block text-sm text-ink">Ảnh sản phẩm</span>
            <div className="flex flex-wrap items-center gap-3">
              {form.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.imageUrl}
                  alt="Xem trước"
                  className="h-24 w-24 rounded-xl border border-ink/10 object-cover"
                />
              ) : (
                <span className="flex h-24 w-24 items-center justify-center rounded-xl bg-ink/5 text-xs text-ink/40">
                  Chưa có ảnh
                </span>
              )}

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-lg border border-ink/20 px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink hover:text-paper">
                    {uploading ? "Đang tải ảnh..." : "Chọn ảnh từ máy"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFile}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  {form.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setField("imageUrl", "")}
                      className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 transition hover:bg-red-600 hover:text-white"
                    >
                      Bỏ ảnh
                    </button>
                  )}
                </div>
                <input
                  value={form.imageUrl}
                  onChange={(e) => setField("imageUrl", e.target.value)}
                  placeholder="Hoặc dán đường dẫn: https://... hoặc /images/..."
                  className={inputClass}
                />
                {uploadError && (
                  <p className="text-sm text-red-700">{uploadError}</p>
                )}
                <span className="text-xs text-ink/50">
                  JPG, PNG hoặc WEBP, tối đa 2MB
                </span>
              </div>
            </div>
          </div>

          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm text-ink">Mô tả</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              className={inputClass}
            />
          </label>

          {formError && (
            <p className="text-red-700 sm:col-span-2">{formError}</p>
          )}

          <div className="flex gap-2 sm:col-span-2">
            <button
              disabled={saving}
              className="rounded-lg bg-ink px-5 py-2 text-paper transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-ink/20 px-5 py-2 text-ink transition hover:bg-ink/5"
            >
              Hủy
            </button>
          </div>
        </motion.form>
      )}

      {/* Danh sách */}
      {loading ? (
        <p className="animate-pulse text-ink/60">Đang tải...</p>
      ) : products.length === 0 ? (
        <div className="rounded-xl bg-card py-16 text-center">
          <p className="text-4xl">🔎</p>
          <p className="mt-3 text-ink/70">Không có sản phẩm nào.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink/10 bg-card shadow-sm">
          <table className="w-full text-left text-sm text-ink">
            <thead className="bg-ink/5 text-xs uppercase tracking-wider text-ink/60">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Ảnh</th>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Danh mục</th>
                <th className="px-4 py-3">Giá</th>
                <th className="px-4 py-3">Kho</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: p.isActive ? 1 : 0.6, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i, 10) * 0.04 }}
                  className="border-t border-ink/10 transition-colors hover:bg-ochre/10"
                >
                  <td className="px-4 py-3 text-ink/50">#{p.id}</td>
                  <td className="px-4 py-3">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="h-12 w-12 rounded-xl object-cover shadow-sm transition-transform duration-300 hover:scale-125"
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink/5 text-ink/30">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs text-ink/70">
                      {p.category.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatPrice(p.price)}
                  </td>
                  <td className="px-4 py-3">
                    {p.stock <= 0 ? (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                        Hết hàng
                      </span>
                    ) : p.stock < LOW_STOCK ? (
                      <span className="rounded-full bg-ochre/20 px-2.5 py-1 text-xs font-medium text-ink">
                        {p.stock} · Sắp hết
                      </span>
                    ) : (
                      <span>{p.stock}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.isActive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-moss/15 px-2.5 py-1 text-xs font-medium text-moss">
                        <span className="h-1.5 w-1.5 rounded-full bg-moss" />
                        Đang bán
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/10 px-2.5 py-1 text-xs font-medium text-ink/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-ink/40" />
                        Đã ẩn
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <button
                      onClick={() => openEdit(p)}
                      className="mr-2 rounded-lg border border-ink/20 px-3 py-1.5 text-xs font-medium transition hover:bg-ink hover:text-paper"
                    >
                      ✏️ Sửa
                    </button>
                    <button
                      onClick={() => toggleActive(p)}
                      className={
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition " +
                        (p.isActive
                          ? "border-red-300 text-red-700 hover:bg-red-600 hover:text-white"
                          : "border-moss/50 text-moss hover:bg-moss hover:text-paper")
                      }
                    >
                      {p.isActive ? "Ẩn" : "Hiện"}
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
