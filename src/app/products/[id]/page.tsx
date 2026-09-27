import { prisma } from "../../../../lib/prisma";
import { formatVND } from "../../../../lib/format";
import Image from "next/image";
import { notFound } from "next/navigation";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id: Number(id), isActive: true },
    include: {
      category: true,
      reviews: {
        include: {
          customer: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product) notFound();

  const reviewCount = product.reviews.length;
  const averageRating =
    reviewCount === 0
      ? 0
      : product.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-card">
          <Image
            src={product.imageUrl ?? "/images/products/placeholder.jpg"}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>

        <div>
          <p className="text-sm uppercase tracking-wide text-moss">
            {product.category.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{product.name}</h1>

          <div className="mt-2 flex items-center gap-2">
            <StarRating value={averageRating} />
            <span className="text-sm text-ink/60">
              {reviewCount > 0
                ? `${averageRating.toFixed(1)} (${reviewCount} đánh giá)`
                : "Chưa có đánh giá"}
            </span>
          </div>

          <p className="mt-3 font-heading text-2xl text-ochre">
            {formatVND(Number(product.price))}
          </p>

          <p className="mt-2 text-sm">
            {product.stock > 0 ? (
              <span className="text-moss">Còn hàng ({product.stock})</span>
            ) : (
              <span className="text-ink/50">Hết hàng</span>
            )}
          </p>

          <p className="mt-6 whitespace-pre-line text-ink/80">
            {product.description}
          </p>

          {/* Nút "Thêm vào giỏ" sẽ nối vào Cart Context ở Tuần 2 */}
          <button
            disabled={product.stock === 0}
            className="mt-8 w-full rounded-full bg-ink py-3 text-paper transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/30"
          >
            {product.stock > 0 ? "Thêm vào giỏ hàng" : "Hết hàng"}
          </button>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="font-heading text-xl">Đánh giá sản phẩm</h2>

        {product.reviews.length === 0 ? (
          <p className="mt-3 text-ink/60">
            Chưa có đánh giá nào cho sản phẩm này.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {product.reviews.map((review) => (
              <li key={review.id} className="rounded-2xl bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{review.customer.name}</span>
                  <StarRating value={review.rating} />
                </div>
                {review.comment && (
                  <p className="mt-2 text-ink/80">{review.comment}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StarRating({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <div className="flex gap-0.5" aria-label={`${value.toFixed(1)} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= rounded ? "text-ochre" : "text-ink/20"}
        >
          ★
        </span>
      ))}
    </div>
  );
}
