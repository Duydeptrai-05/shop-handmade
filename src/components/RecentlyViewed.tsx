"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type RecentItem = {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
};

const STORAGE_KEY = "shop-handmade-recent";
const MAX_ITEMS = 8;

function readList(): RecentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];
    return data.filter(
      (i) =>
        i &&
        typeof i.id === "number" &&
        typeof i.name === "string" &&
        typeof i.price === "number",
    );
  } catch {
    return [];
  }
}

function writeList(items: RecentItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage đầy hoặc bị chặn: bỏ qua, không làm hỏng trang
  }
}

export default function RecentlyViewed({
  current,
  title = "Bạn vừa xem",
}: {
  current?: RecentItem;
  title?: string;
}) {
  const [items, setItems] = useState<RecentItem[]>([]);

  const cId = current?.id;
  const cName = current?.name;
  const cPrice = current?.price;
  const cImage = current?.imageUrl;

  useEffect(() => {
    let list = readList();
    if (cId !== undefined && cName !== undefined && cPrice !== undefined) {
      const me: RecentItem = {
        id: cId,
        name: cName,
        price: cPrice,
        imageUrl: cImage ?? null,
      };
      // Món đang xem lên đầu, bỏ bản cũ của chính nó, giữ tối đa MAX_ITEMS
      list = [me, ...list.filter((i) => i.id !== cId)].slice(0, MAX_ITEMS);
      writeList(list);
    }
    // Trang chi tiết: không hiện lại chính món đang xem
    setItems(cId !== undefined ? list.filter((i) => i.id !== cId) : list);
  }, [cId, cName, cPrice, cImage]);

  function clearAll() {
    // Đang ở trang chi tiết thì giữ lại món hiện tại trong lịch sử
    if (cId !== undefined && cName !== undefined && cPrice !== undefined) {
      writeList([
        { id: cId, name: cName, price: cPrice, imageUrl: cImage ?? null },
      ]);
    } else {
      writeList([]);
    }
    setItems([]);
  }

  // Chưa có gì để hiện (hoặc chưa tải xong ở client) thì không vẽ gì
  if (items.length === 0) return null;

  return (
    <section className="mt-14" aria-label={title}>
      <div className="flex items-end justify-between gap-4 border-b border-peach pb-3">
        <h2 className="font-heading text-2xl font-semibold">{title}</h2>
        <button
          type="button"
          onClick={clearAll}
          className="text-sm font-medium text-moss-dark underline underline-offset-4 hover:text-moss"
        >
          Xóa lịch sử
        </button>
      </div>

      <ul className="mt-5 flex snap-x gap-4 overflow-x-auto pb-3">
        {items.map((p) => (
          <li key={p.id} className="w-36 shrink-0 snap-start sm:w-40">
            <Link href={`/products/${p.id}`} className="group block">
              <div className="aspect-square overflow-hidden rounded-xl bg-white shadow-warm">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-blush text-xs text-ink/40">
                    Chưa có ảnh
                  </div>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-ink group-hover:text-moss-dark">
                {p.name}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-moss-dark">
                {p.price.toLocaleString("vi-VN")}đ
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
