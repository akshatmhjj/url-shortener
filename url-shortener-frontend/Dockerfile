# Build the Vite application once; no development server is included in production.
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Vite substitutes only VITE_* variables at build time. This is public OAuth
# client configuration, supplied by Compose later; secrets must never use it.
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
RUN npm run build

# The public gateway serves the generated SPA. Reverse-proxy rules are added in
# Phase 9, when the Nginx configuration is introduced.
FROM nginx:1.28-alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
