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

// ===== Quên mật khẩu =====
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Liên kết không hợp lệ"),
  password: z
    .string()
    .min(6, "Mật khẩu tối thiểu 6 ký tự")
    .max(72, "Mật khẩu tối đa 72 ký tự"), // bcrypt chỉ xử lý tối đa 72 byte
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
