import { NextResponse } from "next/server";
import { clearAuthCookie } from "../../../../../lib/auth";

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: "Đã đăng xuất",
    });
    clearAuthCookie(response);
    return response;
  } catch (error) {
    console.error("LOGOUT_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Đã có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
