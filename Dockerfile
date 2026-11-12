# syntax=docker/dockerfile:1

# Build stage
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage
FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache iputils
COPY --from=build /app/dist ./dist
COPY server ./server

ENV PORT=80
EXPOSE 80
CMD ["node", "server/index.mjs"]
