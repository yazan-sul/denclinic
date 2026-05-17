import { prisma } from '@/lib/prisma';
import { sendPushToUser } from '@/lib/web-push';
import { NotificationType } from '@prisma/client';

interface CreateNotificationParams {
  userId: number;
  type?: NotificationType;
  title: string;
  message: string;
  link?: string;
  targetRole?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const { userId, type = 'GENERAL', title, message, link, targetRole } = params;

  const notification = await prisma.notification.create({
    data: { userId, type, title, message, link, targetRole },
  });

  // إرسال push في الخلفية — لا يوقف العملية إذا فشل
  sendPushToUser(userId, { title, body: message, url: link }).catch(() => {});

  return notification;
}

interface CreateManyNotificationsParams {
  data: Array<{
    userId: number;
    type?: NotificationType;
    title: string;
    message: string;
    link?: string;
    targetRole?: string;
  }>;
}

export async function createManyNotifications({ data }: CreateManyNotificationsParams) {
  const result = await prisma.notification.createMany({ data });

  // Push لكل مستخدم في الخلفية
  for (const n of data) {
    sendPushToUser(n.userId, {
      title: n.title,
      body: n.message,
      url: n.link,
    }).catch(() => {});
  }

  return result;
}
