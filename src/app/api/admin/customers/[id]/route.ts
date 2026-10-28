import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../../lib/auth";
import { logAudit } from "../../../../../../lib/audit"; // AUDIT

const actionSchema = z.object({
  action: z.enum(["lock", "unlock", "reset_password"], {
    message: "Hành động không hợp lệ",
  }),
});

// Mật khẩu tạm 10 ký tự, bỏ các ký tự dễ nhầm (0/O, 1/l/I)
function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars[randomInt(chars.length)];
  }
  return result;
}

async function requireAdmin() {
  const payload = await getAuthPayload();
  return payload && payload.role === "admin" ? payload : null;
}

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/admin/customers/[id]: chi tiết khách kèm các đơn
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await requireAdmin();
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập bằng tài khoản Admin" },
        { status: 401 },
      );
    }

    const id = parseId((await params).id);
    if (id === null) {
      return NextResponse.json(
        { success: false, message: "Mã khách hàng không hợp lệ" },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        _count: { select: { reviews: true } },
        orders: {
          orderBy: { id: "desc" },
          select: {
            id: true,
            status: true,
            paymentMethod: true,
            isPaid: true,
            createdAt: true,
            customerName: true,
            phone: true,
            address: true,
            orderItems: {
              select: {
                quantity: true,
                priceAtOrder: true,
                product: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy khách hàng" },
        { status: 404 },
      );
    }

    const orders = customer.orders.map((o) => ({
      id: o.id,
      status: o.status,
      paymentMethod: o.paymentMethod,
      isPaid: o.isPaid,
      createdAt: o.createdAt,
      customerName: o.customerName,
      phone: o.phone,
      address: o.address,
      total: o.orderItems.reduce(
        (s, i) => s + Number(i.priceAtOrder) * i.quantity,
        0,
      ),
      items: o.orderItems.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        price: Number(i.priceAtOrder),
      })),
    }));

    // Tổng tiền đã mua chỉ tính đơn chưa hủy
    const activeOrders = orders.filter((o) => o.status !== "cancelled");

    return NextResponse.json({
      success: true,
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        isActive: customer.isActive,
        reviewCount: customer._count.reviews,
        orderCount: activeOrders.length,
        totalSpent: activeOrders.reduce((s, o) => s + o.total, 0),
        orders,
      },
    });
  } catch (error) {
    console.error("ADMIN_CUSTOMER_DETAIL_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Đã có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}

// PATCH /api/admin/customers/[id]  body: { action: "lock" | "unlock" | "reset_password" }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await requireAdmin();
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập bằng tài khoản Admin" },
        { status: 401 },
      );
    }

    const id = parseId((await params).id);
    if (id === null) {
      return NextResponse.json(
        { success: false, message: "Mã khách hàng không hợp lệ" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, isActive: true, name: true },
    });
    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy khách hàng" },
        { status: 404 },
      );
    }

    // AUDIT: lấy Admin đang thao tác để ghi nhật ký
    const admin = await prisma.admin.findUnique({
      where: { id: payload.id },
      select: { id: true, username: true },
    });
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập bằng tài khoản Admin" },
        { status: 401 },
      );
    }

    const { action } = parsed.data;

    if (action === "lock" || action === "unlock") {
      const wantActive = action === "unlock";
      if (customer.isActive === wantActive) {
        return NextResponse.json(
          {
            success: false,
            message: wantActive
              ? "Tài khoản này đang hoạt động"
              : "Tài khoản này đã bị khóa trước đó",
          },
          { status: 409 },
        );
      }
      await prisma.$transaction(async (tx) => {
        await tx.customer.update({
          where: { id },
          data: { isActive: wantActive },
        });
        await logAudit(
          tx,
          { id: admin.id, username: admin.username },
          {
            action: wantActive ? "customer.unlock" : "customer.lock",
            entityType: "customer",
            entityId: id,
            summary: `${wantActive ? "Mở khóa" : "Khóa"} tài khoản khách "${customer.name}" (#${id})`,
          },
        );
      });
      return NextResponse.json({
        success: true,
        data: { id, isActive: wantActive },
      });
    }

    // reset_password: sinh mật khẩu tạm, chỉ trả về một lần
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id },
        data: { passwordHash },
      });
      // Không ghi mật khẩu tạm vào nhật ký
      await logAudit(
        tx,
        { id: admin.id, username: admin.username },
        {
          action: "customer.reset_password",
          entityType: "customer",
          entityId: id,
          summary: `Đặt lại mật khẩu cho khách "${customer.name}" (#${id})`,
        },
      );
    });
    return NextResponse.json({
      success: true,
      data: { id, tempPassword },
    });
  } catch (error) {
    console.error("ADMIN_CUSTOMER_UPDATE_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Đã có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
