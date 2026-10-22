# 🖥️ Interfaz — ¿para qué?

Es **lo que ve y usa la persona**: pantallas de login, panel del atleta, nutricionista y administrador.

- `index.html` — la aplicación completa (SPA)
- `ayuda.html` — guía de uso
- `styles.css` — estilos
- `script.js` — lógica del navegador; llama al servidor con `fetch('/api/...')` y un token JWT
- `img/` — capturas e imágenes

El servidor publica esta carpeta tal cual (sin build). No guardes aquí claves ni lógica sensible: todo lo que está aquí lo puede leer cualquiera.
