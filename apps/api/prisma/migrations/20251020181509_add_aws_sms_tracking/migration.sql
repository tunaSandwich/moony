-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "last_sms_message_id" TEXT,
ADD COLUMN     "last_sms_sent_at" TIMESTAMP(3),
ADD COLUMN     "sandbox_verified" BOOLEAN NOT NULL DEFAULT false;
