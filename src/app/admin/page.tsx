"use client";

import { useEffect, useState } from "react";
import { animate, motion } from "motion/react";

type Range = "today" | "7d" | "30d" | "month";

type Stats = {
  range: Range;
  summary: {
    revenue: number;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    inProgressOrders: number;
    averageOrderValue: number;
  };
  daily: { date: string; revenue: number; orders: number; completed: number }[];
  topProducts: {
    id: number;
    name: string;
    imageUrl: string | null;
    quantity: number;
  }[];
  lowStock: { id: number; name: string; stock: number }[];
};

const RANGES: { value: Range; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "month", label: "Tháng này" },
];

const formatMoney = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n) + " ₫";

// "2026-10-01" -> "01/10"
const formatDay = (key: string) => key.slice(8, 10) + "/" + key.slice(5, 7);

// Số đếm chạy từ 0 lên giá trị thật
function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value]);
  return <>{format ? format(display) : display}</>;
}

export default function AdminDashboardPage() {
  const [range, setRange] = useState<Range>("7d");
  const [data, setData] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/stats?range=${range}`)
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/admin/login?next=/admin";
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        if (!json.success) {
          setError(json.message);
          return;
        }
        setError("");
        setData(json.data);
      })
      .catch(() => {
        if (!cancelled) setError("Không thể kết nối máy chủ");
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  // Đang tải khi chưa có dữ liệu hoặc dữ liệu đang hiện là của kỳ khác
  const loading = !data || data.range !== range;

  const cards = data
    ? [
        {
          label: "Doanh thu",
          value: data.summary.revenue,
          format: formatMoney,
          icon: "💰",
          accent: "border-ochre",
          note: `TB ${formatMoney(data.summary.averageOrderValue)} / đơn`,
        },
        {
          label: "Đơn đã giao",
          value: data.summary.completedOrders,
          icon: "✅",
          accent: "border-moss",
          note: `Trên tổng ${data.summary.totalOrders} đơn`,
        },
        {
          label: "Đang xử lý",
          value: data.summary.inProgressOrders,
          icon: "🚚",
          accent: "border-ink/40",
          note: "Chờ xác nhận hoặc đang giao",
        },
        {
          label: "Đã hủy",
          value: data.summary.cancelledOrders,
          icon: "❌",
          accent: "border-red-400",
          note: "Không tính vào doanh thu",
        },
      ]
    : [];

  const maxRevenue = data
    ? Math.max(...data.daily.map((d) => d.revenue), 1)
    : 1;
  const labelStep = data ? Math.ceil(data.daily.length / 7) : 1;
  const maxQuantity = data
    ? Math.max(...data.topProducts.map((p) => p.quantity), 1)
    : 1;
  const hasRevenue = data ? data.daily.some((d) => d.revenue > 0) : false;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Tiêu đề + chọn kỳ */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">
            Tổng quan
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            Doanh thu và tình hình đơn hàng của cửa hàng
          </p>
        </div>

        <div className="flex gap-1 rounded-full bg-card p-1 shadow-sm">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={
                "rounded-full px-4 py-1.5 text-sm font-medium transition " +
                (range === r.value
                  ? "bg-ink text-paper shadow"
                  : "text-ink/70 hover:bg-ink/5")
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </motion.div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-red-700">
          {error}
        </p>
      )}

      {!data && !error && (
        <p className="animate-pulse text-ink/60">Đang tải...</p>
      )}

      {data && (
        <div
          className={
            "transition-opacity duration-300 " +
            (loading ? "opacity-50" : "opacity-100")
          }
        >
          {/* Thẻ số liệu */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className={`rounded-xl border-l-4 bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${c.accent}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink/60">{c.label}</span>
                  <span className="text-lg">{c.icon}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">
                  <AnimatedNumber value={c.value} format={c.format} />
                </p>
                <p className="mt-1 text-xs text-ink/50">{c.note}</p>
              </motion.div>
            ))}
          </div>

          {/* Biểu đồ doanh thu theo ngày */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-6 rounded-xl border border-ink/10 bg-card p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-ink">
              Doanh thu theo ngày
            </h2>
            <p className="text-xs text-ink/50">
              Chỉ tính đơn đã giao thành công · trỏ chuột vào cột để xem chi
              tiết
            </p>

            {!hasRevenue ? (
              <div className="py-14 text-center">
                <p className="text-4xl">📉</p>
                <p className="mt-3 text-ink/70">
                  Chưa có doanh thu trong khoảng thời gian này.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-6 flex h-52 items-end gap-1 border-b border-ink/15">
                  {data.daily.map((d, i) => {
                    const pct = (d.revenue / maxRevenue) * 100;
                    return (
                      <div
                        key={d.date}
                        className="group relative flex h-full flex-1 items-end"
                      >
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{
                            height: d.revenue > 0 ? `${Math.max(pct, 3)}%` : 2,
                          }}
                          transition={{
                            duration: 0.7,
                            delay: i * 0.02,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className={
                            "w-full rounded-t-md transition-colors " +
                            (d.revenue > 0
                              ? "bg-ochre group-hover:bg-ink"
                              : "bg-ink/10")
                          }
                        />
                        {/* Chú thích khi hover */}
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-xs text-paper shadow-lg group-hover:block">
                          <p className="font-medium">{formatDay(d.date)}</p>
                          <p>{formatMoney(d.revenue)}</p>
                          <p className="text-paper/70">
                            {d.orders} đơn · {d.completed} đã giao
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Nhãn ngày bên dưới */}
                <div className="mt-2 flex gap-1">
                  {data.daily.map((d, i) => (
                    <div
                      key={d.date}
                      className="flex-1 text-center text-[10px] text-ink/50"
                    >
                      {i % labelStep === 0 ? formatDay(d.date) : ""}
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.section>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Sản phẩm bán chạy */}
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="rounded-xl border border-ink/10 bg-card p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-ink">
                Sản phẩm bán chạy
              </h2>
              {data.topProducts.length === 0 ? (
                <p className="mt-4 text-sm text-ink/60">
                  Chưa có sản phẩm nào được bán.
                </p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {data.topProducts.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-3">
                      <span className="w-5 text-sm font-semibold text-ink/40">
                        {i + 1}
                      </span>
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageUrl}
                          alt=""
                          className="h-11 w-11 rounded-xl object-cover shadow-sm"
                        />
                      ) : (
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink/5 text-ink/30">
                          —
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-medium text-ink">
                            {p.name}
                          </p>
                          <span className="shrink-0 text-xs text-ink/60">
                            {p.quantity} đã bán
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(p.quantity / maxQuantity) * 100}%`,
                            }}
                            transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                            className="h-full rounded-full bg-moss"
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>

            {/* Cảnh báo sắp hết hàng */}
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="rounded-xl border border-ink/10 bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink">Sắp hết hàng</h2>
                <a
                  href="/admin/products"
                  className="text-sm text-ink/60 underline-offset-2 hover:text-ink hover:underline"
                >
                  Quản lý sản phẩm →
                </a>
              </div>
              {data.lowStock.length === 0 ? (
                <p className="mt-4 text-sm text-ink/60">
                  Tất cả sản phẩm đều còn đủ hàng 🎉
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {data.lowStock.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2.5"
                    >
                      <span className="truncate text-sm text-ink">
                        {p.name}
                      </span>
                      {p.stock <= 0 ? (
                        <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                          Hết hàng
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-ochre/20 px-2.5 py-1 text-xs font-medium text-ink">
                          Còn {p.stock}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
          </div>
        </div>
      )}
    </main>
  );
}
