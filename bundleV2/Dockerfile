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
RUN --mount=type=secret,id=shopify_cli_partners_token,dst=/etc/secrets/shopify_cli_partners_token \
    if [ "$NODE_ENV" = "test" ]; then \
      export SHOPIFY_CLI_PARTNERS_TOKEN="$(tr -d '\n\r' < /etc/secrets/shopify_cli_partners_token)" && \
      npx --yes @shopify/cli@latest app deploy --config shopify.app.test.toml --allow-updates; \
    elif [ "$NODE_ENV" = "prod" ]; then \
      export SHOPIFY_CLI_PARTNERS_TOKEN="$(tr -d '\n\r' < /etc/secrets/shopify_cli_partners_token)" && \
      npx --yes @shopify/cli@latest app deploy --config shopify.app.prod.toml --allow-updates; \
    fi

CMD ["npm", "run", "docker-start"]
