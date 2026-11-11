package storage

import (
	"context"
	"fmt"
	"io"
	"strings"
)

type UploadInput struct {
	Folder      string
	Filename    string
	ContentType string
	Size        int64
	Body        io.Reader
}

type UploadResult struct {
	FileKey string `json:"file_key"`
	CDNURL  string `json:"cdn_url"`
}

type Client interface {
	Upload(ctx context.Context, in UploadInput) (*UploadResult, error)
	Delete(ctx context.Context, fileKey string) error
}

type S3CompatibleClient struct {
	Endpoint   string
	Bucket     string
	CDNBaseURL string
}

func NewS3CompatibleClient(endpoint, bucket, cdnBaseURL string) *S3CompatibleClient {
	return &S3CompatibleClient{
		Endpoint:   strings.TrimRight(endpoint, "/"),
		Bucket:     bucket,
		CDNBaseURL: strings.TrimRight(cdnBaseURL, "/"),
	}
}

func (c *S3CompatibleClient) Upload(_ context.Context, in UploadInput) (*UploadResult, error) {
	key := strings.Trim(strings.Trim(in.Folder, "/")+"/"+strings.TrimLeft(in.Filename, "/"), "/")
	base := c.CDNBaseURL
	if base == "" {
		base = fmt.Sprintf("%s/%s", c.Endpoint, c.Bucket)
	}
	return &UploadResult{
		FileKey: key,
		CDNURL:  fmt.Sprintf("%s/%s", base, key),
	}, nil
}

func (c *S3CompatibleClient) Delete(_ context.Context, _ string) error {
	return nil
}

