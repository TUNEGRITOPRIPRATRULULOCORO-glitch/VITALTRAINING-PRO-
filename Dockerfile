# Imagen de VitalTraining (la usa Render para publicar la app)
FROM node:20-alpine
WORKDIR /app

# ---- Dependencias ----
# Sin scripts de instalación de los paquetes (evita que un paquete ejecute código al instalarse);
# solo bcrypt los necesita para preparar su parte nativa, y se ejecutan aparte.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm rebuild bcrypt && npm cache clean --force

# ---- Código ----
# Se copian solo las carpetas que usa la app: nada de .env, datos locales, tests ni .git
COPY servidor ./servidor
COPY servicios ./servicios
COPY interfaz ./interfaz
COPY scripts ./scripts
COPY base-de-datos/db.js base-de-datos/setup.js base-de-datos/schema.sql ./base-de-datos/

# La app no corre como administrador del contenedor. Si arranca sin DATABASE_URL usa una base local:
# esa carpeta debe poder escribirla el usuario "node".
RUN mkdir -p base-de-datos/datos-locales && chown node:node base-de-datos/datos-locales
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/estado || exit 1

CMD ["node", "servidor/server.js"]
