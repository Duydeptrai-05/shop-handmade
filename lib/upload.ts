import { randomBytes } from "crypto";
import path from "path";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB
export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
export const UPLOAD_URL_PREFIX = "/uploads/";

export type ImageExt = "jpg" | "png" | "webp";

// Nhận dạng ảnh theo vài byte đầu của file (không tin đuôi file hay MIME do client gửi)
export function detectImageType(buf: Buffer): ImageExt | null {
  // JPEG: FF D8 FF
  if (
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  ) {
    return "jpg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }
  // WEBP: "RIFF" .... "WEBP"
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export type ImageCheck =
  | { ok: true; ext: ImageExt }
  | { ok: false; message: string };

// Kiểm tra dung lượng và loại file. Lưu ý: tsconfig không bật strict nên khi dùng kết quả
// phải viết `check.ok === false`, không viết `!check.ok`.
export function checkImage(buf: Buffer): ImageCheck {
  if (buf.length === 0) {
    return { ok: false, message: "File ảnh trống" };
  }
  if (buf.length > MAX_IMAGE_BYTES) {
    return { ok: false, message: "Ảnh quá lớn, tối đa 2MB" };
  }
  const ext = detectImageType(buf);
  if (!ext) {
    return { ok: false, message: "Chỉ nhận ảnh JPG, PNG hoặc WEBP" };
  }
  return { ok: true, ext };
}

// Tên file ngẫu nhiên, ví dụ 1761700000000-a1b2c3d4e5f6.jpg
export function randomImageName(ext: ImageExt): string {
  return `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
}
