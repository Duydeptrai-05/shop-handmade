import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../lib/auth";
import { addressSchema } from "../../../../../lib/validation/address";

const MAX_ADDRESSES = 10;

const addressSelect = {
  id: true,
  recipientName: true,
  phone: true,
  address: true,
  isDefault: true,
} as const;

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

// GET /api/account/addresses: danh sách địa chỉ của khách, địa chỉ mặc định đứng đầu
export async function GET() {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "customer") {
      return fail("Vui lòng đăng nhập", 401);
    }

    const addresses = await prisma.address.findMany({
      where: { customerId: payload.id },
      orderBy: [{ isDefault: "desc" }, { id: "desc" }],
      select: addressSelect,
    });

    return NextResponse.json({ success: true, data: addresses });
  } catch {
    return fail("Có lỗi xảy ra, vui lòng thử lại sau", 500);
  }
}

// POST /api/account/addresses: thêm địa chỉ mới
// Địa chỉ đầu tiên tự thành mặc định; nếu gửi isDefault: true thì các địa chỉ cũ bỏ mặc định
export async function POST(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "customer") {
      return fail("Vui lòng đăng nhập", 401);
    }

    const body = await request.json().catch(() => null);
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message, 400);
    }

    const { recipientName, phone, address, isDefault } = parsed.data;
    const customerId = payload.id;

    const created = await prisma.$transaction(async (tx) => {
      // Khóa dòng của khách này để các yêu cầu thêm địa chỉ cùng lúc phải xếp hàng, tránh deadlock
      await tx.$queryRaw`SELECT id FROM customers WHERE id = ${customerId} FOR UPDATE`;

      const count = await tx.address.count({ where: { customerId } });
      if (count >= MAX_ADDRESSES) return null;

      const makeDefault = count === 0 || isDefault === true;
      if (makeDefault) {
        await tx.address.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          customerId,
          recipientName,
          phone,
          address,
          isDefault: makeDefault,
        },
        select: addressSelect,
      });
    });

    if (!created) {
      return fail(`Mỗi tài khoản chỉ lưu tối đa ${MAX_ADDRESSES} địa chỉ`, 400);
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("[addresses POST]", error);
    return fail("Có lỗi xảy ra, vui lòng thử lại sau", 500);
  }
}
