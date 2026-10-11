import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email không hợp lệ")
    .refine((v) => v.endsWith("@gmail.com"), {
      message: "Chỉ chấp nhận email @gmail.com",
    }),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
