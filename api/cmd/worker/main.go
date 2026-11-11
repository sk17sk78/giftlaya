package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/giftlaya/giftlaya-api/internal/config"
	"github.com/giftlaya/giftlaya-api/internal/jobs"
	"github.com/giftlaya/giftlaya-api/internal/notify"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg, err := config.Load()
	if err != nil {
		logger.Error("config load failed", "error", err)
		os.Exit(1)
	}
	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		logger.Error("postgres connect failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	notifier := notify.NewLogNotifier(logger)
	w := jobs.NewWorker(cfg.RedisAddr, cfg.RedisPass, cfg.RedisDB, pool, notifier, logger)
	logger.Info("giftlaya-worker starting asynq consumer")
	if err := w.Start(); err != nil {
		logger.Error("worker stopped", "error", err)
		os.Exit(1)
	}
}

