import ProductSearch from "../../components/ProductSearch";
import { prisma } from "../../../lib/prisma";
import ProductCard from "../../components/ProductCard";
import Reveal from "../../components/Reveal";
import Link from "next/link";

const PAGE_SIZE = 12;

const SORT_OPTIONS: Record<string, string> = {
  "": "Mặc định",
  newest: "Mới nhất",
  price_asc: "Giá tăng dần",
  price_desc: "Giá giảm dần",
  popular: "Bán chạy nhất",
};

// Đọc giá từ URL: chỉ nhận số nguyên không âm
function parsePrice(v?: string): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    q?: string;
    sort?: string;
    min?: string;
    max?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;

  // Bỏ qua giá trị category không hợp lệ (vd: ?category=abc)
  const categoryId = Number(sp.category);
  const validCategoryId =
    Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null;

  const keyword = sp.q?.trim() ?? "";
  const sort = sp.sort && sp.sort in SORT_OPTIONS ? sp.sort : "";

  let minPrice = parsePrice(sp.min);
  let maxPrice = parsePrice(sp.max);
  // Nhập ngược (min > max) thì tự đổi chỗ
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  const [categories, allProducts] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: {
        isActive: true,
        ...(validCategoryId ? { categoryId: validCategoryId } : {}),
      },
      orderBy: { id: "asc" },
    }),
  ]);

  // Lọc theo tên ở đây thay vì trong SQL: collation của MariaDB bỏ qua dấu
  // nên "thỏ" sẽ khớp cả "thơm". So sánh bằng JS thì phân biệt dấu,
  // chỉ bỏ qua hoa/thường.
  const normalize = (s: string) => s.normalize("NFC").toLowerCase();
  let products = allProducts.filter((p) => {
    if (keyword && !normalize(p.name).includes(normalize(keyword)))
      return false;
    const price = Number(p.price);
    if (minPrice !== null && price < minPrice) return false;
    if (maxPrice !== null && price > maxPrice) return false;
    return true;
  });

  // Sắp xếp
  if (sort === "newest") {
    products = [...products].sort((a, b) => b.id - a.id);
  } else if (sort === "price_asc") {
    products = [...products].sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sort === "price_desc") {
    products = [...products].sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sort === "popular") {
    // Tổng số lượng bán ra của các đơn chưa hủy
    const sold = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { status: { not: "cancelled" } } },
      _sum: { quantity: true },
    });
    const soldMap = new Map(
      sold.map((s) => [s.productId, s._sum.quantity ?? 0]),
    );
    products = [...products].sort(
      (a, b) =>
        (soldMap.get(b.id) ?? 0) - (soldMap.get(a.id) ?? 0) || a.id - b.id,
    );
  }

  // Phân trang (cắt sau khi đã lọc và sắp xếp)
  const total = products.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rawPage = Number(sp.page);
  const page =
    Number.isInteger(rawPage) && rawPage >= 1
      ? Math.min(rawPage, totalPages)
      : 1;
  const start = (page - 1) * PAGE_SIZE;
  const pageProducts = products.slice(start, start + PAGE_SIZE);

  // Tạo link trong trang /products, giữ lại mọi bộ lọc hiện tại,
  // chỉ ghi đè những giá trị truyền vào
  const current = {
    category: validCategoryId,
    q: keyword,
    sort,
    min: minPrice,
    max: maxPrice,
    page,
  };
  function buildHref(override: Partial<typeof current> = {}) {
    const m = { ...current, ...override };
    const params = new URLSearchParams();
    if (m.category) params.set("category", String(m.category));
    if (m.q) params.set("q", m.q);
    if (m.sort) params.set("sort", m.sort);
    if (m.min !== null) params.set("min", String(m.min));
    if (m.max !== null) params.set("max", String(m.max));
    if (m.page > 1) params.set("page", String(m.page));
    const qs = params.toString();
    return qs ? `/products?${qs}` : "/products";
  }

  const hasFilter = !!(
    keyword ||
    sort ||
    minPrice !== null ||
    maxPrice !== null
  );

  // Kiểu chung cho mục danh mục: đang chọn thì nền nâu mận, chưa chọn thì viền mảnh
  const tabClass = (active: boolean) =>
    `rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? "border-ink bg-ink text-paper"
        : "border-peach bg-white text-ink/70 hover:border-moss hover:text-moss-dark"
    }`;

  const inputClass =
    "rounded-lg border border-peach bg-white px-3 py-2 text-sm text-ink outline-none focus:border-moss";

  // Dãy số trang: luôn có trang đầu, cuối và 1 trang mỗi bên trang hiện tại
  const pageNumbers: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pageNumbers.push(i);
    } else if (pageNumbers[pageNumbers.length - 1] !== "...") {
      pageNumbers.push("...");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-10">
      {/* Đầu trang: nền hồng nhạt, tiêu đề + mô tả + số món */}
      <Reveal>
        <header className="relative overflow-hidden rounded-2xl bg-blush px-6 py-10 sm:px-10">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-2 -top-6 select-none font-heading text-[9rem] font-semibold leading-none text-white/50 sm:text-[12rem]"
          >
            {total}
          </span>
          <div className="relative max-w-lg">
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-moss-dark">
              <span className="h-px w-8 bg-moss-dark" />
              Cửa hàng
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
              Sản phẩm
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              Mỗi món đều làm bằng tay, mẻ nhỏ nên số lượng có hạn. Hết là hết,
              mẻ sau có thể sẽ hơi khác một chút.
            </p>
          </div>
        </header>
      </Reveal>

      <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        {/* Danh mục: đổi danh mục thì về trang 1 */}
        <nav className="flex flex-wrap gap-2">
          <Link
            href={buildHref({ category: null, page: 1 })}
            className={tabClass(!validCategoryId)}
          >
            Tất cả
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={buildHref({ category: c.id, page: 1 })}
              className={tabClass(validCategoryId === c.id)}
            >
              {c.name}
            </Link>
          ))}
        </nav>

        {/* Ô tìm kiếm: giữ lại danh mục đang chọn */}
        <ProductSearch initialKeyword={keyword} categoryId={validCategoryId} />
      </div>

      {/* Sắp xếp + lọc giá: form GET, gửi lại cả danh mục và từ khóa */}
      <form
        method="GET"
        action="/products"
        className="mt-5 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-warm"
      >
        {validCategoryId && (
          <input type="hidden" name="category" value={validCategoryId} />
        )}
        {keyword && <input type="hidden" name="q" value={keyword} />}

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-ink/55">
          Sắp xếp
          <select name="sort" defaultValue={sort} className={inputClass}>
            {Object.entries(SORT_OPTIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-ink/55">
          Giá từ (đ)
          <input
            type="number"
            name="min"
            min={0}
            step={1000}
            defaultValue={minPrice ?? ""}
            placeholder="0"
            className={`${inputClass} w-32`}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-ink/55">
          Đến (đ)
          <input
            type="number"
            name="max"
            min={0}
            step={1000}
            defaultValue={maxPrice ?? ""}
            placeholder="500000"
            className={`${inputClass} w-32`}
          />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-ink px-5 py-2 text-sm font-medium text-paper transition hover:bg-moss-dark"
        >
          Áp dụng
        </button>

        {hasFilter && (
          <Link
            href={buildHref({ q: "", sort: "", min: null, max: null, page: 1 })}
            className="px-1 py-2 text-sm font-medium text-moss-dark underline underline-offset-4 hover:text-moss"
          >
            Xóa bộ lọc
          </Link>
        )}
      </form>

      {keyword && (
        <p className="mt-6 text-sm text-ink/65">
          Kết quả cho &ldquo;
          <span className="font-semibold text-ink">{keyword}</span>&rdquo;:{" "}
          {total} sản phẩm ·{" "}
          <Link
            href={buildHref({ q: "", page: 1 })}
            className="font-medium text-moss-dark underline underline-offset-4 hover:text-moss"
          >
            Xóa tìm kiếm
          </Link>
        </p>
      )}

      <p className="mt-8 text-sm text-ink/55">
        {total === 0 ? (
          "Không có món nào"
        ) : (
          <>
            Đang hiển thị{" "}
            <span className="font-semibold text-ink">
              {start + 1}–{start + pageProducts.length}
            </span>{" "}
            trên <span className="font-semibold text-ink">{total}</span> món
          </>
        )}
      </p>

      <section className="mt-4 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {pageProducts.map((p, i) => (
          <ProductCard
            key={p.id}
            index={i}
            id={p.id}
            name={p.name}
            price={Number(p.price)}
            imageUrl={p.imageUrl}
            stock={p.stock}
          />
        ))}
      </section>

      {total === 0 && (
        <div className="mt-10 rounded-2xl border-2 border-dashed border-peach bg-white px-6 py-14 text-center">
          <p className="font-heading text-xl font-semibold">
            Chưa thấy món nào
          </p>
          <p className="mt-2 text-sm text-ink/65">
            {hasFilter
              ? "Không có món nào khớp với bộ lọc này."
              : "Danh mục này chưa có món nào."}
          </p>
          <Link
            href="/products"
            className="mt-5 inline-block rounded-lg bg-ink px-6 py-3 text-sm font-medium text-paper transition hover:bg-moss-dark"
          >
            Xem tất cả sản phẩm
          </Link>
        </div>
      )}

      {/* Phân trang */}
      {totalPages > 1 && (
        <nav
          aria-label="Phân trang"
          className="mt-12 flex flex-wrap items-center justify-center gap-2"
        >
          {page > 1 && (
            <Link
              href={buildHref({ page: page - 1 })}
              className={tabClass(false)}
            >
              ← Trước
            </Link>
          )}
          {pageNumbers.map((n, idx) =>
            n === "..." ? (
              <span key={`dots-${idx}`} className="px-1 text-ink/40">
                …
              </span>
            ) : (
              <Link
                key={n}
                href={buildHref({ page: n })}
                aria-current={n === page ? "page" : undefined}
                className={tabClass(n === page)}
              >
                {n}
              </Link>
            ),
          )}
          {page < totalPages && (
            <Link
              href={buildHref({ page: page + 1 })}
              className={tabClass(false)}
            >
              Sau →
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
