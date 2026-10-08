-- Only fictional browser QA fixtures, on the explicitly selected local database.
SELECT jsonb_pretty(jsonb_build_object(
  'products', (SELECT jsonb_agg(jsonb_build_object('sku',sku,'stock',stock::text,'costPrice',"costPrice"::text)) FROM "Product" WHERE sku IN ('COMPRA-QA-001','COMPRA-QA-002')),
  'orders', (SELECT jsonb_agg(jsonb_build_object('number',o.number,'status',o.status,'revision',o.revision,'quantity',i.quantity::text,'received',i.received::text,'receipts',(SELECT count(*) FROM "PurchaseReceipt" r WHERE r."orderId"=o.id))) FROM "PurchaseOrder" o JOIN "PurchaseOrderItem" i ON i."orderId"=o.id JOIN "Product" p ON p.id=i."productId" WHERE p.sku IN ('COMPRA-QA-001','COMPRA-QA-002')),
  'movements', (SELECT jsonb_agg(jsonb_build_object('sku',p.sku,'quantity',m.quantity::text,'before',m."previousStock"::text,'after',m."resultingStock"::text,'receiptId',m.reference,'author',u.name)) FROM "StockMovement" m JOIN "Product" p ON p.id=m."productId" JOIN "User" u ON u.id=m."userId" WHERE p.sku IN ('COMPRA-QA-001','COMPRA-QA-002')),
  'migrationApplied', (SELECT count(*)=1 FROM "_prisma_migrations" WHERE migration_name='20261008000000_suppliers_purchases' AND finished_at IS NOT NULL)
));
