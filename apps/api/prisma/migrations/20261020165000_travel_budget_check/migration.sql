-- Custom constraints that Prisma schema cannot express.
-- 预算区间必须有序：只允许一侧为空（表示不设下限 / 上限）。
ALTER TABLE "TravelInfo" ADD CONSTRAINT "travel_budget_range"
  CHECK ("budgetMin" IS NULL OR "budgetMax" IS NULL OR "budgetMin" <= "budgetMax");
