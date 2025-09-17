-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "invite_code" TEXT NOT NULL,
    "plaid_access_token" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "opt_out_status" TEXT NOT NULL DEFAULT 'opted_in',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."spending_goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "monthly_limit" DECIMAL(10,2) NOT NULL,
    "month_start_day" INTEGER NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spending_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."daily_messages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "spending_goal_id" TEXT NOT NULL,
    "message_date" DATE NOT NULL,
    "message_type" TEXT NOT NULL,
    "message_data" JSONB NOT NULL,
    "sent_at" TIMESTAMP(3),
    "delivery_status" TEXT NOT NULL DEFAULT 'pending',
    "twilio_message_sid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_invite_code_key" ON "public"."users"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "public"."users"("phone_number");

-- AddForeignKey
ALTER TABLE "public"."spending_goals" ADD CONSTRAINT "spending_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_messages" ADD CONSTRAINT "daily_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_messages" ADD CONSTRAINT "daily_messages_spending_goal_id_fkey" FOREIGN KEY ("spending_goal_id") REFERENCES "public"."spending_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
