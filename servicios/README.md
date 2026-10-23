# ✉️ Servicios — ¿para qué?

Aquí van las **integraciones con servicios externos**, separadas del servidor para que cambiar de proveedor no afecte al resto del código.

| Servicio | Estado | Carpeta |
|---|---|---|
| Correo (bienvenida, recuperar contraseña, alertas de salud y de carga) | ✅ Listo (Brevo) | [`correo/`](correo/) |
| Pagos / suscripciones | Pendiente | `pagos/` |
| IA / automatizaciones (n8n) | Endpoint de contexto en `servidor/api/ia/` | `ia/` |

Regla: cada servicio expone funciones simples (p. ej. `enviarCorreo({ para, asunto, html, texto })`) y lee sus claves de `.env`. Los módulos de `servidor/api/` solo llaman a esas funciones (en el caso del correo, a través del módulo `servidor/api/avisos`).

## Correo

- `correo/index.js` — `enviarCorreo()` y `urlApp()`. Usa la API de **Brevo** si existen `BREVO_API_KEY` y `CORREO_REMITENTE`; si no, muestra los correos en la consola del servidor (la app funciona igual).
- `correo/plantillas.js` — los textos y el diseño de cada correo.

Variables de entorno:

| Variable | Para qué |
|---|---|
| `BREVO_API_KEY` | Clave de API de Brevo (Brevo → SMTP & API → API Keys) |
| `CORREO_REMITENTE` | Correo remitente **verificado** en Brevo (Senders) |
| `CORREO_NOMBRE` | Nombre que ve quien recibe (por defecto "Vital Sports") |
| `APP_URL` | Dirección de la app para los enlaces. En Render no hace falta: se usa `RENDER_EXTERNAL_URL` |

Guía para configurarlo: [docs/DESPLIEGUE.md](../docs/DESPLIEGUE.md#correos-opcional).
