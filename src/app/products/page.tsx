import ProductSearch from "../../components/ProductSearch";
import { prisma } from "../../../lib/prisma";
import ProductCard from "../../components/ProductCard";
import Reveal from "../../components/Reveal";
import Link from "next/link";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;

  // Bỏ qua giá trị category không hợp lệ (vd: ?category=abc)
  const categoryId = Number(category);
  const validCategoryId =
    Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null;

  const keyword = q?.trim() ?? "";

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
  const products = keyword
    ? allProducts.filter((p) => normalize(p.name).includes(normalize(keyword)))
    : allProducts;

  // Tạo link trong trang /products, giữ lại danh mục và từ khóa khi cần
  function buildHref(id?: number | null, search?: string) {
    const params = new URLSearchParams();
    if (id) params.set("category", String(id));
    if (search) params.set("q", search);
    const qs = params.toString();
    return qs ? `/products?${qs}` : "/products";
  }

  // Kiểu chung cho mục danh mục: đang chọn thì nền nâu mận, chưa chọn thì viền mảnh
  const tabClass = (active: boolean) =>
    `rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? "border-ink bg-ink text-paper"
        : "border-peach bg-white text-ink/70 hover:border-moss hover:text-moss-dark"
    }`;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-10">
      {/* Đầu trang: nền hồng nhạt, tiêu đề + mô tả + số món */}
      <Reveal>
        <header className="relative overflow-hidden rounded-2xl bg-blush px-6 py-10 sm:px-10">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-2 -top-6 select-none font-heading text-[9rem] font-semibold leading-none text-white/50 sm:text-[12rem]"
          >
            {products.length}
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
        {/* Danh mục */}
        <nav className="flex flex-wrap gap-2">
          <Link
            href={buildHref(null, keyword)}
            className={tabClass(!validCategoryId)}
          >
            Tất cả
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={buildHref(c.id, keyword)}
              className={tabClass(validCategoryId === c.id)}
            >
              {c.name}
            </Link>
          ))}
        </nav>

        {/* Ô tìm kiếm: form GET, giữ lại danh mục đang chọn */}
        <ProductSearch initialKeyword={keyword} categoryId={validCategoryId} />
      </div>

      {keyword && (
        <p className="mt-6 text-sm text-ink/65">
          Kết quả cho &ldquo;
          <span className="font-semibold text-ink">{keyword}</span>&rdquo;:{" "}
          {products.length} sản phẩm ·{" "}
          <Link
            href={buildHref(validCategoryId)}
            className="font-medium text-moss-dark underline underline-offset-4 hover:text-moss"
          >
            Xóa tìm kiếm
          </Link>
        </p>
      )}

      <p className="mt-8 text-sm text-ink/55">
        Đang hiển thị{" "}
        <span className="font-semibold text-ink">{products.length}</span> món
      </p>

      <section className="mt-4 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p, i) => (
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

      {products.length === 0 && (
        <div className="mt-10 rounded-2xl border-2 border-dashed border-peach bg-white px-6 py-14 text-center">
          <p className="font-heading text-xl font-semibold">
            Chưa thấy món nào
          </p>
          <p className="mt-2 text-sm text-ink/65">
            {keyword
              ? "Không tìm thấy món nào khớp với từ khóa này."
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
    </main>
  );
}
