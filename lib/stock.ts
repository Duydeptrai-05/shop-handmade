import { prisma } from "./prisma";

// Kiểu của client trong $transaction, lấy trực tiếp từ prisma nên không phụ thuộc đường dẫn generated
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type StockReason = "import" | "sale" | "cancel_restore" | "adjustment";

type LogInput = {
  productId: number;
  change: number; // dương = kho tăng, âm = kho giảm
  reason: StockReason;
  orderId?: number | null;
  note?: string | null;
};

/**
 * Ghi một dòng lịch sử tồn kho.
 * Gọi SAU KHI đã cập nhật `product.stock`, trong cùng transaction,
 * để `stockAfter` đọc đúng số tồn mới nhất.
 */
export async function logStockMovement(tx: Tx, input: LogInput) {
  const product = await tx.product.findUnique({
    where: { id: input.productId },
    select: { stock: true },
  });
  if (!product) return;

  await tx.stockMovement.create({
    data: {
      productId: input.productId,
      orderId: input.orderId ?? null,
      change: input.change,
      stockAfter: product.stock,
      reason: input.reason,
      note: input.note ?? null,
    },
  });
}
