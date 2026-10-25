// lib/shipping.ts
// Phí ship và công thức tính tiền đơn hàng (dùng chung cho API và giao diện)

export const SHIPPING_FEE = 30000; // phí ship cố định mỗi đơn (đồng)

export type VoucherRule = {
  type: "discount" | "shipping";
  discountKind: "percent" | "fixed";
  value: number;
  maxDiscount: number | null;
  minOrderValue: number;
};

// Prisma trả Decimal dạng chuỗi nên phải Number() trước khi tính
export function toVoucherRule(v: {
  type: "discount" | "shipping";
  discountKind: "percent" | "fixed";
  value: unknown;
  maxDiscount: unknown;
  minOrderValue: unknown;
}): VoucherRule {
  return {
    type: v.type,
    discountKind: v.discountKind,
    value: Number(v.value),
    maxDiscount: v.maxDiscount == null ? null : Number(v.maxDiscount),
    minOrderValue: Number(v.minOrderValue),
  };
}

// Số tiền một voucher giảm được.
// - Voucher "discount" tính trên tiền hàng, voucher "shipping" tính trên phí ship
// - Chưa đủ đơn tối thiểu (tính trên tiền hàng) thì giảm 0
// - Không bao giờ giảm quá số tiền được áp dụng
export function calcVoucherDiscount(
  rule: VoucherRule,
  subtotal: number,
): number {
  if (subtotal < rule.minOrderValue) return 0;

  const base = rule.type === "discount" ? subtotal : SHIPPING_FEE;

  let amount =
    rule.discountKind === "percent"
      ? Math.floor((base * rule.value) / 100)
      : rule.value;

  if (rule.discountKind === "percent" && rule.maxDiscount !== null) {
    amount = Math.min(amount, rule.maxDiscount);
  }

  return Math.max(0, Math.min(amount, base));
}

export type OrderTotals = {
  subtotal: number; // tiền hàng
  shippingFee: number; // phí ship gốc
  discountAmount: number; // tiền hàng được giảm
  shippingDiscount: number; // phí ship được giảm
  total: number; // khách phải trả
};

export function calcOrderTotals(input: {
  subtotal: number;
  discountVoucher?: VoucherRule | null;
  shippingVoucher?: VoucherRule | null;
}): OrderTotals {
  const { subtotal, discountVoucher, shippingVoucher } = input;

  const discountAmount = discountVoucher
    ? calcVoucherDiscount(discountVoucher, subtotal)
    : 0;
  const shippingDiscount = shippingVoucher
    ? calcVoucherDiscount(shippingVoucher, subtotal)
    : 0;

  const total = subtotal - discountAmount + SHIPPING_FEE - shippingDiscount;

  return {
    subtotal,
    shippingFee: SHIPPING_FEE,
    discountAmount,
    shippingDiscount,
    total,
  };
}
