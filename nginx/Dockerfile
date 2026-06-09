# Stage 1: collect static assets — explicit stage so future build steps (minification,
# asset hashing, etc.) can be inserted here without touching the Nginx stage.
FROM node:18-alpine AS static
WORKDIR /static
COPY game/ .

# Stage 2: Nginx runtime — only the static files and config are copied in
FROM nginx:alpine AS runtime
COPY --from=static /static /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
