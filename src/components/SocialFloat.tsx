"use client";

import { useCallback, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import ChatPanel from "./ChatPanel";

// Messenger: https://m.me/ + tên người dùng Facebook
// Zalo:      https://zalo.me/ + số điện thoại đã đăng ký Zalo
const LINKS = {
  messenger: "https://m.me/ngoc.zuy.34743",
  zalo: "https://zalo.me/0877392019",
};

type Contact = {
  key: string;
  label: string;
  href: string;
  bg: string;
  icon: ReactNode;
};

const CONTACTS: Contact[] = [
  {
    key: "messenger",
    label: "Nhắn Messenger",
    href: LINKS.messenger,
    bg: "#A033FF",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 fill-white"
        aria-hidden="true"
      >
        <path d="M12 2C6.5 2 2 6.2 2 11.5c0 2.9 1.3 5.4 3.4 7.1V22l3.1-1.7c.8.2 1.6.3 2.5.3 5.5 0 10-4.2 10-9.5S17.5 2 12 2zm1 12.7l-2.5-2.7-4.9 2.7 5.4-5.7 2.6 2.7 4.8-2.7-5.4 5.7z" />
      </svg>
    ),
  },
  {
    key: "zalo",
    label: "Nhắn Zalo",
    href: LINKS.zalo,
    bg: "#0068FF",
    icon: (
      <span className="text-xs font-bold leading-none text-white">Zalo</span>
    ),
  },
];

const LABEL_CLASS =
  "mr-2 max-w-0 overflow-hidden whitespace-nowrap rounded-full bg-white px-0 py-1.5 text-xs font-medium text-neutral-700 opacity-0 shadow transition-all duration-200 group-hover:max-w-[140px] group-hover:px-3 group-hover:opacity-100";

const ICON_CLASS =
  "flex h-12 w-12 items-center justify-center rounded-full shadow-lg ring-2 ring-white transition-transform duration-200 group-hover:scale-110";

export default function SocialFloat() {
  const pathname = usePathname();
  const [chatOpen, setChatOpen] = useState(false);
  const closeChat = useCallback(() => setChatOpen(false), []);

  if (pathname.startsWith("/admin")) return null;

  const items = CONTACTS.filter((c) => c.href);

  return (
    <>
      <ChatPanel open={chatOpen} onClose={closeChat} />

      <ul className="fixed bottom-5 right-4 z-40 flex flex-col gap-3">
        {items.map((c) => (
          <li key={c.key}>
            <a
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Liên hệ qua ${c.label}`}
              className="group flex items-center justify-end"
            >
              <span className={LABEL_CLASS}>{c.label}</span>
              <span className={ICON_CLASS} style={{ backgroundColor: c.bg }}>
                {c.icon}
              </span>
            </a>
          </li>
        ))}

        {/* Nút Trợ lý AI */}
        <li>
          <button
            type="button"
            onClick={() => setChatOpen((v) => !v)}
            aria-label={chatOpen ? "Đóng trợ lý AI" : "Mở trợ lý AI"}
            aria-expanded={chatOpen}
            className="group flex items-center justify-end"
          >
            <span className={LABEL_CLASS}>
              {chatOpen ? "Đóng trợ lý" : "Hỏi trợ lý AI"}
            </span>
            <span className="relative">
              {!chatOpen && (
                <span className="absolute inset-0 animate-ping rounded-full bg-moss opacity-30" />
              )}
              <span className={`${ICON_CLASS} relative bg-ink`}>
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 fill-white"
                  aria-hidden="true"
                >
                  <path d="M11 2l1.9 6.1L19 10l-6.1 1.9L11 18l-1.9-6.1L3 10l6.1-1.9L11 2z" />
                  <path d="M18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" />
                </svg>
              </span>
            </span>
          </button>
        </li>
      </ul>
    </>
  );
}
