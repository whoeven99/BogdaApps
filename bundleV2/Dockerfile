# syntax=docker/dockerfile:1.4

# ============ 构建阶段 ============
FROM node:20.19-slim AS builder

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先复制 workspace 清单，再安装依赖（避免 extensions 未参与 workspace 解析）
COPY package.json yarn.lock ./
COPY extensions extensions

RUN yarn install --frozen-lockfile --network-timeout 100000

COPY . .

RUN npx prisma generate && yarn build

# ============ 生产依赖阶段 ============
FROM node:20.19-slim AS deps

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json yarn.lock ./
COPY extensions extensions

RUN yarn install --frozen-lockfile --production --network-timeout 100000

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# ============ 生产阶段 ============
FROM node:20.19-slim AS production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/build ./build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY scripts/load-render-env.mjs ./scripts/

# Render Secret Files → /etc/secrets/*；启动时注入 process.env（见 scripts/load-render-env.mjs）
ENV NODE_OPTIONS="--import /app/scripts/load-render-env.mjs"

EXPOSE 3000

CMD ["npm", "run", "docker-start"]
