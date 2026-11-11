-- name: GetSidebarCounts :one
SELECT
  (SELECT COUNT(*)::INT FROM orders WHERE deleted_at IS NULL) AS orders_total,
  (SELECT COUNT(*)::INT FROM orders WHERE deleted_at IS NULL AND status = 'placed') AS orders_new,
  (SELECT COUNT(*)::INT FROM orders WHERE deleted_at IS NULL AND status IN ('confirmed', 'assigned', 'out_for_delivery')) AS orders_processing,
  (SELECT COUNT(*)::INT FROM orders WHERE deleted_at IS NULL AND status = 'delivered') AS orders_delivered,
  (SELECT COUNT(*)::INT FROM orders WHERE deleted_at IS NULL AND payment_status = 'failed') AS orders_failed,
  (SELECT COUNT(*)::INT FROM orders WHERE deleted_at IS NULL AND status IN ('cancelled', 'refunded')) AS orders_cancelled,
  (SELECT COUNT(*)::INT FROM customers WHERE deleted_at IS NULL) AS customers_total,
  (SELECT COUNT(*)::INT FROM contact_inquiries WHERE inquiry_type = 'contact') AS contact_total,
  (SELECT COUNT(*)::INT FROM contact_inquiries WHERE inquiry_type = 'contact' AND status = 'new') AS contact_new,
  (SELECT COUNT(*)::INT FROM contact_inquiries WHERE inquiry_type = 'product_inquiry') AS inquiry_total,
  (SELECT COUNT(*)::INT FROM contact_inquiries WHERE inquiry_type = 'product_inquiry' AND status = 'new') AS inquiry_new,
  (SELECT COALESCE(SUM(unread_count), 0)::INT FROM whatsapp_contacts) AS whatsapp_unread,
  (SELECT COUNT(*)::INT FROM support_tickets) AS support_total,
  (SELECT COUNT(*)::INT FROM support_tickets WHERE status = 'open') AS support_open,
  (SELECT COUNT(*)::INT FROM contact_inquiries WHERE inquiry_type = 'seller_request' AND status = 'new') AS seller_requests,
  (SELECT COUNT(*)::INT FROM products WHERE deleted_at IS NULL AND status = 'pending_approval') AS seller_products,
  (SELECT COUNT(*)::INT FROM seller_payouts WHERE status = 'pending') AS seller_payouts,
  (SELECT COUNT(*)::INT FROM support_tickets WHERE source_type = 'seller' AND status = 'open') AS seller_tickets;

