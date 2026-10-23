# Publicar Vital Sports en internet (gratis)

Al terminar tendrás un enlace como `https://vital-sports.onrender.com` que se abre desde cualquier computador o celular, sin instalar nada.

Se usan dos servicios gratuitos:

| Servicio | Para qué | Cuenta |
|---|---|---|
| **Neon** | La base de datos (PostgreSQL) | neon.tech |
| **Render** | El servidor de la app | render.com |

Tiempo total: unos 15 minutos.

---

## Paso 1 · Crear la base de datos en Neon

1. Entra a **https://neon.tech** y pulsa **Sign up**. Puedes entrar con tu cuenta de Google o de GitHub.
2. Crea un proyecto:
   - **Project name:** `vital-sports`
   - **Region:** **AWS US East 1 (N. Virginia)** (la misma zona que usaremos en Render, para que sea rápido)
   - Deja lo demás como está y pulsa **Create project**.
3. En el panel del proyecto pulsa **Connect** (o **Connection string**).
4. Copia la cadena de conexión. Se ve así:

   ```
   postgresql://neondb_owner:XXXXXXXX@ep-algo-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

   Guárdala: la vas a pegar en Render. **No la compartas**: es la llave de tu base de datos.

---

## Paso 2 · Crear el servidor en Render

1. Entra a **https://render.com** y pulsa **Get Started**. Regístrate (con GitHub es lo más cómodo).
2. Pulsa **New +** → **Web Service**.
3. Elige **Public Git Repository** y pega:

   ```
   https://github.com/TUNEGRITOPRIPRATRULULOCORO-glitch/VITALTRAINING-PRO-
   ```

   Pulsa **Connect**.
4. Rellena el formulario:

   | Campo | Valor |
   |---|---|
   | **Name** | `vital-sports` (será parte del enlace) |
   | **Region** | **Virginia (US East)** |
   | **Branch** | `main` |
   | **Runtime / Language** | **Node** |
   | **Build Command** | `npm ci --omit=dev` |
   | **Start Command** | `npm start` |
   | **Instance Type** | **Free** |

5. En **Environment Variables** añade estas variables (botón **Add Environment Variable**):

   | Nombre | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `NODE_VERSION` | `20` |
   | `DATABASE_URL` | la cadena que copiaste de Neon |
   | `JWT_SECRET` | pulsa **Generate** para que Render cree una clave aleatoria |
   | `ADMIN_PASSWORD` | la contraseña que quieras para `admin@vital.com` (mínimo 8 caracteres) |
   | `DATOS_DEMO` | `true` (crea las cuentas y datos de ejemplo para la demo) |

6. Abre **Advanced** y en **Health Check Path** escribe `/api/estado`.
7. Pulsa **Create Web Service**.

Render descarga el proyecto, instala todo y lo arranca. Tarda **3 a 5 minutos**. Cuando en la parte de arriba diga **Live**, verás tu enlace (por ejemplo `https://vital-sports.onrender.com`).

> **Alternativa:** si eres dueño del repositorio en GitHub, en el paso 2 puedes elegir **New + → Blueprint** y seleccionar el repositorio. Render lee el archivo `render.yaml` y rellena casi todo solo; únicamente te pedirá `DATABASE_URL` y `ADMIN_PASSWORD`.

---

## Paso 3 · Comprobar que funciona

1. Abre `https://TU-ENLACE.onrender.com/api/estado`. Debe aparecer:

   ```json
   {"ok":true,"baseDeDatos":"conectada"}
   ```

2. Abre `https://TU-ENLACE.onrender.com` e inicia sesión:

   | Rol | Correo | Contraseña |
   |---|---|---|
   | Administrador | admin@vital.com | la que pusiste en `ADMIN_PASSWORD` |
   | Nutricionista | maria@vital.com | nutri123 |
   | Médico | medico@vital.com | medico123 |
   | Atleta (riesgo alto) | carlos@vital.com | futbol123 |
   | Atleta (baloncesto) | diego@vital.com | futbol123 |

Si algo falla, en Render abre la pestaña **Logs**: ahí aparece el motivo (por ejemplo, `Falta ADMIN_PASSWORD`).

---

## Cosas que conviene saber

- **Se duerme si nadie la usa.** En el plan gratuito, Render apaga la app tras 15 minutos sin visitas. La primera vez que la abras después tardará **cerca de 1 minuto** en despertar. Antes de una clase, ábrela un par de minutos antes.
- **Los datos no se pierden** aunque la app se duerma o se reinicie: viven en Neon.
- **Actualizar la app** después de subir cambios a GitHub: en Render → tu servicio → **Manual Deploy → Deploy latest commit**.
- **Las cuentas de prueba tienen contraseñas conocidas** (están en esta guía). Sirven para enseñar la app en clase, pero no para usarla con atletas reales. Cuando vaya a usarla gente real:
  1. Cambia `DATOS_DEMO` a `false` en Render.
  2. Desactiva o elimina las cuentas de prueba desde **Usuarios** en el panel del administrador.
- **Neon gratuito** da 0,5 GB de almacenamiento: de sobra para un club (las fotos de perfil ocupan unos 50 KB cada una).
