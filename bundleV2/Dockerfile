# syntax=docker/dockerfile:1.4

# ============ 构建阶段 ============
FROM node:20-slim AS builder

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先复制依赖文件，利用 Docker 缓存层
COPY package.json yarn.lock ./

# 安装所有依赖（包括 devDependencies 用于构建）
RUN yarn install --frozen-lockfile --network-timeout 100000

# 复制源代码
COPY . .

# 生成 Prisma Client 并构建应用
RUN npx prisma generate && npm run build

# ============ 生产依赖阶段 ============
FROM node:20-slim AS deps

WORKDIR /app

COPY package.json yarn.lock ./

# 只安装生产依赖
RUN yarn install --frozen-lockfile --production --network-timeout 100000

# 从构建阶段复制 Prisma Client（它在 node_modules 中生成）
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# ============ 生产阶段 ============
FROM node:20-slim AS production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 只复制生产所需文件
COPY --from=builder /app/build ./build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "run", "start"]
