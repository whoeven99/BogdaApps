# syntax=docker/dockerfile:1.4
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl

EXPOSE 3000

WORKDIR /app

COPY package.json yarn.lock ./

# Install full deps (including optional/platform packages required by Vite/Rollup)
RUN yarn install 

COPY . .

RUN npm run build

ARG NODE_ENV
ARG SHOPIFY_CLI_PARTNERS_TOKEN
ENV SHOPIFY_DEPLOY_TOKEN=${SHOPIFY_DEPLOY_TOKEN}

RUN if [ "$NODE_ENV" = "test" ]; then \
      npx --yes @shopify/cli@latest app deploy --config shopify.app.test.toml --allow-updates; \
    elif [ "$NODE_ENV" = "prod" ]; then \
      npx --yes @shopify/cli@latest app deploy --config shopify.app.prod.toml --allow-updates; \
    fi

CMD ["npm", "run", "docker-start"]
