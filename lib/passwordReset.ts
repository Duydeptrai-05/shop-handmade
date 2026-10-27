import { createHash, randomBytes } from "crypto";
import nodemailer from "nodemailer";

export const RESET_TOKEN_TTL_MINUTES = 30;

// Băm mã bằng SHA-256, DB chỉ lưu bản băm này
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Tạo mã mới: "token" gửi cho khách, "tokenHash" lưu vào DB
export function createResetToken() {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
  };
}

export function buildResetLink(token: string): string {
  const base = process.env.APP_URL || "http://localhost:3000";
  return `${base}/reset-password?token=${token}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Có cấu hình Gmail thì gửi mail thật, chưa có thì in link ra terminal
export async function sendResetEmail(
  to: string,
  name: string,
  link: string,
): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.log(
      "\n[Quên mật khẩu] Chưa cấu hình Gmail, link đặt lại cho " + to + ":",
    );
    console.log(link + "\n");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"Cỏ May Handmade" <${user}>`,
    to,
    subject: "Đặt lại mật khẩu - Cỏ May Handmade",
    html: `
      <p>Chào ${escapeHtml(name)},</p>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu. Bấm vào link dưới đây để đặt mật khẩu mới
      (link dùng được một lần, hết hạn sau ${RESET_TOKEN_TTL_MINUTES} phút):</p>
      <p><a href="${link}">${link}</a></p>
      <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    `,
  });
}
