FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY . .

RUN npm install && npm run build

FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app .

RUN apt-get update && apt-get install -y sqlite3 && apt-get clean && rm -rf /var/lib/apt/lists/*

EXPOSE 3001

CMD [ "node", "server/server.js" ]
