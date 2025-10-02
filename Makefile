SHELL := /bin/bash

.PHONY: env build up ps logs down clean rebuild pull

# Local usage combines base and local override; set COMPOSE_PROFILES=frontend to include webapp/siteapp
# Example: COMPOSE_PROFILES=frontend make up

# Load .env if exists
ifneq (,$(wildcard .env))
include .env
export
endif

env:
	@echo "Creating .env from .env.example with dev overrides..."
	@cp -f .env.example .env
	@sed -i 's/^APP_ENV=.*/APP_ENV=dev/' .env
	@sed -i 's/^DOCKER_REGISTRY=.*/DOCKER_REGISTRY=local/' .env
	@grep -q '^WEBAPP_HTTP_PORT=' .env && sed -i 's/^WEBAPP_HTTP_PORT=.*/WEBAPP_HTTP_PORT=17000/' .env || echo 'WEBAPP_HTTP_PORT=17000' >> .env
	@grep -q '^SITEAPP_HTTP_PORT=' .env && sed -i 's/^SITEAPP_HTTP_PORT=.*/SITEAPP_HTTP_PORT=18000/' .env || echo 'SITEAPP_HTTP_PORT=18000' >> .env
	@echo ".env prepared:"
	@grep -E '^(APP_ENV|DOCKER_REGISTRY|WEBAPP_HTTP_PORT|SITEAPP_HTTP_PORT)=' .env

build:
	docker compose -f docker-compose.yaml -f docker-compose.local.yaml build

up:
	docker compose -f docker-compose.yaml -f docker-compose.local.yaml up -d --build

ps:
	docker compose -f docker-compose.yaml -f docker-compose.local.yaml ps

logs:
	docker compose -f docker-compose.yaml -f docker-compose.local.yaml logs --tail=200

down:
	docker compose -f docker-compose.yaml -f docker-compose.local.yaml down

clean:
	docker compose -f docker-compose.yaml -f docker-compose.local.yaml down -v

rebuild:
	docker compose -f docker-compose.yaml -f docker-compose.local.yaml down -v && docker compose -f docker-compose.yaml -f docker-compose.local.yaml up -d --build

pull:
	docker compose -f docker-compose.yaml -f docker-compose.local.yaml pull
