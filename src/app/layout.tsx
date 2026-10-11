import type { Metadata } from "next";
import { Fraunces, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../../lib/cart-context";
import Header from "../components/Header";
import Footer from "../components/Footer";

const fraunces = Fraunces({
  subsets: ["latin", "vietnamese"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
});

const beVietnamPro = Be_Vietnam_Pro({
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
        className={`${fraunces.variable} ${beVietnamPro.variable} font-body flex min-h-screen flex-col bg-paper text-ink`}
      >
        <CartProvider>
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
