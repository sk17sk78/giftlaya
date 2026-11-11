package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	AppName            string
	AppEnv             string
	AppPort            string
	CORSAllowedOrigins []string

	DatabaseURL string
	RedisAddr   string
	RedisPass   string
	RedisDB     int

	JWTAccessSecret  string
	JWTRefreshSecret string
	AccessTokenTTL   time.Duration
	RefreshTokenTTL  time.Duration
	TOTPEncKey       string
	TOTPIssuer       string

	S3Endpoint string
	S3Region   string
	S3Bucket   string
	S3Access   string
	S3Secret   string
	S3UseSSL   bool
	CDNBaseURL string

	RazorpayWebhookSecret string

	SeedAdminUsername   string
	SeedAdminEmail      string
	SeedAdminPassword   string
	SeedAdminAccessCode string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	originsRaw := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
	var origins []string
	for _, o := range strings.Split(originsRaw, ",") {
		if trimmed := strings.TrimSpace(o); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}

	accessTTLMin := getEnvInt("ACCESS_TOKEN_TTL_MIN", 15)
	refreshTTLHours := getEnvInt("REFRESH_TOKEN_TTL_HOURS", 168)

	cfg := &Config{
		AppName:             getEnv("APP_NAME", "giftlaya-api"),
		AppEnv:              getEnv("APP_ENV", "development"),
		AppPort:             getEnv("APP_PORT", "8080"),
		CORSAllowedOrigins:  origins,
		DatabaseURL:         os.Getenv("DATABASE_URL"),
		RedisAddr:           getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPass:           getEnv("REDIS_PASSWORD", ""),
		RedisDB:             getEnvInt("REDIS_DB", 0),
		JWTAccessSecret:     os.Getenv("JWT_ACCESS_SECRET"),
		JWTRefreshSecret:    os.Getenv("JWT_REFRESH_SECRET"),
		AccessTokenTTL:      time.Duration(accessTTLMin) * time.Minute,
		RefreshTokenTTL:     time.Duration(refreshTTLHours) * time.Hour,
		TOTPEncKey:          os.Getenv("TOTP_ENC_KEY"),
		TOTPIssuer:          getEnv("TOTP_ISSUER", "Giftlaya CMS"),
		S3Endpoint:          getEnv("S3_ENDPOINT", ""),
		S3Region:            getEnv("S3_REGION", "ap-south-1"),
		S3Bucket:            getEnv("S3_BUCKET", "giftlaya-media"),
		S3Access:            getEnv("S3_ACCESS_KEY", ""),
		S3Secret:            getEnv("S3_SECRET_KEY", ""),
		S3UseSSL:            getEnvBool("S3_USE_SSL", false),
		CDNBaseURL:            getEnv("CDN_BASE_URL", ""),
		RazorpayWebhookSecret: os.Getenv("RAZORPAY_WEBHOOK_SECRET"),
		SeedAdminUsername:     getEnv("SEED_ADMIN_USERNAME", "superadmin"),
		SeedAdminEmail:      getEnv("SEED_ADMIN_EMAIL", "admin@giftlaya.com"),
		SeedAdminPassword:   os.Getenv("SEED_ADMIN_PASSWORD"),
		SeedAdminAccessCode: os.Getenv("SEED_ADMIN_ACCESS_CODE"),
	}

	if cfg.JWTAccessSecret == "" || cfg.JWTRefreshSecret == "" {
		return nil, fmt.Errorf("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set")
	}
	if cfg.AppEnv == "production" && (len(cfg.JWTAccessSecret) < 32 || len(cfg.JWTRefreshSecret) < 32) {
		return nil, fmt.Errorf("production JWT secrets must be at least 32 characters")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return fallback
}

