import { prisma } from "./db";
import { sendSms } from "./sms";

type Notice = {
  title: string;
  body: string;
  link?: string;
  /** Also text the user. Use for things they must act on or would want to know away from the site. */
  sms?: boolean;
};

/** Records an in-app notification (and optionally an SMS). Never throws: a failed notice must not fail the action. */
export async function notify(userIds: string | string[], notice: Notice) {
  const ids = [...new Set(Array.isArray(userIds) ? userIds : [userIds])];
  if (ids.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: ids.map((userId) => ({ userId, title: notice.title, body: notice.body, link: notice.link })),
    });
    if (notice.sms) {
      const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { phone: true } });
      const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
      const text = `SparesHub: ${notice.body}${notice.link && base ? ` ${base}${notice.link}` : ""}`;
      await Promise.all(users.filter((u) => u.phone).map((u) => sendSms(u.phone!, text)));
    }
  } catch (error) {
    console.error("notify failed", error);
  }
}

export async function adminIds() {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  return admins.map((a) => a.id);
}
