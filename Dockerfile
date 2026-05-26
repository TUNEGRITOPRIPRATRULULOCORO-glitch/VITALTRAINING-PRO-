# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- Dependencias ----
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ---- Codigo ----
COPY . .

# Crear database.json inicial si no existe (montado via volume en prod)
RUN test -f database.json || echo "{\"usuarios\":[],\"incidencias\":[],\"perfiles\":[],\"comidas\":[],\"rutinas\":[],\"alertas\":[],\"salud\":[],\"perfilesMedicos\":[],\"cumplimiento\":[]}" > database.json

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/auth/ping || exit 1

CMD ["node", "server.js"]
