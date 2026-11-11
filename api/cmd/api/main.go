// Giftlaya E-Commerce & CMS v2 API
//
// @title Giftlaya E-Commerce & Admin CMS API
// @version 1.0
// @description Go backend API powering both the Giftlaya storefront (/api/v1/public/*) and the standalone Giftlaya CMS v2 admin dashboard (/api/v1/admin/*).
// @BasePath /
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/config"
	"github.com/giftlaya/giftlaya-api/internal/handler/public"
	"github.com/giftlaya/giftlaya-api/internal/jobs"
	"github.com/giftlaya/giftlaya-api/internal/notify"
	"github.com/giftlaya/giftlaya-api/internal/repository"
	"github.com/giftlaya/giftlaya-api/internal/server"
	"github.com/giftlaya/giftlaya-api/internal/service"
	"github.com/giftlaya/giftlaya-api/internal/storage"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("config load failed", "error", err)
		os.Exit(1)
	}

	ctx := context.Background()
	if cfg.DatabaseURL == "" {
		logger.Error("DATABASE_URL is required to run giftlaya-api")
		os.Exit(1)
	}

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("postgres connection failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		logger.Warn("postgres initial ping failed", "error", err)
	}

	var redisClient *redis.Client
	if cfg.RedisAddr != "" {
		redisClient = redis.NewClient(&redis.Options{
			Addr:     cfg.RedisAddr,
			Password: cfg.RedisPass,
			DB:       cfg.RedisDB,
		})
		if err := redisClient.Ping(ctx).Err(); err != nil {
			logger.Warn("redis ping failed, rate limiter falling back to memory", "error", err)
		}
	}

	repo := repository.NewPostgresRepo(pool)
	dashRepo := repository.NewDashboardRepo(pool)
	catRepo := repository.NewCatalogRepo(pool)
	ordRepo := repository.NewOrderRepo(pool)
	p2Repo := repository.NewPhase2Repo(pool)
	p3Repo := repository.NewPhase3Repo(pool)
	ordHelpers := service.NewPGRuntimeOrderHelpers(pool)

	var storeClient storage.Client
	if cfg.S3Endpoint != "" {
		storeClient = storage.NewS3CompatibleClient(cfg.S3Endpoint, cfg.S3Bucket, cfg.CDNBaseURL)
	} else {
		storeClient = storage.NewLocalDiskClient("./uploads", "http://localhost:"+cfg.AppPort)
	}
	asynqQueue := jobs.NewAsynqClient(cfg.RedisAddr, cfg.RedisPass, cfg.RedisDB, logger)
	defer asynqQueue.Close()

	limiter := repository.NewRedisRateLimiter(redisClient)
	notifier := notify.NewLogNotifier(logger)
	tokens := service.NewTokenManager(cfg.JWTAccessSecret, cfg.AccessTokenTTL)
	auditSvc := service.NewAuditService(repo, logger)
	authSvc := service.NewAuthService(repo, limiter, auditSvc, tokens, notifier, cfg.RefreshTokenTTL, cfg.TOTPEncKey, cfg.TOTPIssuer)
	rbacSvc := service.NewRBACService(repo, auditSvc)
	dashSvc := service.NewDashboardService(dashRepo)
	catSvc := service.NewCatalogService(catRepo, auditSvc)
	ordSvc := service.NewOrderService(ordRepo, ordHelpers, ordHelpers, auditSvc, notifier)
	p2Svc := service.NewPhase2Service(p2Repo, auditSvc, cfg.RazorpayWebhookSecret)
	p3Svc := service.NewPhase3Service(p3Repo, storeClient, asynqQueue, auditSvc)
	sfHandler := public.NewStorefrontHandler(pool, catSvc, ordSvc, p2Svc, p3Svc, tokens, notifier)
	healthH := public.NewHealthHandler(pool, redisClient)

	router := server.NewRouter(server.Dependencies{
		Config:            cfg,
		Logger:            logger,
		RateLimiter:       limiter,
		TokenManager:      tokens,
		AuthService:       authSvc,
		RBACService:       rbacSvc,
		AuditService:      auditSvc,
		DashboardService:  dashSvc,
		CatalogService:    catSvc,
		OrderService:      ordSvc,
		Phase2Service:     p2Svc,
		Phase3Service:     p3Svc,
		StorefrontHandler: sfHandler,
		HealthHandler:     healthH,
	})

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%s", cfg.AppPort),
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		logger.Info("giftlaya-api listening", "port", cfg.AppPort, "env", cfg.AppEnv)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("http server failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	logger.Info("shutting down gracefully")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown error", "error", err)
	}
	if redisClient != nil {
		_ = redisClient.Close()
	}
}

