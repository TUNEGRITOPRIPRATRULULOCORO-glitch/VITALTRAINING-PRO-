/* =============================================
   VitalTraining — notificaciones.js
   Activar las notificaciones en este dispositivo (Web Push): mensajes, alertas del médico
   y, para atletas, el recordatorio diario "¿Cómo amaneciste?". Se gestiona desde Mi cuenta.
   En iPhone solo funcionan con la app instalada en la pantalla de inicio (iOS 16.4 o más nuevo).
============================================= */

function nfSoportado() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// La clave pública del servidor viene en base64 "url-safe"; el navegador la quiere en bytes
function nfClaveABytes(base64) {
    const relleno = '='.repeat((4 - base64.length % 4) % 4);
    const crudo = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(crudo, c => c.charCodeAt(0));
}

/** El service worker (sw.js) listo; si aún no estaba registrado, lo registra. Nunca espera para siempre. */
async function nfRegistro() {
    const registro = await navigator.serviceWorker.getRegistration() || await navigator.serviceWorker.register('/sw.js');
    const listo = await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 5000))]);
    return listo || registro;
}

async function nfSuscripcionActual() {
    return (await nfRegistro()).pushManager.getSubscription();
}

/** Sección "Notificaciones" de Mi cuenta (se rellena sola). */
function nfSeccionHTML() {
    return `
    <section class="cu-seccion" id="nf-seccion">
        <h3>🔔 Notificaciones en este dispositivo</h3>
        <div id="nf-contenido"><p class="campo-ayuda">Comprobando…</p></div>
    </section>`;
}

async function nfPintar() {
    const cont = document.getElementById('nf-contenido');
    if (!cont) return;
    if (!nfSoportado()) {
        const ios = typeof pwaEsIOS === 'function' && pwaEsIOS();
        cont.innerHTML = `<p class="campo-ayuda">${ios
            ? 'En iPhone, primero instala la app: en Safari toca <strong>Compartir → "Añadir a pantalla de inicio"</strong>, ábrela desde el icono y vuelve aquí.'
            : 'Este navegador no permite notificaciones. Prueba con Chrome, Edge o Firefox.'}</p>`;
        return;
    }
    if (Notification.permission === 'denied') {
        cont.innerHTML = '<p class="campo-ayuda">Bloqueaste las notificaciones de VitalTraining en este navegador. Para activarlas, permítelas en los ajustes del sitio (el candado junto a la dirección).</p>';
        return;
    }
    let suscrito = false, recordatorio = true;
    try {
        const sub = await nfSuscripcionActual();
        if (sub) {
            const e = await apiFetch(`${API}/notificaciones/estado?endpoint=${encodeURIComponent(sub.endpoint)}`).then(r => r.json());
            suscrito = !!e?.suscrito;
            recordatorio = e?.recordatorio !== false;
        }
    } catch { /* sin service worker activo: se muestran apagadas */ }
    const esAtleta = ['Atleta', 'Futbolista'].includes(currentUser?.rol);
    cont.innerHTML = `
        <label class="cl-interruptor">
            <input type="checkbox" ${suscrito ? 'checked' : ''} onchange="nfCambiar(this.checked, this)">
            <span class="cl-interruptor-pista" aria-hidden="true"></span>
            <span><strong>Recibir avisos en este dispositivo</strong><small>Mensajes nuevos y avisos de tu médico${esAtleta ? ' (lesiones, notas) y de tu salud' : ''}.</small></span>
        </label>
        ${esAtleta ? `
        <label class="cl-interruptor" style="margin-top:10px">
            <input type="checkbox" ${recordatorio ? 'checked' : ''} ${suscrito ? '' : 'disabled'} onchange="nfRecordatorio(this.checked)">
            <span class="cl-interruptor-pista" aria-hidden="true"></span>
            <span><strong>Recordatorio cada mañana</strong><small>"¿Cómo amaneciste?" si aún no registraste tu salud.</small></span>
        </label>` : ''}
        ${suscrito ? '<button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="nfPrueba(this)">🔔 Enviarme una prueba</button>' : ''}`;
}

async function nfCambiar(activar, interruptor) {
    interruptor.disabled = true;
    try {
        if (activar) await nfActivar();
        else await nfDesactivar();
        showToast(activar ? 'Notificaciones activadas 🔔' : 'Notificaciones desactivadas');
    } catch (err) {
        showToast(err.message || 'No se pudieron cambiar las notificaciones.', 'error');
    }
    await nfPintar();
}

async function nfActivar(recordatorio = true) {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') throw new Error('Sin permiso no podemos avisarte. Puedes activarlo cuando quieras.');
    const { clave } = await apiFetch(`${API}/notificaciones/clave`).then(r => r.json());
    const registro = await nfRegistro();
    const sub = await registro.pushManager.getSubscription()
        || await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: nfClaveABytes(clave) });
    const res = await apiFetch(`${API}/notificaciones/suscribir`, { method: 'POST', body: JSON.stringify({ suscripcion: sub.toJSON(), recordatorio }) }).then(r => r.json());
    if (!res?.ok) throw new Error(res?.error || 'No se pudo activar.');
}

async function nfDesactivar() {
    const sub = await nfSuscripcionActual();
    if (!sub) return;
    await apiFetch(`${API}/notificaciones/suscribir`, { method: 'DELETE', body: JSON.stringify({ endpoint: sub.endpoint }) });
    await sub.unsubscribe();
}

async function nfRecordatorio(valor) {
    try {
        await nfActivar(valor); // misma suscripción: solo cambia la preferencia
        showToast(valor ? 'Te recordaremos cada mañana ☀️' : 'Recordatorio diario apagado');
    } catch (err) {
        showToast(err.message || 'No se pudo guardar.', 'error');
    }
}

async function nfPrueba(boton) {
    boton.disabled = true;
    const res = await apiFetch(`${API}/notificaciones/prueba`, { method: 'POST', body: '{}' }).then(r => r.json()).catch(() => null);
    boton.disabled = false;
    if (res?.enviados) showToast('Prueba enviada: mira tus notificaciones');
    else showToast('No llegó a ningún dispositivo. Desactívalas y vuelve a activarlas.', 'error');
}
