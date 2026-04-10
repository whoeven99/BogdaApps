-- 同一店铺下 offer 名称唯一；若已有重复则保留 rowid 最小的一条
DELETE FROM "Offer"
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM "Offer" GROUP BY "shopName", "name"
);

CREATE UNIQUE INDEX "Offer_shopName_name_key" ON "Offer"("shopName", "name");
