-- Output only counts and opaque fingerprints; never export row data or secrets.
SELECT jsonb_build_object(
 'User',(SELECT jsonb_build_object('count',count(*),'fingerprint',md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY id),''))) FROM "User" t),
 'Category',(SELECT jsonb_build_object('count',count(*),'fingerprint',md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY id),''))) FROM "Category" t),
 'Product',(SELECT jsonb_build_object('count',count(*),'fingerprint',md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY id),''))) FROM "Product" t),
 'StockMovement',(SELECT jsonb_build_object('count',count(*),'fingerprint',md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY id),''))) FROM "StockMovement" t)
);
