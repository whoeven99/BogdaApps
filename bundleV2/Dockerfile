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
RUN echo "building for $NODE_ENV"

CMD ["npm", "run", "docker-start"]
