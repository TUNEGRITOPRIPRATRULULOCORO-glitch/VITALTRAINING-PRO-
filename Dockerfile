# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- Dependencias ----
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ---- Codigo ----
COPY . .


EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/auth/ping || exit 1

CMD ["node", "servidor/server.js"]
