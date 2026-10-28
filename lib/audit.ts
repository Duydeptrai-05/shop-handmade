import { Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma";

// Nhận cả prisma thường lẫn tx trong $transaction,
// để log được ghi cùng transaction với thao tác chính (cùng thành công hoặc cùng thất bại).
type Db = Prisma.TransactionClient | typeof prisma;

export type AuditActor = {
  id: number;
  username: string;
};

export type AuditEntry = {
  action: string; // ví dụ "order.cancel", "product.update"
  entityType: string; // "order" | "product" | "customer" | "voucher" | "review"
  entityId?: number | null;
  summary: string; // mô tả ngắn bằng tiếng Việt
};

export async function logAudit(db: Db, actor: AuditActor, entry: AuditEntry) {
  await db.auditLog.create({
    data: {
      adminId: actor.id,
      adminUsername: actor.username,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      summary: entry.summary.slice(0, 500),
    },
  });
}
