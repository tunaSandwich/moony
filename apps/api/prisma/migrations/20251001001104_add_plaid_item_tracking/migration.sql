-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "plaid_connected_at" TIMESTAMP(3),
ADD COLUMN     "plaid_item_id" TEXT;
