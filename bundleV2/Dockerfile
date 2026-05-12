# syntax=docker/dockerfile:1.4
# 分层：先仅复制 manifest → yarn install（易命中缓存），再复制源码 → build。
# BuildKit 缓存挂载可加速 Render 上重复构建的依赖下载（需在 Dashboard 开启 Docker 缓存更佳）。

FROM node:20-slim AS base
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# 首次安装需要完整依赖（含 dev）以执行 react-router / Vite 构建；勿在此前置为 production。
ENV YARN_NETWORK_TIMEOUT=600000

# --- 依赖层：仅 lockfile + 各 workspace 的 package.json，避免改业务代码就重装依赖 ---
COPY package.json yarn.lock ./
COPY extensions/bundle-cart-discount-function/package.json extensions/bundle-cart-discount-function/
COPY extensions/bundle-delivery-discount-function/package.json extensions/bundle-delivery-discount-function/
COPY extensions/ciwi-bundle-web-pixer/package.json extensions/ciwi-bundle-web-pixer/

RUN --mount=type=cache,target=/root/.cache/yarn \
  yarn install --frozen-lockfile --non-interactive

# --- 构建层：完整源码（受 .dockerignore 约束，上下文尽量小）---
COPY . .

RUN npm run build

# 仅保留生产依赖，减小镜像与拉取时间（构建已完成，不再需要 Vite/ESLint 等）
RUN rm -rf node_modules \
  && yarn install --frozen-lockfile --non-interactive --production=true

ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "run", "docker-start"]
