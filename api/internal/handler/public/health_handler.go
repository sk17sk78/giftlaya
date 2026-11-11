package public

import (
	"net/http"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/handler"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type HealthHandler struct {
	pool  *pgxpool.Pool
	redis *redis.Client
}

func NewHealthHandler(pool *pgxpool.Pool, redis *redis.Client) *HealthHandler {
	return &HealthHandler{pool: pool, redis: redis}
}

type HealthResponse struct {
	Status    string `json:"status"`
	Postgres  string `json:"postgres"`
	Redis     string `json:"redis"`
	Timestamp string `json:"timestamp"`
}

// Healthz godoc
// @Summary Service health check
// @Tags Public
// @Produce json
// @Success 200 {object} HealthResponse
// @Failure 503 {object} HealthResponse
// @Router /healthz [get]
func (h *HealthHandler) Healthz(w http.ResponseWriter, r *http.Request) {
	res := HealthResponse{
		Status:    "ok",
		Postgres:  "not_configured",
		Redis:     "not_configured",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
	code := http.StatusOK

	if h.pool != nil {
		if err := h.pool.Ping(r.Context()); err != nil {
			res.Postgres = "down"
			res.Status = "degraded"
			code = http.StatusServiceUnavailable
		} else {
			res.Postgres = "up"
		}
	}
	if h.redis != nil {
		if err := h.redis.Ping(r.Context()).Err(); err != nil {
			res.Redis = "down"
			res.Status = "degraded"
			code = http.StatusServiceUnavailable
		} else {
			res.Redis = "up"
		}
	}
	handler.WriteJSON(w, code, res)
}

