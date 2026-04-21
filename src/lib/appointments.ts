import { prisma } from './prisma';

export async function expireFailedPayments(userId?: number) {
  const expired = await prisma.appointment.findMany({
    where: {
      status: 'PAYMENT_FAILED',
      retryDeadline: { lt: new Date() },
      ...(userId ? { userId } : {})
    },
    select: { id: true, slotId: true }
  });

  if (expired.length > 0) {
    await prisma.$transaction(async (tx) => {
      // release slots
      const slotIds = expired.map(e => e.slotId).filter((id): id is number => id !== null);
      if (slotIds.length > 0) {
        await tx.slot.updateMany({
          where: { id: { in: slotIds } },
          data: { isAvailable: true }
        });
      }
      
      // cancel appointments
      await tx.appointment.updateMany({
        where: { id: { in: expired.map(e => e.id) } },
        data: { status: 'CANCELLED' }
      });
    });
  }
}
