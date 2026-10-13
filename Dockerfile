FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY data/ ./data/
COPY openai-action.json ./

# Default: stdio (used by Glama / Smithery inspectors and local Docker clients).
# For a hosted remote endpoint (ChatGPT connectors, Claude.ai custom connectors),
# run with PORT set, e.g. `docker run -e PORT=8080 -p 8080:8080 <image>` or Cloud Run.
EXPOSE 8080
ENTRYPOINT ["node", "dist/index.js"]
