import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../../lib/auth";
import { updateAddressSchema } from "../../../../../../lib/validation/address";

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

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PATCH /api/account/addresses/[id]: sửa thông tin hoặc đặt làm mặc định ({ "isDefault": true })
// Không cho bỏ mặc định trực tiếp: muốn đổi thì đặt địa chỉ khác làm mặc định
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "customer") {
      return fail("Vui lòng đăng nhập", 401);
    }

    const id = parseId((await params).id);
    if (id === null) return fail("Không tìm thấy địa chỉ", 404);

    const body = await request.json().catch(() => null);
    const parsed = updateAddressSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message, 400);
    }
    const data = parsed.data;
    const customerId = payload.id;

    const result = await prisma.$transaction(async (tx) => {
      // Khóa dòng của khách để các thao tác sửa/xóa địa chỉ cùng lúc phải xếp hàng
      await tx.$queryRaw`SELECT id FROM customers WHERE id = ${customerId} FOR UPDATE`;

      const current = await tx.address.findFirst({ where: { id, customerId } });
      if (!current) return { status: "not_found" as const };

      if (data.isDefault === false && current.isDefault) {
        return { status: "unset_default" as const };
      }

      if (data.isDefault === true) {
        await tx.address.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      }

      const updated = await tx.address.update({
        where: { id },
        data,
        select: addressSelect,
      });
      return { status: "ok" as const, updated };
    });

    if (result.status === "not_found")
      return fail("Không tìm thấy địa chỉ", 404);
    if (result.status === "unset_default") {
      return fail(
        "Hãy chọn một địa chỉ khác làm mặc định thay vì bỏ mặc định ở đây",
        400,
      );
    }

    return NextResponse.json({ success: true, data: result.updated });
  } catch (error) {
    console.error("[addresses PATCH]", error);
    return fail("Có lỗi xảy ra, vui lòng thử lại sau", 500);
  }
}

// DELETE /api/account/addresses/[id]: xóa địa chỉ
// Nếu xóa địa chỉ mặc định thì địa chỉ mới nhất còn lại được lên làm mặc định
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "customer") {
      return fail("Vui lòng đăng nhập", 401);
    }

    const id = parseId((await params).id);
    if (id === null) return fail("Không tìm thấy địa chỉ", 404);

    const customerId = payload.id;

    const found = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM customers WHERE id = ${customerId} FOR UPDATE`;

      const current = await tx.address.findFirst({ where: { id, customerId } });
      if (!current) return false;

      await tx.address.delete({ where: { id } });

      if (current.isDefault) {
        const next = await tx.address.findFirst({
          where: { customerId },
          orderBy: { id: "desc" },
        });
        if (next) {
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
      return true;
    });

    if (!found) return fail("Không tìm thấy địa chỉ", 404);

    return NextResponse.json({
      success: true,
      data: { message: "Đã xóa địa chỉ" },
    });
  } catch (error) {
    console.error("[addresses DELETE]", error);
    return fail("Có lỗi xảy ra, vui lòng thử lại sau", 500);
  }
}
