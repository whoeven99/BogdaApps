# syntax=docker/dockerfile:1.4
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl

EXPOSE 3000
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install

COPY . .
RUN npm run build

CMD ["npm", "run", "docker-start"]