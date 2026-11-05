FROM node:24-bookworm-slim AS build
WORKDIR /app
# Build-time branding and mount point (Next fixes basePath during the build).
ARG BASE_PATH=""
ARG APP_NAME="WOD PR Tracker"
ARG HOME_SCREEN_NAME="🏋️"
ARG PASSKEYS="on"
ENV BASE_PATH=$BASE_PATH APP_NAME=$APP_NAME HOME_SCREEN_NAME=$HOME_SCREEN_NAME PASSKEYS=$PASSKEYS
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm test && npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ARG BASE_PATH=""
# BASE_PATH is also read at runtime by scripts/create-invite.mjs to print a correct link.
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 DB_PATH=/data/wod-pr-tracker.db NEXT_TELEMETRY_DISABLED=1 BASE_PATH=$BASE_PATH
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/lib/schema.mjs ./lib/schema.mjs
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://localhost:3000'+process.env.BASE_PATH+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server.js"]
