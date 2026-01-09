-- AlterTable: Add isTotal column and make categoryId nullable
ALTER TABLE "budgets" ADD COLUMN "isTotal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "budgets" ALTER COLUMN "categoryId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "budgets_userId_month_year_isTotal_key" ON "budgets"("userId", "month", "year", "isTotal");
