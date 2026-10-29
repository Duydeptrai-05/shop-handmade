import { prisma } from "../../../../lib/prisma";
import { formatVND } from "../../../../lib/format";
import { getCurrentCustomer } from "../../../../lib/auth";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartButton from "../../../components/AddToCartButton";
import ReviewForm from "../../../components/ReviewForm";
import { getAlsoBought } from "../../../../lib/recommendations";
import RecentlyViewed from "../../../components/RecentlyViewed";
import WishlistButton from "../../../components/WishlistButton";

// Từ ngưỡng này trở xuống thì báo "Chỉ còn ..." để khách biết món sắp hết
const LOW_STOCK = 5;

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, customer] = await Promise.all([
    prisma.product.findFirst({
      where: { id: Number(id), isActive: true },
      include: {
        category: true,
        reviews: {
          where: { status: "approved" },
          include: {
            customer: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    getCurrentCustomer(),
  ]);

  if (!product) notFound();
  const alsoBought = await getAlsoBought(product.id, 4);

  const reviewCount = product.reviews.length;
  const averageRating =
    reviewCount === 0
      ? 0
      : product.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;

  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= LOW_STOCK;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-8">
      {/* Đường dẫn quay lại */}
      <nav
        aria-label="Đường dẫn"
        className="flex flex-wrap items-center gap-2 text-sm text-ink/55"
      >
        <Link href="/" className="transition-colors hover:text-moss-dark">
          Trang chủ
        </Link>
        <span aria-hidden>/</span>
        <Link
          href="/products"
          className="transition-colors hover:text-moss-dark"
        >
          Sản phẩm
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/products?category=${product.categoryId}`}
          className="transition-colors hover:text-moss-dark"
        >
          {product.category.name}
        </Link>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-12">
        {/* Ảnh: khung kiểu ảnh dán */}
        <div className="h-fit rounded-lg border border-peach/50 bg-white p-3 shadow-warm-lg md:sticky md:top-24">
          <div className="relative aspect-square overflow-hidden bg-blush/40">
            <Image
              src={product.imageUrl ?? "/images/products/placeholder.jpg"}
              alt={product.name}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              priority
              className={`object-cover ${
                outOfStock ? "opacity-60 grayscale" : ""
              }`}
            />
            {outOfStock && (
              <span className="absolute left-0 top-4 bg-ink px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-paper">
                Hết hàng
              </span>
            )}
          </div>
        </div>

        {/* Thông tin */}
        <div>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-moss-dark">
            <span className="h-px w-8 bg-moss-dark" />
            {product.category.name}
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-3 flex items-center gap-2">
            <StarRating value={averageRating} />
            <span className="text-sm text-ink/60">
              {reviewCount > 0
                ? `${averageRating.toFixed(1)} (${reviewCount} đánh giá)`
                : "Chưa có đánh giá"}
            </span>
          </div>

          <p className="mt-5 font-heading text-4xl font-semibold text-moss-dark">
            {formatVND(Number(product.price))}
          </p>

          {/* Tình trạng kho */}
          <p className="mt-4">
            {outOfStock ? (
              <span className="inline-block rounded-md bg-ink px-3 py-1 text-sm font-medium text-paper">
                Hết hàng
              </span>
            ) : lowStock ? (
              <span className="inline-block rounded-md bg-ochre px-3 py-1 text-sm font-semibold text-ink">
                Chỉ còn {product.stock} món
              </span>
            ) : (
              <span className="inline-block rounded-md border border-peach bg-blush/60 px-3 py-1 text-sm font-medium text-moss-dark">
                Còn hàng ({product.stock})
              </span>
            )}
          </p>

          <div className="mt-6 border-t border-ink/15 pt-6">
            <p className="whitespace-pre-line leading-relaxed text-ink/80">
              {product.description}
            </p>
          </div>

          <AddToCartButton
            productId={product.id}
            name={product.name}
            price={Number(product.price)}
            imageUrl={product.imageUrl}
            stock={product.stock}
            isLoggedIn={customer !== null}
          />

          <div className="mt-3">
            <WishlistButton productId={product.id} variant="full" />
          </div>
        </div>
      </div>

      {/* Đánh giá */}
      <section className="mt-20">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/15 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-moss-dark">
              Khách nói gì
            </p>
            <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">
              Đánh giá sản phẩm
            </h2>
          </div>
          {reviewCount > 0 && (
            <div className="flex items-center gap-3">
              <span className="font-heading text-4xl font-semibold text-moss-dark">
                {averageRating.toFixed(1)}
              </span>
              <div>
                <StarRating value={averageRating} />
                <p className="mt-0.5 text-xs text-ink/55">
                  {reviewCount} đánh giá
                </p>
              </div>
            </div>
          )}
        </div>

        {product.reviews.length === 0 ? (
          <p className="mt-6 rounded-lg border-2 border-dashed border-peach bg-white px-6 py-8 text-center text-ink/60">
            Chưa có đánh giá nào cho sản phẩm này.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {product.reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-lg border border-peach/50 bg-white p-5 shadow-warm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush font-heading text-base font-semibold text-moss-dark"
                    >
                      {review.customer.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="font-medium">{review.customer.name}</span>
                  </div>
                  <StarRating value={review.rating} />
                </div>
                {review.comment && (
                  <p className="mt-3 leading-relaxed text-ink/80">
                    {review.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <ReviewForm productId={product.id} />
      </section>
      {/* Gợi ý đi kèm: dải cuộn ngang */}
      {alsoBought.length > 0 && (
        <section className="mt-20">
          <div className="border-b border-ink/15 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-moss-dark">
              Gợi ý đi kèm
            </p>
            <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">
              Khách mua món này cũng mua
            </h2>
          </div>

          <ul className="mt-6 flex snap-x gap-4 overflow-x-auto pb-3">
            {alsoBought.map((p) => (
              <li key={p.id} className="w-72 shrink-0 snap-start">
                <Link
                  href={`/products/${p.id}`}
                  className="flex items-center gap-4 rounded-lg border border-peach/50 bg-white p-3 shadow-warm transition-colors hover:border-moss-dark"
                >
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-blush/40">
                    <Image
                      src={p.imageUrl ?? "/images/products/placeholder.jpg"}
                      alt={p.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-medium leading-snug">
                      {p.name}
                    </p>
                    <p className="mt-2 font-heading text-lg font-semibold text-moss-dark">
                      {formatVND(Number(p.price))}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Bạn vừa xem: ghi lại món này và hiện các món đã xem trước đó */}
      <RecentlyViewed
        current={{
          id: product.id,
          name: product.name,
          price: Number(product.price),
          imageUrl: product.imageUrl,
        }}
      />
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
