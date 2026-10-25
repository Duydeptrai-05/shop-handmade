import { z } from "zod";

// Chuỗi ngày giờ hợp lệ (client gửi ISO)
const dateString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Ngày giờ không hợp lệ");

// Không dùng .default() ở đây: giá trị mặc định (isActive = true, minOrderValue = 0)
// được đặt ở API, để PATCH không vô tình đặt lại các trường không gửi lên.
const voucherFields = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Mã phải có ít nhất 3 ký tự")
    .max(50, "Mã tối đa 50 ký tự")
    .regex(/^[A-Z0-9_-]+$/, "Mã chỉ gồm chữ không dấu, số, dấu - và _"),
  description: z.string().trim().max(255, "Mô tả tối đa 255 ký tự").nullish(),
  type: z.enum(["discount", "shipping"], {
    message: "Loại voucher không hợp lệ",
  }),
  discountKind: z.enum(["percent", "fixed"], {
    message: "Kiểu giảm không hợp lệ",
  }),
  value: z
    .number({ message: "Mức giảm phải là số" })
    .positive("Mức giảm phải lớn hơn 0"),
  maxDiscount: z
    .number({ message: "Mức giảm tối đa phải là số" })
    .positive("Mức giảm tối đa phải lớn hơn 0")
    .nullish(),
  minOrderValue: z
    .number({ message: "Đơn tối thiểu phải là số" })
    .min(0, "Đơn tối thiểu không được âm")
    .optional(),
  startsAt: dateString.nullish(),
  expiresAt: dateString.nullish(),
  usageLimit: z
    .number({ message: "Số lượt dùng phải là số" })
    .int("Số lượt dùng phải là số nguyên")
    .min(1, "Số lượt dùng tối thiểu là 1")
    .nullish(),
  isActive: z.boolean().optional(),
});

// Các luật cần xét nhiều trường cùng lúc. Trả về câu báo lỗi, hoặc null nếu hợp lệ.
// Dùng cho cả tạo mới (trong schema) lẫn sửa (API gộp dữ liệu cũ + mới rồi gọi hàm này).
export function checkVoucherRules(v: {
  discountKind: "percent" | "fixed";
  value: number;
  startsAt?: string | null;
  expiresAt?: string | null;
}): string | null {
  if (v.discountKind === "percent" && v.value > 100) {
    return "Giảm theo phần trăm không được quá 100%";
  }
  if (v.startsAt && v.expiresAt) {
    if (Date.parse(v.expiresAt) <= Date.parse(v.startsAt)) {
      return "Ngày hết hạn phải sau ngày bắt đầu";
    }
  }
  return null;
}

// Tạo mới
export const createVoucherSchema = voucherFields.superRefine((v, ctx) => {
  const message = checkVoucherRules(v);
  if (message) {
    ctx.addIssue({ code: "custom", message });
  }
});

// Sửa: không cho đổi mã, loại, kiểu giảm (đơn cũ đã gắn với voucher này).
// Mọi trường đều tùy chọn, chỉ gửi trường nào cần đổi.
export const updateVoucherSchema = voucherFields
  .omit({ code: true, type: true, discountKind: true })
  .partial();

export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;
export type UpdateVoucherInput = z.infer<typeof updateVoucherSchema>;
