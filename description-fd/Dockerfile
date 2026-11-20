FROM node:20-slim

RUN apt-get update -y \
  && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=development

COPY package.json package-lock.json* ./

RUN npm ci
# Remove CLI packages since we don't need them in production by default.
# Remove this line if you want to run CLI commands in your container.
RUN npm remove @shopify/cli

COPY . .

RUN npx prisma generate && npm run build

ENV NODE_ENV=production

CMD ["npm", "run", "docker-start"]