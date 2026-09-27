import Link from "next/link";

type ProductCardProps = {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  stock: number;
};

export default function ProductCard({ id, name, price, imageUrl, stock }: ProductCardProps) {
  const outOfStock = stock <= 0;

  const formattedPrice = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);

  return (
    <Link
      href={`/products/${id}`}
      className="group block overflow-hidden rounded-xl bg-card"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-black/5">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-ink/40">
            Không có ảnh
          </div>
        )}

        {outOfStock && (
          <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-xs text-paper">
            Hết hàng
          </span>
        )}
      </div>

      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-ink">{name}</h3>
        <p className="mt-1 text-sm font-semibold text-ink">{formattedPrice}</p>
      </div>
    </Link>
  );
}
