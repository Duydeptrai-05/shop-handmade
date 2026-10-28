import { prisma } from "./prisma";
import { logStockMovement } from "./stock"; // STOCK

// Thời hạn chuyển khoản (phút). Đang để 1 để test, xong phải đổi lại 15.
export const BANK_TRANSFER_TIMEOUT_MINUTES = 15;

/**
 * Hủy các đơn chuyển khoản chưa thanh toán quá hạn và hoàn kho.
 * Trả về số đơn đã hủy.
 */
export async function cancelExpiredBankOrders(): Promise<number> {
  const deadline = new Date(
    Date.now() - BANK_TRANSFER_TIMEOUT_MINUTES * 60 * 1000,
  );

  const expired = await prisma.order.findMany({
    where: {
      paymentMethod: "bank_transfer",
      isPaid: false,
      status: "pending",
      createdAt: { lt: deadline },
    },
    select: { id: true },
  });

  let cancelled = 0;

  for (const { id } of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        // Chỉ hủy nếu đơn vẫn còn đúng điều kiện (tránh trùng với Admin xác nhận cùng lúc)
        const result = await tx.order.updateMany({
          where: {
            id,
            paymentMethod: "bank_transfer",
            isPaid: false,
            status: "pending",
          },
          data: { status: "cancelled" },
        });

        if (result.count === 0) return;

        const items = await tx.orderItem.findMany({
          where: { orderId: id },
          select: { productId: true, quantity: true },
        });

        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });

          // STOCK: ghi lịch sử hoàn kho, cùng transaction
          await logStockMovement(tx, {
            productId: item.productId,
            change: item.quantity,
            reason: "cancel_restore",
            orderId: id,
            note: "Đơn chuyển khoản quá hạn, tự hủy",
          });
        }

        cancelled += 1;
      });
    } catch (error) {
      // Một đơn lỗi không được làm hỏng cả request đang gọi hàm này
      console.error(`Không hủy được đơn quá hạn #${id}`, error);
    }
  }

  return cancelled;
}
