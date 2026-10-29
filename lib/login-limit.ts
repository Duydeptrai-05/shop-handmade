// Giới hạn đăng nhập sai: dùng chung cho Customer và Admin.
export const MAX_FAILED_LOGINS = 5; // sai liên tiếp bao nhiêu lần thì khóa
export const LOCK_MINUTES = 15; // khóa bao nhiêu phút

export type LoginKind = "customer" | "admin";

// Prisma client hoặc tx trong $transaction (cùng cách với logAudit)
type Db = any;

function table(db: Db, kind: LoginKind) {
  return kind === "customer" ? db.customer : db.admin;
}

// Còn bao nhiêu phút bị khóa? Trả 0 nếu không khóa hoặc đã hết hạn khóa.
export function lockMinutesLeft(lockedUntil: Date | null | undefined): number {
  if (!lockedUntil) return 0;
  const ms = new Date(lockedUntil).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 60000);
}

// Câu báo khi đang bị khóa
export function lockedMessage(minutes: number): string {
  return `Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`;
}

export type FailResult = {
  locked: boolean; // lần sai này vừa gây ra khóa
  minutes: number; // số phút khóa (nếu locked)
  remaining: number; // còn mấy lần thử trước khi bị khóa (nếu chưa khóa)
};

// Gọi khi nhập sai mật khẩu
export async function registerFailedLogin(
  db: Db,
  kind: LoginKind,
  id: number,
): Promise<FailResult> {
  const t = table(db, kind);

  const updated = await t.update({
    where: { id },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  });

  if (updated.failedLoginCount >= MAX_FAILED_LOGINS) {
    const until = new Date(Date.now() + LOCK_MINUTES * 60000);
    await t.update({
      where: { id },
      data: { failedLoginCount: 0, lockedUntil: until },
    });
    return { locked: true, minutes: LOCK_MINUTES, remaining: 0 };
  }

  return {
    locked: false,
    minutes: 0,
    remaining: MAX_FAILED_LOGINS - updated.failedLoginCount,
  };
}

// Gọi khi đăng nhập đúng: xóa bộ đếm và mở khóa
export async function clearFailedLogin(
  db: Db,
  kind: LoginKind,
  id: number,
): Promise<void> {
  await table(db, kind).update({
    where: { id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
}
