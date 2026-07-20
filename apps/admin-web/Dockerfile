# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /app
ENV CI=true

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
ARG NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:4100
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_WEBSOCKET_URL=$NEXT_PUBLIC_WEBSOCKET_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app ./

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/login', (r) => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["npm", "run", "start"]
