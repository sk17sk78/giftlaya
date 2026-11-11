package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

var unsafeFilenameRe = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

type LocalDiskClient struct {
	BaseDir    string
	PublicBase string
}

func NewLocalDiskClient(baseDir, publicBase string) *LocalDiskClient {
	if baseDir == "" {
		baseDir = "./uploads"
	}
	_ = os.MkdirAll(baseDir, 0o755)
	return &LocalDiskClient{
		BaseDir:    baseDir,
		PublicBase: strings.TrimRight(publicBase, "/"),
	}
}

func (l *LocalDiskClient) Upload(_ context.Context, in UploadInput) (*UploadResult, error) {
	folder := strings.Trim(unsafeFilenameRe.ReplaceAllString(in.Folder, "-"), "/.-")
	if folder == "" {
		folder = "general"
	}
	cleanName := unsafeFilenameRe.ReplaceAllString(filepath.Base(in.Filename), "-")
	if cleanName == "" || cleanName == "." || cleanName == ".." {
		cleanName = "asset.bin"
	}
	stamped := fmt.Sprintf("%d-%s", time.Now().UnixNano(), cleanName)
	relKey := filepath.ToSlash(filepath.Join(folder, stamped))
	targetPath := filepath.Join(l.BaseDir, folder, stamped)

	if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
		return nil, err
	}
	f, err := os.OpenFile(targetPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	if _, err := io.Copy(f, io.LimitReader(in.Body, 20<<20)); err != nil {
		return nil, err
	}

	cdnURL := fmt.Sprintf("%s/uploads/%s", l.PublicBase, relKey)
	if l.PublicBase == "" {
		cdnURL = "/uploads/" + relKey
	}
	return &UploadResult{
		FileKey: relKey,
		CDNURL:  cdnURL,
	}, nil
}

func (l *LocalDiskClient) Delete(_ context.Context, fileKey string) error {
	cleaned := filepath.Clean("/" + fileKey)
	cleaned = strings.TrimPrefix(cleaned, "/")
	if cleaned == "" || strings.Contains(cleaned, "..") {
		return nil
	}
	err := os.Remove(filepath.Join(l.BaseDir, cleaned))
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

