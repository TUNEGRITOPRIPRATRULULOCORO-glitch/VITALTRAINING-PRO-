/**
 * config/database.js — Configuración de Base de Datos
 * =====================================================
 * ESTADO ACTUAL: El proyecto usa database.json como almacenamiento temporal.
 * Este archivo está preparado para cuando implementen una base de datos real.
 *
 * ─────────────────────────────────────────────────────────────
 * OPCIÓN A — MongoDB (Recomendada para este proyecto)
 * ─────────────────────────────────────────────────────────────
 * MongoDB es ideal porque los datos del proyecto (perfiles, comidas,
 * rutinas, alertas) son documentos flexibles sin estructura rígida.
 * También es compatible con servicios de IA en el futuro.
 *
 * CÓMO IMPLEMENTAR:
 *   1. Instalar dependencia:
 *        npm install mongoose
 *
 *   2. Crear cuenta gratuita en https://www.mongodb.com/atlas
 *      (MongoDB Atlas — base de datos en la nube, gratis hasta 512MB)
 *
 *   3. Copiar la cadena de conexión del panel de Atlas y pegarla
 *      en un archivo .env (ver ejemplo abajo):
 *        MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/vital-training
 *
 *   4. Descomentar el bloque MongoDB de este archivo y reemplazar
 *      las funciones readDB/writeDB en data/db.js por queries de Mongoose.
 *
 *   5. Crear modelos en una carpeta models/ (uno por tabla):
 *        models/Usuario.js, models/Perfil.js, models/Comida.js, etc.
 *
 * EJEMPLO DE CONEXIÓN (descomentar cuando estén listos):
 *
 *   const mongoose = require('mongoose');
 *
 *   async function conectarDB() {
 *     await mongoose.connect(process.env.MONGO_URI);
 *     console.log('✅ MongoDB conectado');
 *   }
 *
 *   module.exports = { conectarDB };
 *
 * ─────────────────────────────────────────────────────────────
 * OPCIÓN B — PostgreSQL
 * ─────────────────────────────────────────────────────────────
 * Usar si prefieren una base de datos relacional clásica (SQL).
 *
 * CÓMO IMPLEMENTAR:
 *   1. Instalar dependencia:
 *        npm install pg
 *
 *   2. Crear base de datos en Supabase (gratis): https://supabase.com
 *      o instalar PostgreSQL localmente.
 *
 *   3. Agregar en .env:
 *        DATABASE_URL=postgresql://usuario:password@host:5432/vital_training
 *
 *   4. Crear tablas con SQL (ver estructura en docs/ARCHITECTURE.md).
 *
 * ─────────────────────────────────────────────────────────────
 * VARIABLES DE ENTORNO (.env)
 * ─────────────────────────────────────────────────────────────
 * Crea un archivo llamado .env en la raíz del proyecto con:
 *
 *   PORT=4000
 *   MONGO_URI=tu_cadena_de_conexion_aqui
 *   JWT_SECRET=una_clave_secreta_larga_para_tokens
 *   IA_API_KEY=tu_clave_de_anthropic_o_openai
 *
 * IMPORTANTE: El archivo .env NO debe subirse a GitHub.
 * Asegúrate de que .gitignore contenga la línea: .env
 * ─────────────────────────────────────────────────────────────
 */

// Este archivo no exporta nada todavía.
// Cuando implementen la DB, exportarán la función de conexión aquí
// y la llamarán en server.js antes de iniciar el servidor.

module.exports = {};
