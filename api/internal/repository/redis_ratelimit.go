package repository

import (
	"context"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisRateLimiter struct {
	client *redis.Client

	mu      sync.Mutex
	buckets map[string]memBucket
}

type memBucket struct {
	count   int
	resetAt time.Time
}

func NewRedisRateLimiter(client *redis.Client) *RedisRateLimiter {
	return &RedisRateLimiter{
		client:  client,
		buckets: make(map[string]memBucket),
	}
}

func (l *RedisRateLimiter) Allow(ctx context.Context, key string, limit int, window time.Duration) (bool, int, time.Duration, error) {
	if l.client != nil {
		pipe := l.client.TxPipeline()
		incr := pipe.Incr(ctx, key)
		pipe.ExpireNX(ctx, key, window)
		if _, err := pipe.Exec(ctx); err == nil {
			count := int(incr.Val())
			ttl, _ := l.client.TTL(ctx, key).Result()
			if ttl < 0 {
				_ = l.client.Expire(ctx, key, window).Err()
				ttl = window
			}
			rem := max(0, limit-count)
			return count <= limit, rem, ttl, nil
		}
	}

	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	b, ok := l.buckets[key]
	if !ok || now.After(b.resetAt) {
		b = memBucket{count: 0, resetAt: now.Add(window)}
	}
	b.count++
	l.buckets[key] = b
	rem := max(0, limit-b.count)
	return b.count <= limit, rem, time.Until(b.resetAt), nil
}

func (l *RedisRateLimiter) Reset(ctx context.Context, key string) error {
	if l.client != nil {
		_ = l.client.Del(ctx, key).Err()
	}
	l.mu.Lock()
	delete(l.buckets, key)
	l.mu.Unlock()
	return nil
}

