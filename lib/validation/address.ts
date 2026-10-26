import { z } from "zod";

const PHONE_REGEX = /^(0|\+84)\d{9,10}$/;

export const addressSchema = z.object({
  recipientName: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên người nhận")
    .max(255, "Tên người nhận quá dài"),
  phone: z.string().trim().regex(PHONE_REGEX, "Số điện thoại không hợp lệ"),
  address: z
    .string()
    .trim()
    .min(5, "Địa chỉ quá ngắn, vui lòng nhập đầy đủ")
    .max(500, "Địa chỉ quá dài"),
  isDefault: z.boolean().optional(),
});

// Dùng cho PATCH ở bước 3b: gửi trường nào sửa trường đó, nhưng phải có ít nhất một trường
export const updateAddressSchema = addressSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Không có thông tin nào để cập nhật",
  });

export type AddressInput = z.infer<typeof addressSchema>;
