import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getAuthPayload } from "../../../../../lib/auth";
import {
  MAX_IMAGE_BYTES,
  UPLOAD_DIR,
  UPLOAD_URL_PREFIX,
  checkImage,
  randomImageName,
} from "../../../../../lib/upload";

export const runtime = "nodejs";

// Khách upload ảnh tham khảo cho yêu cầu đặt làm
export async function POST(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "customer") {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập để tải ảnh lên" },
        { status: 401 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn một file ảnh" },
        { status: 400 },
      );
    }

    // Chặn sớm theo dung lượng khai báo, trước khi đọc file vào bộ nhớ
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { success: false, message: "Ảnh quá lớn, tối đa 2MB" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const check = checkImage(buffer);
    if (check.ok === false) {
      return NextResponse.json(
        { success: false, message: check.message },
        { status: 400 },
      );
    }

    const fileName = randomImageName(check.ext);
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, fileName), buffer);

    return NextResponse.json({
      success: true,
      data: { url: `${UPLOAD_URL_PREFIX}${fileName}` },
    });
  } catch (error) {
    console.error("POST /api/custom-requests/upload error:", error);
    return NextResponse.json(
      { success: false, message: "Không tải được ảnh, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
