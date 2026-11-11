package jobs

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/hibiken/asynq"
)

const (
	TaskSendNotification = "notification:send"
	TaskGenerateInvoice  = "invoice:generate"
	TaskExportCSV        = "export:csv"
	TaskProcessImage     = "image:process"
)

type Queue interface {
	Enqueue(ctx context.Context, taskType string, payload any) error
	Close() error
}

type AsynqClient struct {
	client *asynq.Client
	logger *slog.Logger
}

func NewAsynqClient(redisAddr, redisPass string, db int, logger *slog.Logger) *AsynqClient {
	if redisAddr == "" {
		return &AsynqClient{logger: logger}
	}
	c := asynq.NewClient(asynq.RedisClientOpt{
		Addr:     redisAddr,
		Password: redisPass,
		DB:       db,
	})
	return &AsynqClient{client: c, logger: logger}
}

func (q *AsynqClient) Enqueue(ctx context.Context, taskType string, payload any) error {
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	if q.client == nil {
		q.logger.Info("job skipped (redis disabled)", "task", taskType)
		return nil
	}
	_, err = q.client.EnqueueContext(ctx, asynq.NewTask(taskType, b))
	return err
}

func (q *AsynqClient) Close() error {
	if q.client != nil {
		return q.client.Close()
	}
	return nil
}

