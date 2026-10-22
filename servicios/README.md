# ✉️ Servicios — ¿para qué?

Aquí van las **integraciones con servicios externos**, separadas del servidor para que cambiar de proveedor no afecte al resto del código.

| Servicio | Estado | Carpeta sugerida |
|---|---|---|
| Correo (bienvenida, recuperar contraseña, alertas) | Pendiente | `servicios/email/` |
| Pagos / suscripciones | Pendiente | `servicios/pagos/` |
| IA / automatizaciones (n8n) | Endpoint de contexto en `servidor/api/ia/` | `servicios/ia/` |

Regla: cada servicio expone funciones simples (p. ej. `enviarCorreo(destino, asunto, html)`) y lee sus claves de `.env`. Los módulos de `servidor/api/` solo llaman a esas funciones.
