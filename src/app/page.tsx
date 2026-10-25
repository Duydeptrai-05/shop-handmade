import ProductCarousel from "../components/ProductCarousel";
import { getPopularProducts } from "../../lib/popular-products";
import { getCurrentCustomer } from "../../lib/auth";
import { getRecommendationsForCustomer } from "../../lib/recommendations";
import Reveal from "../components/Reveal";
import Link from "next/link";

const MARQUEE_ITEMS = [
  "Làm thủ công",
  "Nến thơm",
  "Trang sức handmade",
  "Quà tặng & phụ kiện",
  "Số lượng có hạn",
];

const VALUES = [
  {
    title: "Làm tay từng món",
    text: "Không sản xuất hàng loạt.",
    // trái tim
    icon: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  },
  {
    title: "Số lượng có hạn",
    text: "Hết món nào là hết món đó.",
    // đồng hồ cát
    icon: "M7 3h10M7 21h10M8 3v3a4 4 0 0 0 1.5 3L12 12l2.5-3A4 4 0 0 0 16 6V3M8 21v-3a4 4 0 0 1 1.5-3L12 12l2.5 3A4 4 0 0 1 16 18v3",
  },
  {
    title: "Thanh toán an tâm",
    // Hai cách thanh toán: COD hoặc chuyển khoản
    text: "Trả khi nhận hàng hoặc chuyển khoản.",
    // ví
    icon: "M3 7a2 2 0 0 1 2-2h12v3M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-1zM16 13.5h.01",
  },
];

// Vị trí và độ nghiêng của 3 tấm ảnh ở banner
const POLAROIDS = [
  "left-0 top-6 w-[54%] -rotate-3",
  "right-0 top-0 w-[46%] rotate-2",
  "bottom-0 left-[24%] w-[46%] -rotate-1",
];

// Số sản phẩm nổi bật hiện ở trang chủ (trượt trái/phải để xem)
const FEATURED_COUNT = 6;

function formatPrice(n: number) {
  return `${n.toLocaleString("vi-VN")}₫`;
}

export default async function HomePage() {
  const featured = await getPopularProducts(FEATURED_COUNT);

  // Chuyển sang object thuần để truyền cho Client Component (Decimal -> number)
  const carouselProducts = featured.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    imageUrl: p.imageUrl,
  }));

  // 3 sản phẩm đầu có ảnh để xếp ở banner
  const heroProducts = carouselProducts.filter((p) => p.imageUrl).slice(0, 3);

  // Gợi ý theo lịch sử mua: chỉ khi khách đã đăng nhập và từng mua hàng
  // (khách chưa đăng nhập, Admin hoặc tài khoản bị khóa thì customer = null)
  const customer = await getCurrentCustomer();
  const recommended = customer
    ? (await getRecommendationsForCustomer(customer.id, 4)).map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        imageUrl: p.imageUrl,
      }))
    : [];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:pt-10">
      {/* Banner chính */}
      <section className="grid items-center gap-12 py-6 lg:grid-cols-[1fr_1.05fr] lg:py-10">
        <div>
          <p className="animate-fade-up flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-moss-dark">
            <span className="h-px w-8 bg-moss-dark" />
            Làm bằng tay · Từng món một
          </p>
          <h1 className="animate-fade-up mt-5 text-5xl font-semibold leading-[1.05] sm:text-7xl [animation-delay:120ms]">
            Cỏ May{" "}
            <span className="relative inline-block">
              Handmade
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 -z-10 h-3 w-full bg-peach/70 sm:h-4"
              />
            </span>
          </h1>
          <p className="animate-fade-up mt-6 max-w-md text-lg leading-relaxed text-ink/70 [animation-delay:240ms]">
            Đồ handmade làm thủ công, số lượng có hạn
          </p>
          <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-5 [animation-delay:360ms]">
            <Link
              href="/products"
              className="rounded-lg bg-ink px-7 py-3.5 font-medium text-paper transition hover:bg-moss-dark"
            >
              Khám phá ngay
            </Link>
            <Link
              href="/products"
              className="font-medium text-ink underline decoration-moss decoration-2 underline-offset-[6px] transition hover:text-moss-dark"
            >
              Xem tất cả sản phẩm
            </Link>
          </div>
        </div>

        {/* Ảnh sản phẩm thật xếp kiểu ảnh dán */}
        {heroProducts.length > 0 ? (
          <div className="animate-fade-in relative mx-auto h-[360px] w-full max-w-md sm:h-[440px] lg:max-w-none">
            {heroProducts.map((p, i) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className={`absolute bg-white p-2 pb-3 shadow-warm-lg transition duration-300 hover:z-10 hover:rotate-0 hover:scale-[1.03] ${POLAROIDS[i]}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl as string}
                  alt={p.name}
                  className="aspect-square w-full object-cover"
                />
                <div className="mt-2 flex items-baseline justify-between gap-2 px-1">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <span className="shrink-0 text-sm font-semibold text-moss-dark">
                    {formatPrice(p.price)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div aria-hidden className="hidden h-80 bg-blush lg:block" />
        )}
      </section>

      {/* Dải chữ chạy ngang. Máy tắt chuyển động: hiện tĩnh, xuống dòng, đủ 5 cụm */}
      <div
        aria-hidden
        className="mt-6 overflow-hidden border-y border-ink/15 py-3 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
      >
        <div className="marquee-track flex w-max animate-marquee text-sm uppercase tracking-widest text-moss-dark">
          {[0, 1].map((group) => (
            <div key={group} className="flex shrink-0">
              {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                <span
                  key={i}
                  className="flex shrink-0 items-center gap-10 whitespace-nowrap pr-10"
                >
                  {item}
                  <span className="text-ochre">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Ba điểm nổi bật: biểu tượng + chữ, ngăn bằng đường kẻ đứng */}
      <section className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-0">
        {VALUES.map((v, i) => (
          <div
            key={v.title}
            className={`flex items-start gap-4 sm:px-8 ${
              i > 0 ? "sm:border-l sm:border-ink/15" : "sm:pl-0"
            }`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-peach bg-blush/60 text-moss-dark">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d={v.icon} />
              </svg>
            </span>
            <div>
              <h3 className="text-lg font-semibold leading-tight">{v.title}</h3>
              <p className="mt-1 text-sm text-ink/65">{v.text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Dành cho bạn: gợi ý theo lịch sử mua, chỉ hiện khi có gợi ý */}
      {recommended.length > 0 && (
        <section className="mt-16">
          <Reveal>
            <div className="grid gap-6 rounded-3xl bg-blush p-6 sm:p-8 lg:grid-cols-[0.8fr_2.2fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-moss-dark">
                  Gợi ý riêng
                </p>
                <h2 className="mt-1 text-3xl font-semibold">Dành cho bạn</h2>
                <p className="mt-3 text-sm text-ink/70">
                  Chọn theo những món bạn đã mua ở Cỏ May.
                </p>
              </div>

              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {recommended.map((p) => (
                  <li key={p.id}>
                    <Link href={`/products/${p.id}`} className="group block">
                      <div className="aspect-square overflow-hidden rounded-2xl bg-white">
                        {p.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-medium">
                        {p.name}
                      </p>
                      <p className="text-sm font-semibold text-moss-dark">
                        {formatPrice(p.price)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>
      )}

      {/* Sản phẩm nổi bật */}
      {featured.length > 0 && (
        <section className="mt-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/15 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-moss-dark">
                  Bán chạy
                </p>
                <h2 className="mt-1 text-3xl font-semibold sm:text-4xl">
                  Được yêu thích nhất
                </h2>
              </div>
              <Link
                href="/products"
                className="text-sm font-medium underline decoration-moss decoration-2 underline-offset-[5px] transition hover:text-moss-dark"
              >
                Xem tất cả
              </Link>
            </div>
            <p className="mt-3 text-ink/70">
              Những món khách chọn mua nhiều nhất tại Cỏ May
            </p>
          </Reveal>

          <ProductCarousel products={carouselProducts} />
        </section>
      )}
    </main>
  );
}
