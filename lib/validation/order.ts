import { z } from "zod";

// Hai phương thức thanh toán, trùng với enum PaymentMethod trong Prisma
export const PAYMENT_METHODS = ["cod", "bank_transfer"] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

export const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

export const createOrderSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên người nhận")
    .max(255),
  phone: z.string().trim().min(9, "Số điện thoại không hợp lệ").max(20),
  address: z.string().trim().min(1, "Vui lòng nhập địa chỉ giao hàng").max(500),
  paymentMethod: z
    .enum(PAYMENT_METHODS, { message: "Phương thức thanh toán không hợp lệ" })
    .default("cod"),
  discountCode: z.string().trim().max(50).nullish(), // mã giảm tiền hàng
  shippingCode: z.string().trim().max(50).nullish(), // mã giảm phí ship
  items: z.array(orderItemSchema).min(1, "Giỏ hàng đang trống"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// Khách sửa đơn: hủy đơn hoặc đổi thông tin nhận hàng
export const updateOrderSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel") }),
  z.object({
    action: z.literal("update_address"),
    customerName: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập tên người nhận")
      .max(255),
    phone: z.string().trim().min(9, "Số điện thoại không hợp lệ").max(20),
    address: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập địa chỉ giao hàng")
      .max(500),
  }),
]);

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
