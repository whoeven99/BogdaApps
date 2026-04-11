# syntax=docker/dockerfile:1.4
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl

EXPOSE 3000

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

RUN npm run build

ARG NODE_ENV
ARG SHOPIFY_CLI_APP_DEPLOY_TOKEN
ENV SHOPIFY_CLI_APP_DEPLOY_TOKEN=${SHOPIFY_CLI_APP_DEPLOY_TOKEN}

# 添加 --force 跳过确认提示，同时使用 --allow-updates 允许 CLI 自动更新
RUN if [ "$NODE_ENV" = "test" ]; then \
      npx --yes @shopify/cli@latest app deploy --config shopify.app.test.toml --allow-updates --force; \
    elif [ "$NODE_ENV" = "prod" ]; then \
      npx --yes @shopify/cli@latest app deploy --config shopify.app.prod.toml --allow-updates --force; \
    fi

CMD ["npm", "run", "docker-start"]