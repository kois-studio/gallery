FROM node:24.20.0-bookworm-slim AS web-build

WORKDIR /workspace/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci
COPY apps/web/ ./
RUN npm run build

FROM node:24.20.0-bookworm-slim AS api-build

WORKDIR /workspace/apps/api
COPY apps/api/package.json apps/api/package-lock.json ./
RUN npm ci
COPY apps/api/ ./
COPY --from=web-build /workspace/apps/web/dist/gallery-web/browser ./public
RUN npm run build

FROM node:24.20.0-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/gallery.db
ENV STORAGE_PATH=/photos

WORKDIR /app
COPY apps/api/package.json apps/api/package-lock.json ./
RUN npm ci --omit=dev && mkdir -p /data /photos && chown -R node:node /app /data /photos
COPY --from=api-build --chown=node:node /workspace/apps/api/dist ./dist
COPY --from=api-build --chown=node:node /workspace/apps/api/public ./public
COPY --from=api-build --chown=node:node /workspace/apps/api/scripts ./scripts

VOLUME ["/data", "/photos"]
EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
