-- 与 prisma/migrations/20261118120000_billing_pools/migration.sql 中 PlanCatalog 种子相同，供重跑。
INSERT OR IGNORE INTO "PlanCatalog" ("planKey", "kind", "billingInterval", "displayName", "credits", "priceAmount", "currencyCode", "trialDays", "shopifyPlanName", "sortOrder", "enabled") VALUES
  ('basic_monthly', 'SUBSCRIPTION', 'MONTHLY', 'Basic', 200000, '9.99', 'USD', 0, 'Basic', 10, 1),
  ('basic_annual', 'SUBSCRIPTION', 'ANNUAL', 'Basic', 200000, '7.99', 'USD', 0, 'Basic', 11, 1),
  ('pro_monthly', 'SUBSCRIPTION', 'MONTHLY', 'Pro', 600000, '29.99', 'USD', 5, 'Pro', 20, 1),
  ('pro_annual', 'SUBSCRIPTION', 'ANNUAL', 'Pro', 600000, '23.99', 'USD', 5, 'Pro', 21, 1),
  ('premium_monthly', 'SUBSCRIPTION', 'MONTHLY', 'Premium', 1600000, '79.99', 'USD', 5, 'Premium', 30, 1),
  ('premium_annual', 'SUBSCRIPTION', 'ANNUAL', 'Premium', 1600000, '63.99', 'USD', 5, 'Premium', 31, 1),
  ('pack_50', 'ONE_TIME_PACK', NULL, '50 extra times', 100000, '3.99', 'USD', NULL, '50 extra times', 100, 1),
  ('pack_100', 'ONE_TIME_PACK', NULL, '100 extra times', 200000, '7.99', 'USD', NULL, '100 extra times', 101, 1),
  ('pack_200', 'ONE_TIME_PACK', NULL, '200 extra times', 400000, '15.99', 'USD', NULL, '200 extra times', 102, 1),
  ('pack_300', 'ONE_TIME_PACK', NULL, '300 extra times', 600000, '23.99', 'USD', NULL, '300 extra times', 103, 1),
  ('pack_500', 'ONE_TIME_PACK', NULL, '500 extra times', 1000000, '39.99', 'USD', NULL, '500 extra times', 104, 1),
  ('pack_1000', 'ONE_TIME_PACK', NULL, '1000 extra times', 2000000, '79.99', 'USD', NULL, '1000 extra times', 105, 1),
  ('pack_2000', 'ONE_TIME_PACK', NULL, '2000 extra times', 4000000, '159.99', 'USD', NULL, '2000 extra times', 106, 1),
  ('pack_3000', 'ONE_TIME_PACK', NULL, '3000 extra times', 6000000, '239.99', 'USD', NULL, '3000 extra times', 107, 1);
