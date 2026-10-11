import { z } from "zod";

// Chuỗi rỗng -> null để khớp cột nullable trong DB
const optionalText = (max: number, msg: string) =>
  z
    .string()
    .trim()
    .max(max, msg)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên sản phẩm tối thiểu 2 ký tự")
    .max(255, "Tên sản phẩm tối đa 255 ký tự"),
  description: optionalText(2000, "Mô tả tối đa 2000 ký tự"),
  price: z.coerce
    .number({ message: "Giá phải là số" })
    .positive("Giá phải lớn hơn 0")
    .max(9_999_999_999, "Giá quá lớn"),
  stock: z.coerce
    .number({ message: "Tồn kho phải là số" })
    .int("Tồn kho phải là số nguyên")
    .min(0, "Tồn kho không được âm"),
  imageUrl: optionalText(500, "Đường dẫn ảnh tối đa 500 ký tự"),
  categoryId: z.coerce
    .number({ message: "Vui lòng chọn danh mục" })
    .int()
    .positive("Vui lòng chọn danh mục"),
});

// Khi sửa: chỉ gửi các trường cần đổi, thêm isActive để ẩn/hiện
export const updateProductSchema = productSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
