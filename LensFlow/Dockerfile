# syntax=docker/dockerfile:1.4
FROM node:20-slim
RUN apt-get update -y && apt-get install -y --no-install-recommends \
  openssl \
  python3 \
  make \
  g++ \
  pkg-config \
  && rm -rf /var/lib/apt/lists/*

EXPOSE 3001
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

CMD ["npm", "start"]
