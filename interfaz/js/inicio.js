/* =============================================
   VitalTraining — inicio.js
   Arranque: decide qué pantalla mostrar al abrir la app. Se carga el último.
============================================= */

// ────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────
window.addEventListener('load', ()=>{
    if (revisarEnlaceRestablecer()) return; // abierto desde el correo de "recuperar contraseña"
    const session=getSession(), token=getToken();
    if(session && token) routeUser(session, token);
    else mostrarInicio();
});
