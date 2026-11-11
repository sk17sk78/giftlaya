package jobs

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/giftlaya/giftlaya-api/internal/notify"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
)

type NotificationTaskPayload struct {
	Channel  string         `json:"channel"`
	To       string         `json:"to"`
	Subject  string         `json:"subject"`
	Body     string         `json:"body"`
	Metadata map[string]any `json:"metadata,omitempty"`
}

type Worker struct {
	server   *asynq.Server
	mux      *asynq.ServeMux
	pool     *pgxpool.Pool
	notifier notify.Notifier
	logger   *slog.Logger
}

func NewWorker(redisAddr, redisPass string, db int, pool *pgxpool.Pool, notifier notify.Notifier, logger *slog.Logger) *Worker {
	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisAddr, Password: redisPass, DB: db},
		asynq.Config{Concurrency: 5},
	)
	w := &Worker{
		server:   srv,
		mux:      asynq.NewServeMux(),
		pool:     pool,
		notifier: notifier,
		logger:   logger,
	}
	w.mux.HandleFunc(TaskSendNotification, w.handleNotification)
	w.mux.HandleFunc(TaskGenerateInvoice, w.handleGeneric("invoice_generated"))
	w.mux.HandleFunc(TaskExportCSV, w.handleGeneric("csv_exported"))
	w.mux.HandleFunc(TaskProcessImage, w.handleGeneric("image_processed"))
	return w
}

func (w *Worker) Start() error {
	return w.server.Run(w.mux)
}

func (w *Worker) Shutdown() {
	w.server.Shutdown()
}

func (w *Worker) handleNotification(ctx context.Context, t *asynq.Task) error {
	var p NotificationTaskPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return err
	}
	if w.notifier != nil {
		_ = w.notifier.Send(ctx, notify.Message{
			Channel:  p.Channel,
			To:       p.To,
			Subject:  p.Subject,
			Body:     p.Body,
			Metadata: p.Metadata,
		})
	}
	if w.pool != nil {
		metaBytes, _ := json.Marshal(p)
		_, _ = w.pool.Exec(ctx, `
			INSERT INTO notification_logs (recipient, channel, payload_json, status)
			VALUES ($1, $2, $3, 'sent')
		`, p.To, p.Channel, metaBytes)
	}
	return nil
}

func (w *Worker) handleGeneric(event string) func(context.Context, *asynq.Task) error {
	return func(_ context.Context, t *asynq.Task) error {
		if w.logger != nil {
			w.logger.Info("asynq_job_processed", "event", event, "type", t.Type())
		}
		return nil
	}
}

