/* =============================================
   VitalTraining — comun.js
   Lo que usan todos los paneles: sesión, llamadas al servidor,
   enrutador por rol, fotos de perfil, deportes, avisos y ventanas.
   Se carga primero.
============================================= */

const API = '/api';
let chartInstances = {};
let currentUser    = null;

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


// ── Counter animation ──────────────────────────────
function animateCounters(root) {
    root.querySelectorAll('.stat-value, .soporte-stat-val, .paciente-stat-val, .sk-val').forEach(el => {
        const raw = el.textContent.trim();
        const numero = /^\d+(?:\.\d+)?/.exec(raw)?.[0];
        if (!numero || Number(numero) === 0) return;
        const target = Number.parseFloat(numero);
        const suffix = raw.slice(numero.length);
        const duration = 700;
        const startTime = performance.now();
        const step = (now) => {
            const p = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (p < 1) requestAnimationFrame(step);
        };
        el.textContent = '0' + suffix;
        requestAnimationFrame(step);
    });
}

function setupCounterObservers() {
    ['content', 'nt-content', 'pf-content'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        new MutationObserver(() => {
            requestAnimationFrame(() => animateCounters(el));
        }).observe(el, { childList: true });
    });
}

// Dark mode
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('vt-dark', isDark ? '1' : '0');
}

(function applyDarkOnLoad() {
    if (localStorage.getItem('vt-dark') === '1') {
        document.body.classList.add('dark');
    }
})();
let pollInterval   = null;

function startPolling(fn, segundos = 30) {
    stopPolling();
    pollInterval = setInterval(fn, segundos * 1000);
}

function stopPolling() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

// ── Sesión ─────────────────────────────────────
function getSession()       { try { return JSON.parse(sessionStorage.getItem('vt_user')); } catch { return null; } }
function getToken()         { return sessionStorage.getItem('vt_token') || ''; }
function setSession(u, tok) { sessionStorage.setItem('vt_user', JSON.stringify(u)); sessionStorage.setItem('vt_token', tok); }
function clearSession()     { sessionStorage.removeItem('vt_user'); sessionStorage.removeItem('vt_token'); }

// ── Fetch con token ────────────────────────────
async function apiFetch(url, opts = {}) {
    opts.headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...(opts.headers || {}) };
    const res = await fetch(url, opts);
    if (res.status === 401) { clearSession(); showAuthPanel(); throw new Error('Sesión expirada'); }
    return res;
}

// ── Enrutador de paneles ───────────────────────
function normalizeRole(rol) { return rol === 'Futbolista' ? 'Atleta' : rol; }
const isAtletaRole = (rol) => ['Atleta', 'Futbolista'].includes(rol);

function routeUser(user, token) {
    setSession(user, token);
    currentUser = user;
    hideAllPanels();
    enSegundoPlano(refrescarMiCuenta());
    if      (isAtletaRole(user.rol))       enSegundoPlano(showPanelFutbolista(user));
    else if (user.rol === 'Nutricionista') showPanelNutricionista(user);
    else if (['Medico', 'Médico'].includes(user.rol)) showPanelMedico(user);
    else if (user.rol === 'Entrenador')    showPanelEntrenador(user);
    else if (user.rol === 'Administrador') showPanel(user);
    else { clearSession(); showAuthPanel(); }
}

// Trae el nombre y el deporte actuales: si alguien los cambió, la sesión guardada quedó vieja
async function refrescarMiCuenta() {
    const yo = await apiFetch(`${API}/cuenta/yo`).then(r => r.ok ? r.json() : null).catch(() => null);
    if (!yo || !currentUser || Number(yo.id) !== Number(currentUser.id)) return;
    if (yo.deporte_principal) currentUser.deporte_principal = yo.deporte_principal;
    if (yo.nombre !== currentUser.nombre) actualizarNombrePropio(yo.nombre);
    else setSession(currentUser, getToken());
}

function actualizarNombrePropio(nombre) {
    currentUser.nombre = nombre;
    setSession(currentUser, getToken());
    const corto = nombre.split(' ').slice(0, 2).join(' ');
    ['sidebar-name', 'nt-nombre', 'md-nombre', 'pf-nombre'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = corto;
    });
    pintarAvatarPropio();
}

function hideAllPanels() {
    ['app','panel-nutricionista','panel-medico','panel-entrenador','panel-futbolista','auth-screen','inicio-publico'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
}

function showAuthPanel() {
    setTitle('');
    currentUser = null;
    hideAllPanels();
    document.getElementById('auth-screen').classList.remove('hidden');
    showAuthScreen('screen-login');
}

/**
 * Datos deportivos del atleta (deporte, posición o especialidad, peso, altura, edad).
 * Los textos cambian según el deporte: en tenis es "Especialidad", en baloncesto "Mano dominante"...
 */
function fichaDeportivaHTML(ficha, { compacta = false } = {}) {
    if (!ficha) return '';
    const cfg = getSportFieldConfig(ficha.deporte);
    const etiqueta = txt => txt.replace(' *', '');
    const falta = txt => `<span class="ficha-falta">${txt}</span>`;
    const datos = [
        `<span title="Deporte">${getSportIcon(ficha.deporte)} ${escapeHtml(ficha.deporte)}</span>`,
        `<span title="${etiqueta(cfg.posicionLabel)}">🎯 ${ficha.posicion ? escapeHtml(ficha.posicion) : falta(`Sin ${etiqueta(cfg.posicionLabel).toLowerCase()}`)}</span>`,
        `<span title="Peso">⚖️ ${ficha.peso ? `${ficha.peso} kg` : falta('Peso sin registrar')}</span>`,
        `<span title="Altura">📏 ${ficha.altura ? `${ficha.altura} cm` : falta('Altura sin registrar')}</span>`
    ];
    if (!compacta) {
        if (ficha.edad) datos.push(`<span title="Edad">🎂 ${ficha.edad} años</span>`);
        if (ficha.lateralidad) datos.push(`<span title="${etiqueta(cfg.pieLabel)}">✋ ${escapeHtml(etiqueta(cfg.pieLabel))}: ${escapeHtml(ficha.lateralidad)}</span>`);
    }
    return `<div class="paciente-hero-meta ficha-deportiva">${datos.join('')}</div>`;
}

function getSportFieldConfig(deporte) {
    const config = {
        'Fútbol': {
            posicionLabel: 'Posición *',
            posicionOptions: ['Portero','Defensa Central','Lateral','Mediocampista','Extremo','Delantero'],
            frecuenciaLabel: 'Frecuencia de juego *',
            frecuenciaOptions: ['1-2 veces por semana','3-4 veces por semana','5+ veces por semana','Todos los días'],
            pieLabel: 'Pie dominante *',
            pieOptions: ['Derecho','Izquierdo','Ambos']
        },
        'Baloncesto': {
            posicionLabel: 'Posición *',
            posicionOptions: ['Base','Escolta','Alero','Pívot'],
            frecuenciaLabel: 'Sesiones por semana *',
            frecuenciaOptions: ['2-3 veces por semana','4-5 veces por semana','6+ veces por semana','Diario'],
            pieLabel: 'Mano dominante *',
            pieOptions: ['Derecha','Izquierda','Ambas']
        },
        'Tenis': {
            posicionLabel: 'Especialidad *',
            posicionOptions: ['Right-handed','Left-handed','Dobles','Individuales'],
            frecuenciaLabel: 'Frecuencia de entrenamiento *',
            frecuenciaOptions: ['1-2 días por semana','3-4 días por semana','5+ días por semana','Diario'],
            pieLabel: 'Mano dominante *',
            pieOptions: ['Derecha','Izquierda','Ambas']
        },
        'Béisbol': {
            posicionLabel: 'Posición *',
            posicionOptions: ['Lanzador','Receptor','Cuadro interior','Jardinero'],
            frecuenciaLabel: 'Sesiones por semana *',
            frecuenciaOptions: ['2-3 veces por semana','4-5 veces por semana','6+ veces por semana','Diario'],
            pieLabel: 'Mano de lanzar *',
            pieOptions: ['Derecha','Izquierda']
        },
        'Atletismo': {
            posicionLabel: 'Especialidad *',
            posicionOptions: ['Velocidad','Medio fondo','Saltos','Lanzamientos'],
            frecuenciaLabel: 'Sesiones por semana *',
            frecuenciaOptions: ['2-3 veces por semana','4-5 veces por semana','6+ veces por semana','Diario'],
            pieLabel: 'Pierna dominante *',
            pieOptions: ['Derecha','Izquierda','Ambas']
        },
        'Running': {
            posicionLabel: 'Distancia objetivo *',
            posicionOptions: ['5K - 10K','Media maratón','Maratón'],
            frecuenciaLabel: 'Días de carrera por semana *',
            frecuenciaOptions: ['2-3 días por semana','4-5 días por semana','6+ días por semana'],
            pieLabel: 'Pie dominante *',
            pieOptions: ['Derecho','Izquierdo','Ambos']
        },
        'Natación': {
            posicionLabel: 'Especialidad *',
            posicionOptions: ['Velocista','Fondista'],
            frecuenciaLabel: 'Sesiones por semana *',
            frecuenciaOptions: ['2-3 veces por semana','4-5 veces por semana','6+ veces por semana','Diario'],
            pieLabel: 'Lado de respiración *',
            pieOptions: ['Derecho','Izquierdo','Ambos']
        },
        'Boxeo': {
            posicionLabel: 'Modalidad *',
            posicionOptions: ['Competición','Recreativo'],
            frecuenciaLabel: 'Sesiones por semana *',
            frecuenciaOptions: ['2-3 veces por semana','4-5 veces por semana','6+ veces por semana'],
            pieLabel: 'Guardia *',
            pieOptions: ['Diestra (ortodoxa)','Zurda','Ambas']
        },
        'Gimnasio': {
            posicionLabel: 'Tu meta *',
            posicionOptions: ['Ganar músculo','Definir','Fuerza'],
            frecuenciaLabel: 'Días de gimnasio por semana *',
            frecuenciaOptions: ['2-3 días por semana','4-5 días por semana','6+ días por semana'],
            pieLabel: 'Lado dominante *',
            pieOptions: ['Derecho','Izquierdo','Ambos']
        },
        'Estar en forma': {
            posicionLabel: 'Nivel *',
            posicionOptions: ['Principiante','Intermedio','Avanzado'],
            frecuenciaLabel: 'Días de actividad por semana *',
            frecuenciaOptions: ['1-2 días por semana','3-4 días por semana','5+ días por semana'],
            pieLabel: 'Lado dominante *',
            pieOptions: ['Derecho','Izquierdo','Ambos']
        }
    };
    return config[deporte] || config['Fútbol'];
}

function updateSportSpecificFields() {
    const deporte = document.getElementById('reg-deporte')?.value || '';
    const posicionLabel = document.getElementById('reg-posicion-label');
    const frecuenciaLabel = document.getElementById('reg-frecuencia-label');
    const pieLabel = document.getElementById('reg-pie-label');
    const posicionSelect = document.getElementById('reg-posicion');
    const frecuenciaSelect = document.getElementById('reg-frecuencia');
    const pieSelect = document.getElementById('reg-pie');

    const choice = getSportFieldConfig(deporte);
    posicionLabel.textContent = choice.posicionLabel;
    frecuenciaLabel.textContent = choice.frecuenciaLabel;
    pieLabel.textContent = choice.pieLabel;

    posicionSelect.innerHTML = `<option value="">${choice.posicionLabel.replace('*','')}</option>${choice.posicionOptions.map(v => `<option value="${v}">${v}</option>`).join('')}`;
    frecuenciaSelect.innerHTML = `<option value="">${choice.frecuenciaLabel.replace('*','')}</option>${choice.frecuenciaOptions.map(v => `<option value="${v}">${v}</option>`).join('')}`;
    pieSelect.innerHTML = `<option value="">${choice.pieLabel.replace('*','')}</option>${choice.pieOptions.map(v => `<option value="${v}">${v}</option>`).join('')}`;
}

// ── Utilidades ─────────────────────────────────
function getInitials(name) { return name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase(); }

// — FOTOS DE PERFIL —
// Mismas reglas que comprueba el servidor (servidor/api/usuarios/fotos.service.js)
const FOTO_REGLAS = { formatos:['image/jpeg','image/png','image/webp'], maxArchivoMB:5, minLado:200, lado:400, maxKB:300 };
const _fotoVersion = {}; // cambia al subir/quitar la propia foto para no usar la copia guardada

function fotoUrl(id) {
    return `${API}/fotos/${id}${_fotoVersion[id] ? `?v=${_fotoVersion[id]}` : ''}`;
}

/**
 * Iniciales + hueco para la foto. Las fotos solo se sirven con sesión iniciada y un <img> no
 * puede enviar el token, así que cargarFotosPendientes() las pide con el token y las pinta.
 * Si la persona no tiene foto, la imagen se quita y quedan las iniciales.
 */
function avatarContenido(id, nombre) {
    const foto = id ? `<img class="avatar-foto" data-foto="${Number(id)}" alt="" hidden>` : '';
    return `${escapeHtml(getInitials(nombre || '?'))}${foto}`;
}

const FOTO_CACHE_MS = 5 * 60 * 1000;
const _fotoCache = new Map(); // url → { promesa de objectURL o null, hora }

function obtenerFoto(url) {
    const guardada = _fotoCache.get(url);
    if (guardada && Date.now() - guardada.hora < FOTO_CACHE_MS) return guardada.promesa;
    const promesa = fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(r => (r.ok ? r.blob() : null))
        .then(blob => (blob ? URL.createObjectURL(blob) : null))
        .catch(() => null);
    _fotoCache.set(url, { promesa, hora: Date.now() });
    return promesa;
}

function cargarFotosPendientes(raiz = document) {
    if (!getToken()) return;
    raiz.querySelectorAll?.('img[data-foto]:not([data-pedida])').forEach(img => {
        img.dataset.pedida = '1';
        obtenerFoto(fotoUrl(img.dataset.foto)).then(src => {
            if (!src) return img.remove();
            img.src = src;
            img.hidden = false;
        });
    });
}

// Cualquier avatar que aparezca en pantalla (vistas, chat, ventanas) carga su foto solo
new MutationObserver(() => cargarFotosPendientes()).observe(document.documentElement, { childList: true, subtree: true });

const AVATAR_PROPIO = ['sidebar-avatar', 'nt-avatar', 'md-avatar', 'en-avatar', 'pf-avatar'];

function pintarAvatarPropio() {
    if (!currentUser) return;
    for (const id of AVATAR_PROPIO) {
        const el = document.getElementById(id);
        if (!el) continue;
        el.innerHTML = avatarContenido(currentUser.id, currentUser.nombre);
        el.classList.add('avatar-editable');
        el.title = 'Mi cuenta: foto, contraseña y datos';
        el.setAttribute('role', 'button');
        el.tabIndex = 0;
        el.onclick = cuentaModal;
        el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cuentaModal(); } };
    }
    const grande = document.getElementById('perfil-foto');
    if (grande) grande.innerHTML = avatarContenido(currentUser.id, currentUser.nombre);
}

function modalFotoPerfil() {
    openModal('Foto de perfil', `
        <div class="foto-editor">
            <div class="foto-preview" id="foto-preview">${avatarContenido(currentUser.id, currentUser.nombre)}</div>
            <div class="foto-reglas">
                <strong>Requisitos de la foto</strong>
                <ul>
                    <li>Formato <strong>JPG, PNG o WebP</strong></li>
                    <li>Peso máximo <strong>${FOTO_REGLAS.maxArchivoMB} MB</strong></li>
                    <li>Mínimo <strong>${FOTO_REGLAS.minLado} × ${FOTO_REGLAS.minLado} px</strong></li>
                    <li>Después podrás moverla y acercarla para encuadrarla</li>
                </ul>
                <p>La verán tu equipo y las personas con las que chateas.</p>
            </div>
        </div>
        <input type="file" id="foto-input" accept="${FOTO_REGLAS.formatos.join(',')}" hidden onchange="fotoElegida(this)">
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="quitarFotoPerfil()">Quitar foto</button>
            <button class="btn btn-primary" id="btn-elegir-foto" onclick="document.getElementById('foto-input').click()">Elegir foto</button>
        </div>`);
}

function cargarImagen(archivo) {
    return new Promise((ok, ko) => {
        const url = URL.createObjectURL(archivo);
        const img = new Image();
        img.onload  = () => ok({ img, url });
        img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('imagen ilegible')); };
        img.src = url;
    });
}

// Editor de recorte: la foto se arrastra dentro del círculo y se acerca con la barra o la rueda
const RECORTE_VISOR = 280; // px del círculo en pantalla
let _recorte = null;       // { img, url, escalaMin, zoom, x, y } — x, y: esquina de la foto dentro del visor

function recorteEscala() { return _recorte.escalaMin * _recorte.zoom; }

function recorteLimitar() {
    const r = _recorte, e = recorteEscala();
    r.x = Math.min(0, Math.max(RECORTE_VISOR - r.img.naturalWidth * e, r.x));
    r.y = Math.min(0, Math.max(RECORTE_VISOR - r.img.naturalHeight * e, r.y));
}

function recortePintar() {
    const el = document.getElementById('recorte-img');
    if (el) el.style.transform = `translate(${_recorte.x}px, ${_recorte.y}px) scale(${recorteEscala()})`;
}

/** Cambia el zoom manteniendo fijo el centro del círculo. */
function recorteZoom(nuevo) {
    const r = _recorte;
    const antes = recorteEscala();
    const cx = (RECORTE_VISOR / 2 - r.x) / antes, cy = (RECORTE_VISOR / 2 - r.y) / antes;
    r.zoom = Math.min(4, Math.max(1, Number(nuevo)));
    const despues = recorteEscala();
    r.x = RECORTE_VISOR / 2 - cx * despues;
    r.y = RECORTE_VISOR / 2 - cy * despues;
    recorteLimitar();
    recortePintar();
    const barra = document.getElementById('recorte-zoom');
    if (barra && Number(barra.value) !== r.zoom) barra.value = r.zoom;
}

function recorteMover(dx, dy) {
    _recorte.x += dx;
    _recorte.y += dy;
    recorteLimitar();
    recortePintar();
}

function abrirRecorte({ img, url }) {
    const escalaMin = RECORTE_VISOR / Math.min(img.naturalWidth, img.naturalHeight); // la foto siempre cubre el círculo
    _recorte = { img, url, escalaMin, zoom: 1, x: 0, y: 0 };
    _recorte.x = (RECORTE_VISOR - img.naturalWidth * escalaMin) / 2;
    _recorte.y = (RECORTE_VISOR - img.naturalHeight * escalaMin) / 2;

    openModal('Ajusta tu foto', `
        <p class="recorte-ayuda">Arrastra la foto para colocarla y usa la barra (o la rueda del ratón) para acercar.</p>
        <div class="recorte-visor" id="recorte-visor" tabindex="0" aria-label="Arrastra la foto o usa las flechas para moverla; + y - para el zoom">
            <img id="recorte-img" src="${url}" alt="" draggable="false">
            <div class="recorte-mascara"></div>
        </div>
        <div class="recorte-zoom-fila">
            <span aria-hidden="true">−</span>
            <input type="range" id="recorte-zoom" class="range-green" min="1" max="4" step="0.01" value="1" oninput="recorteZoom(this.value)" aria-label="Zoom">
            <span aria-hidden="true">+</span>
        </div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="cerrarRecorte(); modalFotoPerfil()">Cancelar</button>
            <button class="btn btn-primary" id="btn-guardar-recorte" onclick="guardarRecorte()">Guardar foto</button>
        </div>`);
    recortePintar();

    const visor = document.getElementById('recorte-visor');
    let arrastre = null;
    visor.addEventListener('pointerdown', e => {
        arrastre = { x: e.clientX, y: e.clientY };
        visor.setPointerCapture(e.pointerId);
        visor.classList.add('arrastrando');
    });
    visor.addEventListener('pointermove', e => {
        if (!arrastre) return;
        recorteMover(e.clientX - arrastre.x, e.clientY - arrastre.y);
        arrastre = { x: e.clientX, y: e.clientY };
    });
    const soltar = () => { arrastre = null; visor.classList.remove('arrastrando'); };
    visor.addEventListener('pointerup', soltar);
    visor.addEventListener('pointercancel', soltar);
    visor.addEventListener('wheel', e => {
        e.preventDefault();
        recorteZoom(_recorte.zoom - Math.sign(e.deltaY) * 0.1);
    }, { passive: false });
    visor.addEventListener('keydown', e => {
        const paso = 10;
        const acciones = {
            ArrowLeft: () => recorteMover(paso, 0), ArrowRight: () => recorteMover(-paso, 0),
            ArrowUp: () => recorteMover(0, paso),   ArrowDown: () => recorteMover(0, -paso),
            '+': () => recorteZoom(_recorte.zoom + 0.1), '-': () => recorteZoom(_recorte.zoom - 0.1)
        };
        if (acciones[e.key]) { e.preventDefault(); acciones[e.key](); }
    });
    visor.focus();
}

function cerrarRecorte() {
    if (_recorte) URL.revokeObjectURL(_recorte.url);
    _recorte = null;
}

/** Comprime a JPEG bajando la calidad hasta quedar bajo el límite del servidor. */
function comprimirCanvas(canvas) {
    let dataUrl = '';
    for (const calidad of [0.88, 0.8, 0.7, 0.55, 0.4]) {
        dataUrl = canvas.toDataURL('image/jpeg', calidad);
        const bytes = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4);
        if (bytes <= FOTO_REGLAS.maxKB * 1024) break;
    }
    return dataUrl;
}

async function guardarRecorte() {
    if (!_recorte) return;
    const r = _recorte, lado = FOTO_REGLAS.lado, factor = lado / RECORTE_VISOR, e = recorteEscala();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = lado;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; // fondo blanco para PNG con transparencia
    ctx.fillRect(0, 0, lado, lado);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(r.img, r.x * factor, r.y * factor, r.img.naturalWidth * e * factor, r.img.naturalHeight * e * factor);
    const foto = comprimirCanvas(canvas);

    const boton = document.getElementById('btn-guardar-recorte');
    if (boton) { boton.disabled = true; boton.textContent = 'Guardando...'; }
    const res = await apiFetch(`${API}/cuenta/foto`, { method:'PUT', body:JSON.stringify({ foto }) }).then(x => x.json()).catch(() => null);
    if (!res?.ok) {
        if (boton) { boton.disabled = false; boton.textContent = 'Guardar foto'; }
        return showToast(res?.error || 'No se pudo guardar la foto.', 'error');
    }
    cerrarRecorte();
    _fotoVersion[currentUser.id] = res.version;
    pintarAvatarPropio();
    modalFotoPerfil();
    showToast('Foto de perfil actualizada');
}

async function fotoElegida(input) {
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    if (!FOTO_REGLAS.formatos.includes(archivo.type)) return showToast('Formato no permitido. Usa JPG, PNG o WebP.', 'error');
    if (archivo.size > FOTO_REGLAS.maxArchivoMB * 1024 * 1024) return showToast(`La foto pesa más de ${FOTO_REGLAS.maxArchivoMB} MB.`, 'error');

    let cargada;
    try { cargada = await cargarImagen(archivo); } catch { return showToast('No se pudo leer la imagen.', 'error'); }
    if (Math.min(cargada.img.naturalWidth, cargada.img.naturalHeight) < FOTO_REGLAS.minLado) {
        URL.revokeObjectURL(cargada.url);
        return showToast(`La foto es muy pequeña: mínimo ${FOTO_REGLAS.minLado} × ${FOTO_REGLAS.minLado} px.`, 'error');
    }
    abrirRecorte(cargada);
}

async function quitarFotoPerfil() {
    const res = await apiFetch(`${API}/cuenta/foto`, { method:'DELETE' }).then(r => r.json()).catch(() => null);
    if (!res?.ok) return showToast('No se pudo quitar la foto.', 'error');
    _fotoVersion[currentUser.id] = Date.now();
    pintarAvatarPropio();
    const preview = document.getElementById('foto-preview');
    if (preview) preview.innerHTML = avatarContenido(null, currentUser.nombre);
    showToast('Foto quitada');
}

function formatFecha(str) {
    if (!str) return '—';
    // ISO yyyy-mm-dd → dd/mm/yyyy
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const [y,m,d] = str.slice(0,10).split('-');
        return `${d}/${m}/${y}`;
    }
    return str;
}

function avatarColor(name) {
    const c=[['#16a34a','#059669'],['#0ea5e9','#0284c7'],['#8b5cf6','#7c3aed'],['#f59e0b','#d97706'],['#ef4444','#dc2626'],['#ec4899','#db2777']];
    let h=0; for(let x of name) h=(h*31+x.charCodeAt(0))%c.length; return c[h];
}

function normalizeDisplayRole(rol) {
    if (['Futbolista', 'Atleta'].includes(rol)) return 'Atleta';
    return ['Medico', 'Médico'].includes(rol) ? 'Médico' : rol;
}
// Mismos deportes que el servidor (servidor/compartido/deportes.js)
const DEPORTES_APP = ['Fútbol','Baloncesto','Tenis','Béisbol','Atletismo','Running','Natación','Boxeo','Gimnasio','Estar en forma'];
const ICONOS_DEPORTE = { 'Fútbol':'⚽', 'Baloncesto':'🏀', 'Tenis':'🎾', 'Béisbol':'⚾', 'Atletismo':'🏃', 'Running':'👟', 'Natación':'🏊', 'Boxeo':'🥊', 'Gimnasio':'🏋️', 'Estar en forma':'💪' };
const SIN_COMPETICION = ['Gimnasio','Estar en forma'];
const DIAS_SEMANA = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
function getSportIcon(sport) { return ICONOS_DEPORTE[sport] || '🏅'; }
function getSportLabel(sport) { return sport || 'Deporte'; }
function getSportBadge(sport) { return `${getSportIcon(sport)} ${sport || 'Deporte'}`; }
function rolBadge(rol)      { const m={'Atleta':'badge-futbolista','Futbolista':'badge-futbolista','Nutricionista':'badge-nutricionista','Administrador':'badge-administrador','Medico':'badge-medico','Médico':'badge-medico','Entrenador':'badge-entrenador'}; return `<span class="badge ${m[rol]||''}">${normalizeDisplayRole(rol)}</span>`; }
function getSportBadgeNeutral(sport) { return getSportBadge(sport || 'Fútbol'); }
function estadoBadge(e)     { const m={'Activo':'badge-activo','Inactivo':'badge-inactivo'}; return `<span class="badge ${m[e]||''}">${e}</span>`; }
function prioridadBadge(p)  { const m={'alta':'badge-alta','media':'badge-media','baja':'badge-baja','critica':'badge-critica'}; return `<span class="badge ${m[p]||''}">${p}</span>`; }
function incEstadoBadge(e)  { const m={'abierta':'badge-abierta','en progreso':'badge-en-progreso','resuelta':'badge-resuelta'}; return `<span class="badge ${m[e]||''}">${e}</span>`; }

/**
 * Lanza una tarea asíncrona (cargar una pantalla, refrescar contadores...) sin esperarla.
 * Si falla, avisa con un mensaje en vez de dejar la pantalla a medias sin explicación.
 */
function enSegundoPlano(promesa) {
    Promise.resolve(promesa).catch(err => {
        console.error(err);
        showToast('Algo no se pudo cargar. Revisa tu conexión e inténtalo de nuevo.', 'error');
    });
}

function showToast(msg, type='success', ms=2700) {
    document.querySelectorAll('.toast').forEach(t=>t.remove());
    const t=document.createElement('div'); t.className=`toast ${type}`; t.textContent=msg;
    document.body.appendChild(t); setTimeout(()=>t.remove(),ms);
}
function showLoading() {
    const s = (w,h='14px') => `<div class="skeleton" style="height:${h};max-width:${w};margin-bottom:0"></div>`;
    return `
    <div class="view-enter" style="padding:0">
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:28px">
            <div class="skeleton" style="width:52px;height:52px;border-radius:50%;flex-shrink:0"></div>
            <div style="flex:1;display:flex;flex-direction:column;gap:9px">${s('42%','22px')}${s('26%','11px')}</div>
        </div>
        <div class="sk-stats">
            ${[0,0,0,0].map(()=>`<div class="sk-card"><div class="skeleton" style="width:42px;height:42px;border-radius:10px"></div>${s('50%','26px')}${s('68%','11px')}</div>`).join('')}
        </div>
        <div class="sk-grid">
            ${[0,0].map(()=>`<div class="sk-card">${s('55%','16px')}<div style="height:6px"></div>${[0,0,0].map(()=>`<div style="display:flex;gap:10px;align-items:center;margin-bottom:9px">${s('38%')}${s('20%')}</div>`).join('')}</div>`).join('')}
        </div>
    </div>`;
}

function showEmptyState(icon, titulo, desc, btnLabel='', btnAction='') {
    return `<div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <h3>${titulo}</h3>
        <p>${desc}</p>
        ${btnLabel ? `<button class="btn btn-primary" style="margin-top:8px" onclick="${btnAction}">${btnLabel}</button>` : ''}
    </div>`;
}

function showError(msg, retryFn='') {
    return `<div class="error-state">
        <div class="error-icon">⚠</div>
        <h3>Algo salió mal</h3>
        <p>${msg || 'No se pudo cargar la información.'}</p>
        ${retryFn ? `<button class="btn btn-danger" style="margin-top:8px" onclick="${retryFn}">Reintentar</button>` : ''}
    </div>`;
}

function setTitle(seccion) {
    document.title = seccion ? `${seccion} — VitalTraining` : 'VitalTraining';
}

function toggleSidebar(panelId) {
    document.getElementById(panelId).classList.toggle('sidebar-open');
}

function closeSidebar() {
    ['app','panel-nutricionista','panel-medico','panel-entrenador','panel-futbolista'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sidebar-open');
    });
}

function openModal(title,body) { const ov=document.getElementById('modal-overlay'); document.getElementById('modal-title').textContent=title; document.getElementById('modal-body').innerHTML=body; ov.querySelector('.modal')?.classList.remove('modal-wide'); ov.classList.remove('hidden'); }
// Pulsar fuera de la ventana (sobre el fondo) la cierra
document.getElementById('modal-overlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
function closeModal()          { const ov=document.getElementById('modal-overlay'); ov.classList.add('hidden'); ov.querySelector('.modal').classList.remove('modal-wide'); }
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });
