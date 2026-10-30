/* =============================================
   VitalTraining — pwa.js
   App instalable: registra el service worker (sw.js) y ofrece "Instalar VitalTraining".
   - Android y ordenador (Chrome, Edge): botón que abre el diálogo de instalación del navegador.
   - iPhone y iPad (Safari): Apple no permite ese botón, así que se explican los dos pasos.
   Si la persona lo cierra, no se le vuelve a ofrecer en 30 días.
============================================= */

const PWA_CLAVE_CERRADO = 'vt_pwa_cerrado';
const PWA_DIAS_SIN_INSISTIR = 30;
let _pwaEvento = null;

function pwaInstalada() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function pwaEsIOS() {
    const ua = navigator.userAgent;
    return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

function pwaCerradoHacePoco() {
    try {
        const cuando = Number(localStorage.getItem(PWA_CLAVE_CERRADO));
        return cuando > 0 && Date.now() - cuando < PWA_DIAS_SIN_INSISTIR * 86400000;
    } catch { return false; }
}

function pwaMostrar(contenido) {
    if (pwaInstalada() || pwaCerradoHacePoco() || document.getElementById('pwa-aviso')) return;
    const aviso = document.createElement('div');
    aviso.id = 'pwa-aviso';
    aviso.className = 'pwa-aviso';
    aviso.setAttribute('role', 'dialog');
    aviso.setAttribute('aria-label', 'Instalar VitalTraining');
    aviso.innerHTML = `
        <img src="img/icono-192.png" alt="" class="pwa-aviso-icono">
        <div class="pwa-aviso-texto">${contenido}</div>
        <button type="button" class="pwa-aviso-cerrar" aria-label="Ahora no" onclick="pwaCerrar()">✕</button>`;
    document.body.appendChild(aviso);
}

function pwaCerrar() {
    document.getElementById('pwa-aviso')?.remove();
    try { localStorage.setItem(PWA_CLAVE_CERRADO, String(Date.now())); } catch { /* sin almacenamiento: se volverá a ofrecer */ }
}

async function pwaInstalar() {
    if (!_pwaEvento) return;
    _pwaEvento.prompt();
    const { outcome } = await _pwaEvento.userChoice;
    _pwaEvento = null;
    document.getElementById('pwa-aviso')?.remove();
    if (outcome === 'accepted') showToast('¡Listo! Encuentra VitalTraining en tu pantalla de inicio 📲');
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.warn('Service worker:', err.message));
    });
}

// Chrome, Edge y Android avisan cuando la app se puede instalar
window.addEventListener('beforeinstallprompt', evento => {
    evento.preventDefault();
    _pwaEvento = evento;
    pwaMostrar(`<strong>Instala VitalTraining</strong><span>Ábrela desde tu pantalla de inicio, a pantalla completa, como cualquier app.</span>
        <button type="button" class="btn btn-primary btn-sm" onclick="pwaInstalar()">📲 Instalar</button>`);
});

window.addEventListener('appinstalled', () => document.getElementById('pwa-aviso')?.remove());

// En iPhone no hay evento: se explica a mano, y solo en Safari (el único que puede instalarla)
window.addEventListener('load', () => {
    const safari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
    if (pwaEsIOS() && safari) {
        setTimeout(() => pwaMostrar(`<strong>Instala VitalTraining en tu iPhone</strong>
            <span>Toca <b>Compartir</b> <span class="pwa-ios-compartir" aria-hidden="true">⬆︎</span> abajo y luego <b>"Añadir a pantalla de inicio"</b>.</span>`), 4000);
    }
});
