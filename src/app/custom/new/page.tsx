"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCustomRequestSchema } from "../../../../lib/validation/custom-request";

const IDEAS = [
  "Khắc tên / chữ",
  "Đổi màu theo ý",
  "Hương riêng",
  "Gói quà",
  "Kích thước cụ thể",
];
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

function SectionHead({
  no,
  title,
  hint,
}: {
  no: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-heading text-sm text-moss-dark">{no}</span>
      <div>
        <h2 className="font-heading text-xl text-ink">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-ink/75">{hint}</p>}
      </div>
    </div>
  );
}

export default function NewCustomRequestPage() {
  const router = useRouter();
  const [quantity, setQuantity] = useState("1");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetText, setBudgetText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function addIdea(text: string) {
    setDescription(
      (d) => (d.trim() ? `${d.replace(/\s+$/, "")}\n` : "") + `${text}: `,
    );
  }

  function changeQuantity(delta: number) {
    const current = Number(quantity) || 1;
    setQuantity(String(Math.min(100, Math.max(1, current + delta))));
  }

  function onBudgetChange(e: ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
    setBudgetText(digits ? Number(digits).toLocaleString("vi-VN") : "");
  }

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Chỉ nhận ảnh JPG, PNG hoặc WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Ảnh quá lớn, tối đa 2MB");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/custom-requests/upload", {
        method: "POST",
        body: fd,
      });
      if (res.status === 401) {
        router.push("/login?next=/custom/new");
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Không tải được ảnh, vui lòng thử lại");
        return;
      }
      setImageUrl(json.data.url);
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const digits = budgetText.replace(/\D/g, "");
    const parsed = createCustomRequestSchema.safeParse({
      title,
      description,
      quantity: Number(quantity),
      budget: digits ? Number(digits) : null,
      referenceImageUrl: imageUrl,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/custom-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (res.status === 401) {
        router.push("/login?next=/custom/new");
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Không gửi được yêu cầu, vui lòng thử lại");
        return;
      }
      router.push("/custom");
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setSubmitting(false);
    }
  }

  const lineInput =
    "w-full border-b-2 border-ink/30 bg-transparent px-0 py-2 text-ink outline-none transition placeholder:text-ink/50 focus:border-moss";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/custom"
        className="text-sm text-ink/75 underline-offset-2 hover:text-moss-dark hover:underline"
      >
        ← Về danh sách yêu cầu
      </Link>

      <header className="mt-5 border-b border-ink/20 pb-6">
        <h1 className="font-heading text-3xl text-ink sm:text-4xl">
          Gửi yêu cầu đặt làm
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink/80">
          Điền 3 mục dưới đây. Shop đọc xong sẽ báo giá, bạn thấy hợp mới cần
          đồng ý.
        </p>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_280px]">
        <form onSubmit={onSubmit} noValidate className="min-w-0 space-y-10">
          {/* 01 */}
          <section>
            <SectionHead
              no="01"
              title="Món bạn muốn đặt"
              hint="Gọi tên ngắn gọn và chọn số lượng."
            />
            <div className="mt-5 flex flex-wrap items-end gap-6">
              <div className="min-w-0 flex-1 basis-64">
                <label
                  htmlFor="title"
                  className="text-xs font-semibold text-ink/70"
                >
                  Tên món
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={255}
                  placeholder="VD: nến thơm khắc tên cô dâu"
                  className={`${lineInput} text-lg`}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-ink/70">Số lượng</p>
                <div className="mt-1 flex items-center rounded-md border border-ink/30">
                  <button
                    type="button"
                    onClick={() => changeQuantity(-1)}
                    aria-label="Giảm số lượng"
                    className="h-10 w-10 text-lg text-ink transition hover:bg-ink/5"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    aria-label="Số lượng"
                    className="h-10 w-14 bg-transparent text-center text-base font-medium text-ink outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => changeQuantity(1)}
                    aria-label="Tăng số lượng"
                    className="h-10 w-10 text-lg text-ink transition hover:bg-ink/5"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 02 */}
          <section>
            <SectionHead
              no="02"
              title="Bạn hình dung nó thế nào?"
              hint="Càng cụ thể, shop báo giá càng sát."
            />
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              maxLength={2000}
              placeholder="Màu sắc, kích thước, chất liệu, dịp tặng, ngày cần nhận..."
              aria-label="Mô tả yêu cầu"
              className="mt-5 w-full resize-y rounded-md border border-ink/30 bg-card px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/50 focus:border-moss focus:ring-2 focus:ring-moss/30"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink/70">Thêm nhanh:</span>
              {IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => addIdea(idea)}
                  className="rounded-md border border-ink/30 px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-blush hover:text-moss-dark"
                >
                  + {idea}
                </button>
              ))}
              <span className="ml-auto text-xs text-ink/70">
                {description.length}/2000
              </span>
            </div>
          </section>

          {/* 03 */}
          <section>
            <SectionHead
              no="03"
              title="Thông tin thêm"
              hint="Cả hai ô này đều không bắt buộc."
            />
            <div className="mt-5 grid gap-8 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="budget"
                  className="text-xs font-semibold text-ink/70"
                >
                  Ngân sách dự kiến
                </label>
                <div className="relative">
                  <input
                    id="budget"
                    type="text"
                    inputMode="numeric"
                    value={budgetText}
                    onChange={onBudgetChange}
                    placeholder="VD: 500.000"
                    className={`${lineInput} pr-6`}
                  />
                  <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-sm text-ink/70">
                    đ
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-ink/70">
                  Để shop biết tầm giá bạn mong muốn.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-ink/70">
                  Ảnh tham khảo
                </p>
                <div className="mt-1.5">
                  {imageUrl ? (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Ảnh tham khảo đã chọn"
                        className="h-20 w-20 rounded-md object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl(null)}
                        className="text-sm text-ink/75 underline underline-offset-2 hover:text-moss-dark"
                      >
                        Bỏ ảnh
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-ink/30 px-4 py-5 text-sm text-ink/75 transition hover:border-moss hover:text-moss-dark ${
                        uploading ? "pointer-events-none opacity-60" : ""
                      }`}
                    >
                      {uploading ? "Đang tải ảnh..." : "Chọn ảnh từ máy"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={onPickFile}
                        className="sr-only"
                      />
                    </label>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-ink/70">
                  JPG, PNG hoặc WebP, tối đa 2MB.
                </p>
              </div>
            </div>
          </section>

          {error && (
            <p
              role="alert"
              className="rounded-md bg-blush px-4 py-3 text-sm text-moss-dark"
            >
              {error}
            </p>
          )}

          <div className="border-t border-ink/20 pt-6">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="w-full rounded-md bg-moss px-8 py-3 text-base font-semibold text-white transition hover:bg-moss-dark disabled:opacity-50 sm:w-auto"
            >
              {submitting ? "Đang gửi..." : "Gửi yêu cầu cho shop"}
            </button>
            <p className="mt-3 text-sm text-ink/75">
              Gửi yêu cầu không mất phí. Bạn chỉ cần đồng ý khi thấy giá shop
              báo phù hợp.
            </p>
          </div>
        </form>

        {/* Phiếu tóm tắt, chỉ hiện trên màn hình rộng */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 rounded-lg bg-card p-5">
            <p className="text-xs font-semibold text-ink/70">Phiếu tóm tắt</p>

            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="mt-3 aspect-square w-full rounded-md object-cover"
              />
            ) : (
              <div className="font-heading mt-3 flex aspect-square w-full items-center justify-center rounded-md bg-blush text-5xl text-moss-dark">
                {title.trim() ? title.trim().charAt(0).toUpperCase() : "?"}
              </div>
            )}

            <p className="font-heading mt-4 break-words text-lg leading-snug text-ink">
              {title.trim() || "Chưa đặt tên món"}
            </p>

            <dl className="mt-4 space-y-2 border-t border-ink/15 pt-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink/70">Số lượng</dt>
                <dd className="font-medium text-ink">{quantity || "1"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink/70">Ngân sách</dt>
                <dd className="font-medium text-ink">
                  {budgetText ? `${budgetText}đ` : "Chưa nhập"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink/70">Mô tả</dt>
                <dd className="font-medium text-ink">
                  {description.trim() ? "Đã điền" : "Chưa điền"}
                </dd>
              </div>
            </dl>

            <p className="mt-4 border-t border-ink/15 pt-4 text-xs leading-relaxed text-ink/75">
              Mẹo: nói rõ ngày cần nhận và dịp tặng để shop sắp xếp kịp tiến độ.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
