# Stage 1

#FROM node:18.19-slim AS builder
FROM node:18.19-alpine AS builder

ARG BASE_HREF
# ENV BASE_HREF ${BASE_HREF:-}

WORKDIR /app

COPY siteapp/angular-env/  .

RUN set -x \
  && npm install --legacy-peer-deps && npm cache clean --force \
  && npm run build

# Stage 2

FROM docker.angie.software/angie:latest

ARG BASE_HREF
# ENV BASE_HREF ${BASE_HREF:-}

# Копируем конфиги
COPY siteapp/conf/angie.conf /etc/angie/angie.conf
COPY siteapp/conf/proxy_params /etc/angie/proxy_params

COPY --from=builder /app/dist/base-app/* /usr/share/angie/html

EXPOSE 80
