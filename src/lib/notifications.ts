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
  onBehalfOfName?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const { userId, type = 'GENERAL', title, message, link, targetRole, onBehalfOfName } = params;

  const notification = await prisma.notification.create({
    data: { userId, type, title, message, link, targetRole, onBehalfOfName },
  });

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
    onBehalfOfName?: string;
  }>;
}

export async function createManyNotifications({ data }: CreateManyNotificationsParams) {
  const result = await prisma.notification.createMany({ data });

  for (const n of data) {
    sendPushToUser(n.userId, { title: n.title, body: n.message, url: n.link }).catch(() => {});
  }

  return result;
}

// ينشئ إشعاراً للمريض + نسخة لكل أولياء أموره المعتمدين
export async function createPatientNotification(
  patientUserId: number,
  params: Omit<CreateNotificationParams, 'userId' | 'targetRole'>
) {
  await createNotification({ ...params, userId: patientUserId, targetRole: 'PATIENT' });

  const patientRecord = await prisma.patient.findFirst({
    where: { userId: patientUserId },
    select: {
      guardians: {
        where: { status: 'APPROVED' },
        select: { guardianUserId: true },
      },
    },
  });

  if (!patientRecord?.guardians.length) return;

  const patientUser = await prisma.user.findUnique({
    where: { id: patientUserId },
    select: { name: true },
  });

  for (const g of patientRecord.guardians) {
    await createNotification({
      ...params,
      userId: g.guardianUserId,
      targetRole: 'PATIENT',
      onBehalfOfName: patientUser?.name ?? undefined,
    });
  }
}
