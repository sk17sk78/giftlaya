package service

import (
	"context"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
)

type DashboardService struct {
	repo domain.DashboardRepository
}

func NewDashboardService(repo domain.DashboardRepository) *DashboardService {
	return &DashboardService{repo: repo}
}

func (s *DashboardService) GetStats(ctx context.Context, fromStr, toStr string) (*domain.DashboardStats, error) {
	now := time.Now()
	to := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, now.Location())
	from := to.AddDate(0, 0, -29)
	from = time.Date(from.Year(), from.Month(), from.Day(), 0, 0, 0, 0, now.Location())

	if fromStr != "" {
		if parsed, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = parsed
		}
	}
	if toStr != "" {
		if parsed, err := time.Parse("2006-01-02", toStr); err == nil {
			to = parsed.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		}
	}
	if to.Before(from) {
		from, to = to, from
	}
	return s.repo.GetStats(ctx, from, to)
}

