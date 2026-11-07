"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type ChatProduct = {
  id: number;
  name: string;
  price: number;
  stock: number;
  imageUrl: string | null;
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  products?: ChatProduct[];
  error?: boolean;
};

const QUICK_QUESTIONS = [
  "Gợi ý quà sinh nhật dưới 200k",
  "Shop có những loại nến thơm nào?",
  "Phí ship và cách thanh toán thế nào?",
  "Món nào đang bán chạy?",
];

function vnd(n: number) {
  return `${n.toLocaleString("vi-VN")}đ`;
}

export default function ChatPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tự cuộn xuống cuối khi có tin mới
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Mở khung thì đưa con trỏ vào ô nhập; bấm Esc để đóng
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);

    // Gửi lịch sử, bỏ tin báo lỗi và gộp các tin khách liên tiếp (giữ tin mới nhất)
    const history: { role: "user" | "assistant"; content: string }[] = [];
    for (const m of next) {
      if (m.error) continue;
      const item = { role: m.role, content: m.content };
      if (history.length && history[history.length - 1].role === m.role) {
        history[history.length - 1] = item;
      } else {
        history.push(item);
      }
    }

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: json.data.reply,
            products: json.data.products,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              json.message || "Trợ lý đang gặp sự cố, bạn thử lại sau nhé.",
            error: true,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Không kết nối được, bạn kiểm tra mạng rồi thử lại nhé.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-label="Trợ lý tư vấn Cỏ May"
      className={`${
        open ? "flex" : "hidden"
      } fixed bottom-3 left-3 right-3 z-50 h-[75vh] max-h-[580px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-ink/10 sm:bottom-5 sm:left-auto sm:right-[5.25rem] sm:w-[380px]`}
    >
      {/* Tiêu đề */}
      <header className="flex items-center justify-between bg-ink px-4 py-3 text-paper">
        <div className="flex items-center gap-3">
          <span className="font-heading flex h-9 w-9 items-center justify-center rounded-full bg-moss text-base font-semibold text-white">
            C
          </span>
          <div className="leading-tight">
            <p className="font-heading text-sm font-semibold">Trợ lý Cỏ May</p>
            <p className="flex items-center gap-1.5 text-[11px] text-paper/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Tư vấn sản phẩm, đặt hàng
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng khung chat"
          className="flex h-8 w-8 items-center justify-center rounded-full text-paper/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 fill-none stroke-current"
            strokeWidth="2"
          >
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Nội dung chat */}
      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto bg-paper px-3 py-4"
      >
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-blush px-3.5 py-2.5 text-sm text-ink">
          Chào bạn, mình là trợ lý của Cỏ May Handmade. Bạn đang tìm món gì, hay
          cần mình gợi ý quà tặng nào?
        </div>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="rounded-full border border-moss-dark/30 bg-white px-3 py-1.5 text-xs text-moss-dark transition-colors hover:bg-moss-dark hover:text-white"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-moss-dark px-3.5 py-2.5 text-sm text-white">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="space-y-2">
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm ${
                  m.error ? "bg-ochre/25 text-ink" : "bg-blush text-ink"
                }`}
              >
                {m.content}
              </div>

              {m.products && m.products.length > 0 && (
                <ul className="space-y-2">
                  {m.products.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/products/${p.id}`}
                        onClick={() => {
                          if (window.innerWidth < 640) onClose();
                        }}
                        className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white p-2 transition-shadow hover:shadow-md"
                      >
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="h-14 w-14 shrink-0 rounded-lg bg-blush object-cover"
                          />
                        ) : (
                          <span className="h-14 w-14 shrink-0 rounded-lg bg-blush" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 block text-sm font-medium text-ink">
                            {p.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-moss-dark">
                            {vnd(p.price)}
                            {p.stock <= 0 && (
                              <span className="ml-2 text-ink/50">Hết hàng</span>
                            )}
                          </span>
                        </span>
                        <span aria-hidden="true" className="pr-1 text-ink/40">
                          ›
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        )}

        {loading && (
          <div className="flex w-fit items-center gap-1 rounded-2xl rounded-tl-sm bg-blush px-4 py-3">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/50"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Ô nhập */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-ink/10 bg-white p-3"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="Nhập câu hỏi của bạn..."
          className="min-w-0 flex-1 rounded-full bg-paper px-4 py-2.5 text-sm text-ink outline-none ring-1 ring-ink/10 placeholder:text-ink/40 focus:ring-moss"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Gửi"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-moss-dark text-white transition-opacity disabled:opacity-40"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 fill-white"
            aria-hidden="true"
          >
            <path d="M3.4 20.4l17.4-7.5c.8-.3.8-1.5 0-1.8L3.4 3.6c-.7-.3-1.4.4-1.2 1.1L4 11l9 1-9 1-1.8 6.3c-.2.7.5 1.4 1.2 1.1z" />
          </svg>
        </button>
      </form>
    </section>
  );
}
