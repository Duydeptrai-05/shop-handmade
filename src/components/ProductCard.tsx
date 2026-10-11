import Link from "next/link";
import Reveal from "./Reveal";

type ProductCardProps = {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  stock: number;
  index?: number; // Thứ tự thẻ trong danh sách, dùng để hiện lần lượt
};

// Từ ngưỡng này trở xuống thì báo "Chỉ còn ..." để khách biết món sắp hết
const LOW_STOCK = 5;

export default function ProductCard({
  id,
  name,
  price,
  imageUrl,
  stock,
  index = 0,
}: ProductCardProps) {
  const outOfStock = stock <= 0;
  const lowStock = !outOfStock && stock <= LOW_STOCK;

  const formattedPrice = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);

  return (
    // Trễ theo cột (tối đa 4 cột) để cả hàng hiện lần lượt, không bị chờ lâu ở các hàng dưới
    <Reveal delay={(index % 4) * 0.08}>
      <Link
        href={`/products/${id}`}
        className="group block rounded-lg border border-peach/50 bg-white p-2 shadow-warm transition duration-300 hover:-translate-y-1 hover:border-moss hover:shadow-warm-lg"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-blush/40">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={name}
              className={`h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
                outOfStock ? "opacity-60 grayscale" : ""
              }`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-ink/40">
              Không có ảnh
            </div>
          )}

          {/* Nhãn trạng thái: hết hàng hoặc sắp hết */}
          {outOfStock && (
            <span className="absolute left-0 top-3 bg-ink px-3 py-1 text-xs font-medium uppercase tracking-wider text-paper">
              Hết hàng
            </span>
          )}
          {lowStock && (
            <span className="absolute left-0 top-3 bg-ochre px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ink">
              Chỉ còn {stock}
            </span>
          )}

          {/* Dải trượt lên khi rê chuột */}
          <span className="absolute inset-x-0 bottom-0 translate-y-full bg-moss py-2.5 text-center text-sm font-medium text-white transition duration-300 group-hover:translate-y-0">
            Xem chi tiết →
          </span>
        </div>

        <div className="px-1.5 pb-1.5 pt-3">
          <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-ink transition-colors group-hover:text-moss-dark">
            {name}
          </h3>
          <p className="mt-1.5 text-base font-semibold text-moss-dark">
            {formattedPrice}
          </p>
        </div>
      </Link>
    </Reveal>
  );
}
