# Publicar VitalTraining en internet (gratis)

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

---

## Correos (opcional)

La app envía correos de **bienvenida**, de **recuperar contraseña** y de **alertas** (salud del atleta a los médicos; carga de entrenamiento muy alta al atleta y a los médicos, como mucho una vez por semana). Sin configurar nada la app funciona igual, pero esos correos no salen (solo se anotan en los Logs de Render) y **"¿Olvidaste tu contraseña?" no llegará a nadie**.

Se usa **Brevo** (gratis: 300 correos al día).

1. Crea una cuenta en [brevo.com](https://www.brevo.com) (plan **Free**).
2. **Remitente:** menú de tu cuenta → **Senders, Domains & Dedicated IPs → Senders → Add a sender**. Pon el nombre (`VitalTraining`) y el correo desde el que saldrán los mensajes. Brevo te manda un código a ese correo para verificarlo.
3. **Clave:** menú de tu cuenta → **SMTP & API → API Keys → Generate a new API key**. Cópiala (empieza por `xkeysib-`). Es secreta: no la subas a GitHub ni la compartas.
4. En Render → **Environment Groups → Pro**, añade:

   | Key | Value |
   |---|---|
   | `BREVO_API_KEY` | la clave del paso 3 |
   | `CORREO_REMITENTE` | el correo verificado del paso 2 |
   | `CORREO_NOMBRE` | `VitalTraining` (opcional) |

5. **Manual Deploy → Deploy latest commit**.
6. Prueba: en la página de inicio pulsa **¿Olvidaste tu contraseña?** con un correo registrado que sea tuyo. Si no llega, mira la carpeta de spam y los **Logs** de Render (si Brevo rechaza el envío aparece `❌ Correo no enviado`).

> **Spam:** si el remitente es un Gmail/Hotmail, algunos correos pueden caer en spam porque salen desde los servidores de Brevo y no de Google. Para evitarlo del todo hace falta un dominio propio verificado en Brevo (Senders, Domains → Domains). Para empezar, un Gmail basta.

Los enlaces de los correos apuntan a la dirección de Render automáticamente. Si algún día usas un dominio propio, añade `APP_URL=https://tu-dominio.com`.

---

## Entrar con Google (opcional)

Sin configurarlo, el botón "Continuar con Google" simplemente no aparece. Para activarlo:

1. Entra en [console.cloud.google.com](https://console.cloud.google.com) con tu cuenta de Google y crea un proyecto (por ejemplo `VitalTraining`).
2. Menú → **APIs y servicios → Pantalla de consentimiento de OAuth** (en la versión nueva: **Google Auth Platform → Branding**):
   - Nombre de la app: `VitalTraining`; correo de asistencia: el tuyo.
   - Público: **Externo**. Luego, en **Audience / Público**, pulsa **Publicar app** para que pueda entrar cualquier persona (solo se piden nombre y correo, así que Google no exige revisión).
3. **Clientes → Crear cliente** (o *Credenciales → Crear credenciales → ID de cliente de OAuth*):
   - Tipo: **Aplicación web**.
   - **Orígenes autorizados de JavaScript**: `https://vitaltraining-pro.onrender.com` y `http://localhost:4000`.
   - No hace falta poner URI de redirección.
4. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`). No es secreto: es el que ve el navegador.
5. En Render → **Environment Groups → Pro**, añade `GOOGLE_CLIENT_ID` con ese valor y haz **Manual Deploy → Deploy latest commit**.

Cómo funciona: si el correo de Google ya tiene cuenta, entra directamente. Si no, la persona completa el registro (deporte, posición...) sin inventar contraseña; si algún día la quiere, usa "¿Olvidaste tu contraseña?".


---

## Asistente IA con Claude (opcional)

Sin configurar nada, el asistente "Vita" funciona en **modo básico**: entiende de qué le hablan y responde con los análisis de la app, pero no conversa libremente. Con una clave de Claude conversa como una persona y conoce los datos del atleta (perfil, salud de la semana, plan, día de partido, carga).

1. Entra en [platform.claude.com](https://platform.claude.com) y crea una cuenta.
2. **Billing**: carga saldo (prepago). Para empezar, 5-10 USD alcanzan para muchas conversaciones de prueba.
3. **Limits**: pon un límite de gasto mensual para no llevarte sorpresas.
4. **API Keys → Create Key**. Cópiala (empieza por `sk-ant-`). Es secreta: no la compartas ni la subas a GitHub.
5. En Render → **Environment Groups → Pro**, añade `ANTHROPIC_API_KEY` con esa clave y haz **Manual Deploy**.
6. En el asistente, debajo de "Vita" debe decir **En línea** (en vez de "Modo básico").

**Costo aproximado:** usa el modelo Claude Opus 5.5. Cada mensaje cuesta unos 2 centavos de dólar (lleva los datos del atleta en cada pregunta). Cada persona puede enviar como máximo 30 mensajes cada 10 minutos. Si Claude falla o se acaba el saldo, el asistente pasa solo al modo básico.

---

## Análisis de código con SonarQube (opcional)

SonarQube revisa el código en cada subida a GitHub: errores probables, fallos de seguridad, código duplicado y cobertura de tests. El repositorio es público, así que **SonarQube Cloud es gratis**.

1. Entra en [sonarcloud.io](https://sonarcloud.io) → **Log in → With GitHub** y autoriza.
2. **+ → Analyze new project → Import an organization**: elige tu cuenta de GitHub e instala la app solo para el repositorio `VITALTRAINING-PRO-`. Plan **Free**.
3. Selecciona el repositorio → **Set up**. Para "new code" elige **Previous version**.
4. En **Analysis Method** elige **With GitHub Actions** (no "Automatic Analysis": esa no lee la cobertura de los tests). SonarQube te muestra un **SONAR_TOKEN**: cópialo.
5. En GitHub → el repositorio → **Settings → Secrets and variables → Actions → New repository secret**: nombre `SONAR_TOKEN`, valor el token.
6. Comprueba en SonarQube Cloud la **Organization Key** y la **Project Key**. Si no coinciden con las de `sonar-project.properties`, cámbialas ahí.
7. Sube cualquier cambio a `main` (o en GitHub → **Actions → CI → Run workflow**). Al terminar, el informe aparece en SonarQube Cloud.

El análisis va en `.github/workflows/ci.yml`, después de los tests. Mientras no exista el secreto `SONAR_TOKEN`, ese paso se salta sin dar error.
