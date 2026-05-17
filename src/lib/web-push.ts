import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

let vapidInitialized = false;

function ensureVapid() {
  if (vapidInitialized) return;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    throw new Error('VAPID env vars missing: VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY');
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidInitialized = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export async function sendPushToUser(userId: number, payload: PushPayload) {
  ensureVapid();
  const tokens = await prisma.deviceToken.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (tokens.length === 0) return;

  const results = await Promise.allSettled(
    tokens.map((t) =>
      webpush.sendNotification(
        { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
        JSON.stringify(payload)
      )
    )
  );

  const expiredIds: string[] = [];
  (results as PromiseSettledResult<unknown>[]).forEach((result, i) => {
    if (result.status === 'rejected') {
      const err = result.reason as { statusCode?: number };
      if (err.statusCode === 410 || err.statusCode === 404) {
        expiredIds.push(tokens[i].id);
      }
    }
  });

  if (expiredIds.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { id: { in: expiredIds } } });
  }
}

export async function sendPushToRole(
  targetRole: UserRole,
  payload: PushPayload,
  branchId?: number
) {
  const users = await prisma.user.findMany({
    where: {
      roles: { has: targetRole },
      ...(branchId
        ? {
            OR: [
              { staffProfiles: { some: { branchId } } },
              { doctorProfiles: { some: { branchId } } },
            ],
          }
        : {}),
    },
    select: { id: true },
  });

  await Promise.allSettled(users.map((u) => sendPushToUser(u.id, payload)));
}
