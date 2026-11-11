.PHONY: run test sqlc swagger migrate-up migrate-down seed docker-up docker-down build

run:
	go run ./cmd/api

test:
	go test -race -v ./...

sqlc:
	sqlc generate

swagger:
	swag init -g cmd/api/main.go -o docs --parseDependency --parseInternal

migrate-up:
	migrate -path migrations -database "$(DATABASE_URL)" up

migrate-down:
	migrate -path migrations -database "$(DATABASE_URL)" down 1

seed:
	go run ./cmd/seed

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

build:
	CGO_ENABLED=0 go build -o bin/api ./cmd/api
	CGO_ENABLED=0 go build -o bin/seed ./cmd/seed

