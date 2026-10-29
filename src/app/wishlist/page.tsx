import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import { getAuthPayload } from "../../../lib/auth";
import ProductCard from "../../components/ProductCard";
import WishlistButton from "../../components/WishlistButton";

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    n,
  );

export default async function WishlistPage() {
  const payload = await getAuthPayload();
  if (!payload || payload.role !== "customer") {
    redirect("/login?next=/wishlist");
  }

  // Lấy các dòng yêu thích mới nhất trước, rồi tra sản phẩm theo id
  const rows = await prisma.wishlist.findMany({
    where: { customerId: payload.id },
    orderBy: { id: "desc" },
    select: { productId: true },
  });

  const found = await prisma.product.findMany({
    where: { id: { in: rows.map((r) => r.productId) }, isActive: true },
  });

  // Giữ đúng thứ tự "thêm gần nhất trước"
  const byId = new Map(found.map((p) => [p.id, p]));
  const items = rows
    .map((r) => byId.get(r.productId))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      imageUrl: p.imageUrl,
      stock: p.stock,
    }));

  const [first, ...rest] = items;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Đầu trang: chữ lớn lệch trái, số lượng nằm trong vòng tròn */}
      <header className="mb-10 flex items-end justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-moss-dark">
            Danh sách của bạn
          </p>
          <h1 className="font-heading mt-1 text-4xl font-semibold leading-tight text-ink sm:text-6xl">
            Sản phẩm
            <br />
            yêu thích
          </h1>
        </div>
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full bg-blush text-ink sm:h-28 sm:w-28">
          <span className="font-heading text-3xl font-semibold sm:text-4xl">
            {items.length}
          </span>
          <span className="text-xs text-ink/60">món</span>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-blush/50 px-6 py-20 text-center">
          <svg
            viewBox="0 0 24 24"
            className="h-20 w-20 text-moss"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            aria-hidden="true"
          >
            <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.4 5 6.4 5c1.9 0 3.4 1 4.4 2.5h2.4C14.2 6 15.7 5 17.6 5c3 0 4.9 3 3.7 6.3-1.8 4.6-9.3 9.2-9.3 9.2z" />
          </svg>
          <p className="font-heading mt-5 text-2xl text-ink">
            Chưa có món nào ở đây
          </p>
          <p className="mt-2 max-w-sm text-sm text-ink/60">
            Bấm vào biểu tượng trái tim trên mỗi sản phẩm để lưu lại và xem sau.
            sau.
          </p>
          <Link
            href="/products"
            className="mt-6 rounded-full bg-moss px-6 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark"
          >
            Xem sản phẩm
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {/* Ô lớn: món vừa thương gần nhất */}
          <div className="relative col-span-2 aspect-[4/3] overflow-hidden rounded-3xl bg-ink md:row-span-2 md:aspect-auto md:min-h-[30rem]">
            <Link
              href={`/products/${first.id}`}
              className="group block h-full w-full"
            >
              {first.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={first.imageUrl}
                  alt={first.name}
                  className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${
                    first.stock <= 0 ? "opacity-60 grayscale" : ""
                  }`}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-paper/50">
                  Không có ảnh
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-paper sm:p-7">
                <span className="inline-block rounded-full bg-ochre px-3 py-1 text-xs font-semibold text-ink">
                  Mới lưu gần nhất
                </span>
                <h2 className="font-heading mt-3 line-clamp-2 text-2xl font-semibold leading-snug sm:text-3xl">
                  {first.name}
                </h2>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xl font-semibold">
                    {formatVND(first.price)}
                  </span>
                  <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm backdrop-blur transition group-hover:bg-moss">
                    {first.stock <= 0 ? "Hết hàng" : "Xem chi tiết →"}
                  </span>
                </div>
              </div>
            </Link>
            <div className="absolute right-4 top-4 z-10">
              <WishlistButton productId={first.id} variant="icon" />
            </div>
          </div>

          {rest.map((p, i) => (
            <ProductCard
              key={p.id}
              index={i}
              id={p.id}
              name={p.name}
              price={p.price}
              imageUrl={p.imageUrl}
              stock={p.stock}
            />
          ))}
        </div>
      )}
    </main>
  );
}
