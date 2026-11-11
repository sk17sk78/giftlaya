package notify

import (
	"context"
	"log/slog"
)

type Message struct {
	Channel  string
	To       string
	Subject  string
	Body     string
	Metadata map[string]any
}

type Notifier interface {
	Send(ctx context.Context, msg Message) error
}

type LogNotifier struct {
	logger *slog.Logger
}

func NewLogNotifier(logger *slog.Logger) *LogNotifier {
	return &LogNotifier{logger: logger}
}

func (n *LogNotifier) Send(_ context.Context, msg Message) error {
	n.logger.Info("notification dispatched (dev logger)",
		"channel", msg.Channel,
		"to", msg.To,
		"subject", msg.Subject,
	)
	return nil
}

