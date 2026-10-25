// lib/vouchers.ts
// Kiểm tra voucher ở server: tồn tại, đúng loại, còn hạn, đủ đơn tối thiểu,
// còn lượt, khách chưa dùng. Đơn đã hủy không tính vào lượt dùng.

import type { Prisma, Voucher } from "../generated/prisma/client";

type Db = Prisma.TransactionClient;

export type VoucherSlot = "discount" | "shipping";

export type VoucherCheck =
  | { ok: true; voucher: Voucher }
  | { ok: false; message: string };

function fail(message: string): VoucherCheck {
  return { ok: false, message };
}

function money(n: number) {
  return `${n.toLocaleString("vi-VN")}đ`;
}

export function normalizeVoucherCode(code: string) {
  return code.trim().toUpperCase();
}

export async function findUsableVoucher(
  db: Db,
  input: {
    code: string;
    slot: VoucherSlot; // ô mà khách nhập mã vào
    customerId: number;
    subtotal: number; // tiền hàng, tính lại từ DB
  },
): Promise<VoucherCheck> {
  const code = normalizeVoucherCode(input.code);

  const voucher = await db.voucher.findUnique({ where: { code } });
  if (!voucher || !voucher.isActive) {
    return fail("Mã không tồn tại hoặc đã ngừng áp dụng");
  }

  if (voucher.type !== input.slot) {
    return fail(
      input.slot === "discount"
        ? "Đây là mã giảm phí ship, hãy nhập vào ô mã giảm phí ship"
        : "Đây là mã giảm tiền hàng, hãy nhập vào ô mã giảm tiền hàng",
    );
  }

  const now = new Date();
  if (voucher.startsAt && voucher.startsAt > now) {
    return fail("Mã chưa đến thời gian áp dụng");
  }
  if (voucher.expiresAt && voucher.expiresAt < now) {
    return fail("Mã đã hết hạn");
  }

  const minOrder = Number(voucher.minOrderValue);
  if (input.subtotal < minOrder) {
    return fail(`Đơn hàng cần từ ${money(minOrder)} để dùng mã này`);
  }

  // Mã nằm ở cột nào của đơn phụ thuộc loại voucher
  const voucherFilter =
    voucher.type === "discount"
      ? { discountVoucherId: voucher.id }
      : { shippingVoucherId: voucher.id };

  if (voucher.usageLimit !== null) {
    const used = await db.order.count({
      where: { status: { not: "cancelled" }, ...voucherFilter },
    });
    if (used >= voucher.usageLimit) {
      return fail("Mã đã hết lượt sử dụng");
    }
  }

  const usedByCustomer = await db.order.count({
    where: {
      customerId: input.customerId,
      status: { not: "cancelled" },
      ...voucherFilter,
    },
  });
  if (usedByCustomer > 0) {
    return fail("Bạn đã dùng mã này rồi");
  }

  return { ok: true, voucher };
}

// Kiểm tra cả hai ô mã của một đơn (ô nào để trống thì bỏ qua)
export async function resolveOrderVouchers(
  db: Db,
  input: {
    discountCode?: string | null;
    shippingCode?: string | null;
    customerId: number;
    subtotal: number;
  },
): Promise<
  | {
      ok: true;
      discountVoucher: Voucher | null;
      shippingVoucher: Voucher | null;
    }
  | { ok: false; field: "discountCode" | "shippingCode"; message: string }
> {
  let discountVoucher: Voucher | null = null;
  let shippingVoucher: Voucher | null = null;

  if (input.discountCode && input.discountCode.trim()) {
    const r = await findUsableVoucher(db, {
      code: input.discountCode,
      slot: "discount",
      customerId: input.customerId,
      subtotal: input.subtotal,
    });
    if (r.ok === false)
      return { ok: false, field: "discountCode", message: r.message };
    discountVoucher = r.voucher;
  }

  if (input.shippingCode && input.shippingCode.trim()) {
    const r = await findUsableVoucher(db, {
      code: input.shippingCode,
      slot: "shipping",
      customerId: input.customerId,
      subtotal: input.subtotal,
    });
    if (r.ok === false)
      return { ok: false, field: "shippingCode", message: r.message };
    shippingVoucher = r.voucher;
  }

  return { ok: true, discountVoucher, shippingVoucher };
}
