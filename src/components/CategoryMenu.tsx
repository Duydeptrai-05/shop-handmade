import Link from "next/link";

type CategoryMenuProps = {
  categories: { id: number; name: string }[];
};

export default function CategoryMenu({ categories }: CategoryMenuProps) {
  return (
    <div className="group relative">
      {/* Bấm vào chữ "Sản phẩm" là tới trang /products. Cùng kiểu viên thuốc với các link ở Header */}
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-ink/75 transition-colors hover:bg-blush hover:text-moss-dark md:group-focus-within:bg-blush md:group-focus-within:text-moss-dark md:group-hover:bg-blush md:group-hover:text-moss-dark"
      >
        Sản phẩm
        <span
          aria-hidden
          className="hidden text-[10px] transition-transform duration-200 md:inline md:group-focus-within:rotate-180 md:group-hover:rotate-180"
        >
          ▾
        </span>
      </Link>

      {/* Điện thoại: hiện sẵn bên dưới. Từ md: menu thả xuống khi rê chuột
          (pt-2 là cầu nối để chuột di xuống không bị đóng giữa chừng) */}
      <div className="pt-2 md:invisible md:absolute md:left-0 md:top-full md:z-50 md:translate-y-1 md:opacity-0 md:transition md:duration-200 md:group-focus-within:visible md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100 md:group-hover:visible md:group-hover:translate-y-0 md:group-hover:opacity-100">
        <ul className="ml-1 space-y-1 border-l-2 border-peach/60 pl-3 md:ml-0 md:min-w-60 md:space-y-0.5 md:rounded-2xl md:border md:border-peach/40 md:bg-card md:p-2 md:shadow-warm-lg">
          <li>
            <Link
              href="/products"
              className="flex items-center justify-between rounded-xl px-2 py-1.5 text-sm font-semibold text-moss-dark transition-colors hover:bg-blush md:px-3 md:py-2"
            >
              Tất cả sản phẩm
              <span aria-hidden className="hidden text-xs md:inline">
                →
              </span>
            </Link>
          </li>
          {categories.length > 0 && (
            <li
              aria-hidden
              className="mx-2 my-1 hidden border-t border-dashed border-peach/60 md:block"
            />
          )}
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/products?category=${c.id}`}
                className="block rounded-xl px-2 py-1.5 text-sm text-ink/85 transition-colors hover:bg-blush hover:text-moss-dark md:px-3 md:py-2"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
