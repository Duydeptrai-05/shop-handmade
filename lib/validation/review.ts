import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z.coerce
    .number({ message: "Vui lòng chọn số sao" })
    .int("Số sao phải là số nguyên")
    .min(1, "Số sao tối thiểu là 1")
    .max(5, "Số sao tối đa là 5"),
  comment: z
    .string()
    .trim()
    .max(1000, "Nhận xét tối đa 1000 ký tự")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// Admin đổi trạng thái đánh giá: chỉ duyệt hoặc ẩn (không đưa về chờ duyệt)
export const updateReviewStatusSchema = z.object({
  status: z.enum(["approved", "hidden"]),
});
