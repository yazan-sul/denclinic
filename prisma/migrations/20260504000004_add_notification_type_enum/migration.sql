-- Alter Notification.type column from TEXT to NotificationType enum
-- Drop default first (PostgreSQL requires this for type changes)
ALTER TABLE "Notification" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Notification"
  ALTER COLUMN "type" TYPE "NotificationType"
  USING "type"::"NotificationType";
ALTER TABLE "Notification" ALTER COLUMN "type" SET DEFAULT 'GENERAL'::"NotificationType";
