# Development image — hot-reload via nodemon, not for production use.
# See specs/002-dev-containerization/plan.md for the production Dockerfile (Phase 8).

FROM node:18-slim

WORKDIR /app

# Install dependencies in a separate layer to leverage Docker cache.
# Only re-runs when package*.json changes, not on every code edit.
COPY server/package.json server/package-lock.json ./server/

RUN cd server && npm ci

# game/ and server/ are mounted as bind-mount volumes at runtime (see docs).
# This COPY is a fallback so the image is self-contained if run without mounts.
COPY game/ ./game/
COPY server/ ./server/
COPY nodemon.json ./

EXPOSE 55555

# nodemon.json configures watch paths and legacyWatch (polling) so that
# bind-mount changes from Docker Desktop (macOS/Windows) are detected.
CMD ["./server/node_modules/.bin/nodemon", "server/server.js"]
