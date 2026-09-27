import { prisma } from "../../lib/prisma";
import ProductCard from "../components/ProductCard";
import Link from "next/link";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: {
        isActive: true,
        ...(category ? { categoryId: Number(category) } : {}),
      },
      orderBy: { id: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Cỏ May Handmade</h1>
      <p className="mt-1 text-ink/70">
        Đồ handmade làm thủ công, số lượng có hạn
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/"
          className={`rounded-full px-4 py-1.5 text-sm ${
            !category ? "bg-ink text-paper" : "bg-card text-ink"
          }`}
        >
          Tất cả
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/?category=${c.id}`}
            className={`rounded-full px-4 py-1.5 text-sm ${
              category === String(c.id)
                ? "bg-ink text-paper"
                : "bg-card text-ink"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            id={p.id}
            name={p.name}
            price={Number(p.price)}
            imageUrl={p.imageUrl}
            stock={p.stock}
          />
        ))}
      </section>

      {products.length === 0 && (
        <p className="mt-10 text-center text-ink/60">
          Chưa có sản phẩm nào trong danh mục này.
        </p>
      )}
    </main>
  );
}
