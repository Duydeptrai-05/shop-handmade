import type { Metadata } from "next";
import { Fraunces, Karla } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin", "vietnamese"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
});

const karla = Karla({
  subsets: ["latin", "vietnamese"],
  variable: "--font-body",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Cỏ May Handmade",
  description: "Shop đồ handmade — nến thơm, trang sức, quà tặng handmade",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body
        className={`${fraunces.variable} ${karla.variable} font-body bg-paper text-ink`}
      >
        {children}
      </body>
    </html>
  );
}
