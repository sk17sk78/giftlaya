-- name: CreateAuditLog :one
INSERT INTO audit_logs (
  actor_type, actor_id, actor_username, module, action,
  entity_type, entity_id, request_id, ip_address, before_json, after_json
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
)
RETURNING *;

-- name: ListAuditLogs :many
SELECT * FROM audit_logs
WHERE (sqlc.narg('module')::TEXT IS NULL OR module = sqlc.narg('module'))
  AND (sqlc.narg('actor_id')::BIGINT IS NULL OR actor_id = sqlc.narg('actor_id'))
ORDER BY created_at DESC, id DESC
LIMIT $1 OFFSET $2;

-- name: CountAuditLogs :one
SELECT COUNT(*)::BIGINT AS total
FROM audit_logs
WHERE (sqlc.narg('module')::TEXT IS NULL OR module = sqlc.narg('module'))
  AND (sqlc.narg('actor_id')::BIGINT IS NULL OR actor_id = sqlc.narg('actor_id'));

