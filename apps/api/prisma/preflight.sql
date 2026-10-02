-- Read-only checks before applying the operational inventory migration.
-- Each query must return zero rows. Review findings; never auto-delete or reset.
SELECT lower("sku") AS sku, count(*) FROM "Product"
GROUP BY lower("sku") HAVING count(*) > 1;
SELECT "id", "sku" FROM "Product" WHERE "stock" < 0 OR "minimumStock" < 0
OR "costPrice" < 0 OR "salePrice" < 0;
SELECT "id" FROM "StockMovement" WHERE "quantity" <= 0
OR "previousStock" < 0 OR "resultingStock" < 0;
