FROM node:20-alpine3.17

RUN apk add --no-cache openssl

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

CMD ["npm", "run", "docker-start"]