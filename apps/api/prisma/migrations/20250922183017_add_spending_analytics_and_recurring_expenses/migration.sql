-- CreateTable
CREATE TABLE "public"."user_spending_analytics" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "average_monthly_spending" DECIMAL(10,2),
    "last_month_spending" DECIMAL(10,2),
    "current_month_spending" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_calculated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_spending_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recurring_expenses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "merchant_name" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" VARCHAR(50),
    "frequency" VARCHAR(20) NOT NULL,
    "last_occurrence_date" DATE,
    "predicted_next_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "confidence_score" DECIMAL(3,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_spending_analytics_user_id_key" ON "public"."user_spending_analytics"("user_id");

-- AddForeignKey
ALTER TABLE "public"."user_spending_analytics" ADD CONSTRAINT "user_spending_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_expenses" ADD CONSTRAINT "recurring_expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
