import { z } from "zod";

// Giới hạn dùng chung cho form (client) và API (server)
export const CUSTOM_REQUEST_MAX_QUANTITY = 100;
export const CUSTOM_REQUEST_MAX_MONEY = 100_000_000; // 100 triệu VND, khớp Decimal(12, 2)

// Ảnh tham khảo chỉ nhận đường dẫn do API upload trả về, không nhận link ngoài
const referenceImageUrl = z
  .string()
  .regex(/^\/uploads\/[A-Za-z0-9._-]+$/, "Ảnh tham khảo không hợp lệ")
  .max(500);

const money = (label: string) =>
  z
    .number({ message: `${label} phải là số` })
    .min(0, `${label} không được âm`)
    .max(CUSTOM_REQUEST_MAX_MONEY, `${label} quá lớn`);

// ---------- Khách gửi yêu cầu mới ----------
export const createCustomRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Tên món cần ít nhất 3 ký tự")
    .max(255, "Tên món tối đa 255 ký tự"),
  description: z
    .string()
    .trim()
    .min(10, "Hãy mô tả chi tiết hơn (ít nhất 10 ký tự)")
    .max(2000, "Mô tả tối đa 2000 ký tự"),
  quantity: z
    .number({ message: "Số lượng phải là số" })
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng tối thiểu là 1")
    .max(
      CUSTOM_REQUEST_MAX_QUANTITY,
      `Số lượng tối đa ${CUSTOM_REQUEST_MAX_QUANTITY}`,
    ),
  budget: money("Ngân sách").nullable().optional(),
  referenceImageUrl: referenceImageUrl.nullable().optional(),
});

export type CreateCustomRequestInput = z.infer<
  typeof createCustomRequestSchema
>;

// ---------- Khách trả lời / hủy ----------
// accept  : đồng ý báo giá (chỉ khi status = quoted)
// decline : từ chối báo giá (chỉ khi status = quoted)
// cancel  : hủy yêu cầu (chỉ khi status = pending hoặc quoted)
export const customerRespondSchema = z.object({
  action: z.enum(["accept", "decline", "cancel"], {
    message: "Hành động không hợp lệ",
  }),
});

export type CustomerRespondInput = z.infer<typeof customerRespondSchema>;

// ---------- Admin xử lý ----------
// quote    : báo giá (pending -> quoted), bắt buộc có quotedPrice
// reject   : từ chối làm (pending -> rejected), bắt buộc có adminNote
// start    : bắt đầu làm (accepted -> in_progress)
// complete : hoàn thành (in_progress -> completed)
export const adminRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("quote"),
    quotedPrice: money("Giá báo").refine(
      (v) => v > 0,
      "Giá báo phải lớn hơn 0",
    ),
    adminNote: z
      .string()
      .trim()
      .max(1000, "Ghi chú tối đa 1000 ký tự")
      .optional(),
  }),
  z.object({
    action: z.literal("reject"),
    adminNote: z
      .string()
      .trim()
      .min(3, "Hãy ghi lý do từ chối")
      .max(1000, "Ghi chú tối đa 1000 ký tự"),
  }),
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("complete") }),
]);

export type AdminRequestInput = z.infer<typeof adminRequestSchema>;
