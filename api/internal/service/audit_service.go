package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/giftlaya/giftlaya-api/internal/domain"
)

type AuditService struct {
	repo   domain.AuditRepository
	logger *slog.Logger
}

func NewAuditService(repo domain.AuditRepository, logger *slog.Logger) *AuditService {
	return &AuditService{repo: repo, logger: logger}
}

func (s *AuditService) Record(
	ctx context.Context,
	actorID *int64,
	actorUsername, module, action, entityType string,
	entityID any,
	requestID, ipAddress string,
	before, after any,
) {
	if s.repo == nil {
		return
	}
	var beforeBytes, afterBytes []byte
	if before != nil {
		beforeBytes, _ = json.Marshal(before)
	}
	if after != nil {
		afterBytes, _ = json.Marshal(after)
	}
	err := s.repo.CreateAuditLog(ctx, domain.AuditEntry{
		ActorType:     "admin",
		ActorID:       actorID,
		ActorUsername: actorUsername,
		Module:        module,
		Action:        action,
		EntityType:    entityType,
		EntityID:      fmt.Sprintf("%v", entityID),
		RequestID:     requestID,
		IPAddress:     ipAddress,
		BeforeJSON:    beforeBytes,
		AfterJSON:     afterBytes,
	})
	if err != nil && s.logger != nil {
		s.logger.Error("failed to write audit log", "error", err, "module", module, "action", action)
	}
}

func (s *AuditService) List(ctx context.Context, module string, actorID *int64, page, limit int) ([]domain.AuditEntry, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}
	offset := (page - 1) * limit
	return s.repo.ListAuditLogs(ctx, module, actorID, limit, offset)
}

