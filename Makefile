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
	@set -e; \
	echo "Preparing .env for local dev (idempotent)..."; \
	if [ ! -f .env ]; then \
	  echo "No .env found, creating from .env.example"; \
	  cp .env.example .env; \
	  # Force dev defaults on initial creation only; won't override existing user values next runs \
	  if grep -qE '^[[:space:]]*APP_ENV=' .env; then sed -i 's/^APP_ENV=.*/APP_ENV=dev/' .env; else echo 'APP_ENV=dev' >> .env; fi; \
	  if grep -qE '^[[:space:]]*DOCKER_REGISTRY=' .env; then sed -i 's/^DOCKER_REGISTRY=.*/DOCKER_REGISTRY=local/' .env; else echo 'DOCKER_REGISTRY=local' >> .env; fi; \
	else \
	  echo ".env exists, will not overwrite existing keys; only append missing ones"; \
	fi; \
	# Ensure required keys exist without overwriting present ones \
	grep -qE '^[[:space:]]*APP_ENV=' .env || echo 'APP_ENV=dev' >> .env; \
	grep -qE '^[[:space:]]*DOCKER_REGISTRY=' .env || echo 'DOCKER_REGISTRY=local' >> .env; \
	grep -qE '^[[:space:]]*WEBAPP_HTTP_PORT=' .env || echo 'WEBAPP_HTTP_PORT=17000' >> .env; \
	grep -qE '^[[:space:]]*SITEAPP_HTTP_PORT=' .env || echo 'SITEAPP_HTTP_PORT=18000' >> .env; \
	grep -qE '^[[:space:]]*POSTGRES_USER=' .env || echo 'POSTGRES_USER=postgres' >> .env; \
	grep -qE '^[[:space:]]*POSTGRES_PASSWORD=' .env || echo 'POSTGRES_PASSWORD=postgres' >> .env; \
	grep -qE '^[[:space:]]*POSTGRES_PORT=' .env || echo 'POSTGRES_PORT=5432' >> .env; \
	grep -qE '^[[:space:]]*POSTGRES_DATA_ROOT=' .env || echo 'POSTGRES_DATA_ROOT=./.data' >> .env; \
	grep -qE '^[[:space:]]*POSTGRES_DB=' .env || echo 'POSTGRES_DB=dev_db' >> .env; \
	echo ".env prepared:"; \
	grep -E '^(APP_ENV|DOCKER_REGISTRY|WEBAPP_HTTP_PORT|SITEAPP_HTTP_PORT|POSTGRES_USER|POSTGRES_PASSWORD|POSTGRES_PORT|POSTGRES_DATA_ROOT|POSTGRES_DB)=' .env

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
