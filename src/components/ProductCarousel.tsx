"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, MotionConfig } from "motion/react";

type CarouselProduct = {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
};

// Thời gian giữa 2 lần tự chuyển (mili giây)
const AUTO_DELAY = 3500;

const SPRING = { type: "spring", stiffness: 140, damping: 20 } as const;

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value) + "₫";

export default function ProductCarousel({
  products,
}: {
  products: CarouselProduct[];
}) {
  const n = products.length;
  const [current, setCurrent] = useState(0); // sản phẩm đang ở giữa
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(true);
  const touchStartX = useRef<number | null>(null);

  // Máy tính hiện 3 ô (giữa + 2 bên), điện thoại chỉ hiện 1 ô
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const go = useCallback(
    (direction: 1 | -1) => {
      if (n === 0) return;
      setCurrent((c) => (c + direction + n) % n);
    },
    [n],
  );

  // Tự chuyển sang phải; tạm dừng khi đang trỏ chuột/chạm vào
  useEffect(() => {
    if (paused || n < 2) return;
    const timer = setTimeout(() => go(1), AUTO_DELAY);
    return () => clearTimeout(timer);
  }, [paused, current, n, go]);

  if (n === 0) return null;

  // Vị trí tương đối của ô i so với ô đang ở giữa (…, -1, 0, 1, 2, …), tính theo vòng tròn
  const half = Math.floor(n / 2);
  const offsetOf = (i: number) => ((i - current + n + half) % n) - half;
  const visibleRange = isDesktop ? 1 : 0;
  const hoveredOffset = hovered !== null ? offsetOf(hovered) : null;

  const arrowClass =
    "group absolute top-1/2 z-20 flex h-28 w-9 -translate-y-1/2 items-center justify-center rounded-md bg-ink text-3xl leading-none text-paper shadow-warm-lg transition-colors hover:bg-moss";

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="relative mx-auto max-w-5xl px-4"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => {
          setPaused(false);
          setHovered(null);
        }}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onTouchStart={(e) => {
          setPaused(true);
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          // Vuốt trái/phải để chuyển sản phẩm
          if (touchStartX.current !== null) {
            const delta = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
          }
          touchStartX.current = null;
          setTimeout(() => setPaused(false), AUTO_DELAY);
        }}
      >
        {/* Nút trái */}
        <motion.button
          type="button"
          onClick={() => go(-1)}
          aria-label="Xem sản phẩm trước"
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          className={`${arrowClass} left-0 md:-left-4`}
        >
          <span className="transition-transform duration-300 group-hover:-translate-x-0.5">
            ‹
          </span>
        </motion.button>

        {/* Các ô xếp chồng cùng một chỗ, rồi dịch sang trái/phải theo vị trí vòng tròn */}
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="grid place-items-center overflow-x-clip py-12"
        >
          {products.map((p, i) => {
            const off = offsetOf(i);
            const abs = Math.abs(off);
            const isVisible = abs <= visibleRange;
            const isCenter = off === 0;

            // Animation theo vị trí: ô giữa to, sáng, nhô lên; ô bên cạnh nhỏ và mờ hơn
            const outer = {
              x: `${Math.max(-2, Math.min(2, off)) * 100}%`,
              scale: isCenter ? 1.04 : 0.92,
              opacity: isVisible ? (isCenter ? 1 : 0.55) : 0,
              y: isCenter ? -14 : 0,
            };

            // Animation khi hover: ô được trỏ to lên, các ô còn lại dạt ra hai bên
            let inner = { x: 0, y: 0, scale: 1, rotate: 0 };
            if (hovered !== null && hoveredOffset !== null) {
              if (hovered === i) {
                inner = { x: 0, y: -18, scale: 1.05, rotate: -1 };
              } else {
                inner = {
                  x: off < hoveredOffset ? -18 : 18,
                  y: 0,
                  scale: 0.94,
                  rotate: 0,
                };
              }
            }

            return (
              <motion.div
                key={p.id}
                animate={outer}
                transition={SPRING}
                aria-hidden={!isVisible}
                style={{
                  zIndex: hovered === i ? 10 : isCenter ? 5 : 0,
                  pointerEvents: isVisible ? "auto" : "none",
                }}
                className="col-start-1 row-start-1 w-4/5 px-3 md:w-1/3 md:px-5"
              >
                <motion.div
                  animate={inner}
                  transition={SPRING}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") setHovered(i);
                  }}
                  onPointerLeave={() => setHovered(null)}
                >
                  <a
                    href={`/products/${p.id}`}
                    tabIndex={isVisible ? 0 : -1}
                    className="group/card block"
                  >
                    {/* Khung ảnh kiểu ảnh dán: viền trắng, ảnh nằm gọn bên trong */}
                    <div
                      className={`relative aspect-square overflow-hidden rounded-lg border bg-white p-2 transition-all duration-500 ${
                        hovered === i
                          ? "border-moss shadow-warm-lg"
                          : "border-peach/50 shadow-warm"
                      }`}
                    >
                      <div className="relative h-full w-full overflow-hidden bg-blush/40">
                        {p.imageUrl && (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="h-full w-full object-contain"
                          />
                        )}

                        {/* Dải chữ trượt từ dưới lên khi hover */}
                        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-moss px-4 py-2.5 text-center text-sm font-medium text-white transition-transform duration-500 ease-out group-hover/card:translate-y-0">
                          Xem chi tiết →
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 text-center font-medium text-ink transition-colors duration-300 group-hover/card:text-moss-dark">
                      {p.name}
                    </p>
                    <p className="text-center text-sm font-semibold text-moss-dark">
                      {formatPrice(p.price)}
                    </p>
                  </a>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Nút phải */}
        <motion.button
          type="button"
          onClick={() => go(1)}
          aria-label="Xem sản phẩm tiếp theo"
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          className={`${arrowClass} right-0 md:-right-4`}
        >
          <span className="transition-transform duration-300 group-hover:translate-x-0.5">
            ›
          </span>
        </motion.button>

        {/* Thanh tiến trình: chạy đầy thì tự chuyển sản phẩm tiếp theo */}
        <div className="mx-auto mt-2 h-0.5 w-40 overflow-hidden rounded-full bg-peach/50">
          <motion.div
            key={current}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: paused ? 0 : 1 }}
            transition={{
              duration: paused ? 0.3 : AUTO_DELAY / 1000,
              ease: "linear",
            }}
            className="h-full origin-left rounded-full bg-moss"
          />
        </div>
      </div>
    </MotionConfig>
  );
}
