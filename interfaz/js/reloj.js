/**
 * Reloj y pulsómetro: importar la sesión del reloj (.tcx/.gpx) o medir el pulso en vivo con un
 * sensor Bluetooth (bandas de pecho, y relojes Garmin, Polar, Coros, Amazfit… con la opción de
 * "transmitir frecuencia cardiaca"). La sesión se guarda con su pulso, zonas y carga.
 */

const RELOJ_ZONAS = [
    { nombre: 'Z1 · Muy suave',  color: '#94a3b8' },
    { nombre: 'Z2 · Suave',      color: '#0ea5e9' },
    { nombre: 'Z3 · Moderada',   color: '#16a34a' },
    { nombre: 'Z4 · Intensa',    color: '#f59e0b' },
    { nombre: 'Z5 · Máxima',     color: '#ef4444' },
];
const RELOJ_TIPOS = ['Cardio', 'Resistencia', 'Velocidad', 'Técnica', 'Fuerza', 'Otro'];
const RELOJ_MAX_ARCHIVO_MB = 40;

/** Mi reloj (en el menú del atleta): importar, pulso en vivo y las sesiones guardadas con su pulso. */
async function pfRenderReloj() {
    const userId = currentUser.id;
    const res = await apiFetch(`${API}/reloj/${userId}/sesiones`).then(r => r.json()).catch(() => null);
    const sesiones = res?.sesiones || [];
    const fila = s => `
        <div class="mini-item" onclick="verSesionReloj(${userId}, ${Number(s.id)})" style="cursor:pointer">
            <div class="mini-item-icon red">${s.origen === 'bluetooth' ? '❤️' : '⌚'}</div>
            <div class="mini-item-body">
                <div class="mini-item-title">${escapeHtml(s.nombre)}</div>
                <div class="mini-item-sub">${formatFecha(s.fecha)} · ${s.minutos} min${s.distanciaM ? ` · ${relojFormatoDistancia(s.distanciaM)}` : ''}${s.fcMedia ? ` · ❤️ ${s.fcMedia} ppm` : ''}${s.carga ? ` · carga ${s.carga}` : ''}</div>
                ${s.zonas ? relojBarraZonasHTML(s.zonas) : ''}
            </div>
        </div>`;
    document.getElementById('pf-content').innerHTML = `
    <div class="view-enter">
        <div class="view-header"><div class="view-title"><h1>⌚ Mi reloj</h1><p>Tus sesiones con pulso: zonas, esfuerzo y carga calculados solos</p></div></div>
        ${relojTarjetaHTML(userId)}
        <div class="card">
            <div class="card-header"><h2>❤️ Sesiones con pulso (${sesiones.length})</h2></div>
            <div style="padding:16px">${sesiones.length ? sesiones.map(fila).join('')
                : showEmptyState('⌚', 'Aún no hay sesiones', 'Importa el archivo de tu reloj o mide tu pulso en vivo: verás tus zonas y la carga de cada sesión.')}</div>
        </div>
    </div>`;
}

/** Barra fina con el reparto de zonas (para la lista). */
function relojBarraZonasHTML(zonas) {
    const total = zonas.reduce((t, m) => t + m, 0) || 1;
    return `<div class="reloj-barra-zonas" aria-label="Tiempo en cada zona">${zonas.map((m, i) => m ? `<span style="width:${(m / total) * 100}%;background:${RELOJ_ZONAS[i].color}" title="${RELOJ_ZONAS[i].nombre}: ${Math.round(m)} min"></span>` : '').join('')}</div>`;
}

/** Tarjeta para importar o medir una sesión (en Mi reloj). */
function relojTarjetaHTML(userId) {
    return `
    <div class="card" style="margin-bottom:20px">
        <div class="card-header"><h2>⌚ Desde tu reloj</h2></div>
        <div style="padding:20px">
            <p class="reloj-intro">Guarda la sesión con tu pulso y la app calcula sola tus zonas, el esfuerzo y la carga.</p>
            <div class="reloj-acciones">
                <label class="btn btn-primary">📂 Importar archivo (.tcx / .gpx)
                    <input type="file" accept=".tcx,.gpx,.fit" hidden onchange="relojImportar(this, ${Number(userId)})">
                </label>
                <button class="btn btn-ghost" onclick="relojAbrirEnVivo(${Number(userId)})">❤️ Pulso en vivo</button>
                <button class="btn btn-ghost btn-sm" onclick="relojAyuda()">¿Cómo exporto desde mi reloj?</button>
            </div>
        </div>
    </div>`;
}

function relojAyuda() {
    openModal('⌚ Exportar la sesión del reloj', `
        <div class="reloj-ayuda">
            <p><strong>Garmin:</strong> en Garmin Connect (web), abre la actividad → ⚙️ → <em>Exportar a TCX</em>.</p>
            <p><strong>Polar:</strong> en Polar Flow, abre la sesión → <em>Exportar sesión</em> → TCX.</p>
            <p><strong>Coros / Suunto / Amazfit:</strong> en su app, abre la actividad → compartir o exportar → TCX o GPX.</p>
            <p><strong>Strava:</strong> en la web, abre la actividad → ⋯ → <em>Exportar GPX</em>.</p>
            <p><strong>Apple Watch:</strong> con una app como HealthFit, exporta el entrenamiento como TCX o GPX.</p>
            <p class="reloj-nota">❤️ <strong>Pulso en vivo</strong> funciona en Chrome (Android o computador) con una banda de pecho, o con un reloj que pueda <em>transmitir la frecuencia cardiaca</em> (Garmin, Polar, Coros, Amazfit…). En iPhone, importa el archivo.</p>
        </div>`);
}

// ── Importar archivo ─────────────────────────────────

async function relojImportar(input, userId) {
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    if (archivo.size > RELOJ_MAX_ARCHIVO_MB * 1024 * 1024) return showToast(`El archivo pesa más de ${RELOJ_MAX_ARCHIVO_MB} MB.`, 'error');
    let s;
    try {
        s = RelojArchivos.leerArchivo(archivo.name, await archivo.text());
    } catch (err) {
        return showToast(err.message, 'error', 5000);
    }
    showToast('Leyendo tu sesión…');
    await relojGuardar(userId, { ...s, origen: 'archivo', nombre: `${s.deporte} (reloj)`, fecha: RelojArchivos.fechaLocal(s.inicio) });
}

async function relojGuardar(userId, datos) {
    const res = await apiFetch(`${API}/reloj/${userId}/sesiones`, { method: 'POST', body: JSON.stringify(datos) })
        .then(r => r.json()).catch(() => null);
    if (!res?.ok) { showToast(res?.error || 'No se pudo guardar la sesión.', 'error', 5000); return false; }
    relojMostrarResumen(res.sesion);
    if (typeof pfRenderReloj === 'function' && document.querySelector('[data-pf-view="reloj"].active')) enSegundoPlano(pfRenderReloj());
    else if (typeof pfRenderHistorialRutinas === 'function' && document.getElementById('lista-rutinas')) enSegundoPlano(pfRenderHistorialRutinas());
    return true;
}

// ── Resumen y detalle ────────────────────────────────

function relojFormatoDistancia(m) {
    return m ? `${(m / 1000).toFixed(m >= 10000 ? 1 : 2).replace('.', ',')} km` : '—';
}

function relojZonasHTML(zonas) {
    if (!zonas) return '<p class="reloj-nota">Esta sesión no trae pulso: se guardó con su duración.</p>';
    const total = zonas.reduce((t, m) => t + m, 0) || 1;
    return `<div class="reloj-zonas">${zonas.map((m, i) => `
        <div class="reloj-zona">
            <span class="reloj-zona-nombre">${RELOJ_ZONAS[i].nombre}</span>
            <span class="reloj-zona-barra"><span style="width:${Math.round((m / total) * 100)}%;background:${RELOJ_ZONAS[i].color}"></span></span>
            <span class="reloj-zona-min">${Math.round(m)} min</span>
        </div>`).join('')}</div>`;
}

function relojDatosHTML(s) {
    const dato = (lbl, val, destacado) => `<div class="detalle-item"><span class="detalle-lbl">${lbl}</span><span class="detalle-val${destacado ? ' detalle-highlight' : ''}">${val}</span></div>`;
    return `<div class="detalle-grid">
        ${dato('Duración', `${s.minutos} min`, true)}
        ${dato('Distancia', relojFormatoDistancia(s.distanciaM))}
        ${dato('Pulso medio', s.fcMedia ? `${s.fcMedia} ppm` : '—')}
        ${dato('Pulso máximo', s.fcMax ? `${s.fcMax} ppm` : '—')}
        ${dato('Esfuerzo (1-10)', s.rpe ? `${s.rpe} · ${escapeHtml(s.intensidad)}` : '—')}
        ${dato('Carga', s.carga ? `${s.carga} UA` : '—')}
        ${s.calorias ? dato('Calorías (reloj)', `${s.calorias} kcal`) : ''}
    </div>`;
}

function relojMostrarResumen(s) {
    openModal(`✅ ${escapeHtml(s.nombre)}`, `
        ${relojDatosHTML(s)}
        <h3 class="reloj-subtitulo">Tiempo en cada zona</h3>
        ${relojZonasHTML(s.zonas)}
        <p class="reloj-nota">La sesión ya cuenta en tu carga de entrenamiento, tus logros y la clasificación.</p>`);
}

let relojGrafica = null;

async function verSesionReloj(userId, sesionId) {
    const res = await apiFetch(`${API}/reloj/${userId}/sesiones/${sesionId}`).then(r => r.json()).catch(() => null);
    if (!res?.ok) return showToast(res?.error || 'No se pudo abrir la sesión.', 'error');
    const s = res.sesion;
    openModal(`⌚ ${escapeHtml(s.nombre)}`, `
        <p class="reloj-nota">${formatFecha(s.fecha)} · ${s.origen === 'bluetooth' ? 'Pulsómetro Bluetooth' : 'Archivo del reloj'}</p>
        ${relojDatosHTML(s)}
        ${s.pulsos?.some(Boolean) ? '<div class="reloj-grafica"><canvas id="reloj-canvas"></canvas></div>' : ''}
        <h3 class="reloj-subtitulo">Tiempo en cada zona${s.fcMaxUsada ? ` <small>(FC máx. ${s.fcMaxUsada} ppm)</small>` : ''}</h3>
        ${relojZonasHTML(s.zonas)}`);
    document.querySelector('#modal-overlay .modal')?.classList.add('modal-wide');
    const canvas = document.getElementById('reloj-canvas');
    if (!canvas || typeof Chart === 'undefined') return;
    relojGrafica?.destroy();
    const minuto = i => Math.round((i * s.intervaloSeg) / 60);
    relojGrafica = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: s.pulsos.map((_, i) => minuto(i)),
            datasets: [{ label: 'Pulso (ppm)', data: s.pulsos.map(b => b || null), borderColor: '#ef4444',
                backgroundColor: 'rgba(239,68,68,0.10)', fill: true, pointRadius: 0, borderWidth: 2, tension: 0.25, spanGaps: false }],
        },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { title: { display: true, text: 'minuto' }, ticks: { maxTicksLimit: 10, font: { family: 'Outfit' } }, grid: { display: false } },
                y: { suggestedMin: 60, ticks: { font: { family: 'Outfit' } } },
            },
        },
    });
}

// ── Pulso en vivo (Bluetooth) ────────────────────────

const relojVivo = { dispositivo: null, muestras: [], inicio: null, ultimo: null, reloj: null, bloqueo: null, userId: null };

function relojAbrirEnVivo(userId) {
    if (!navigator.bluetooth) {
        return openModal('❤️ Pulso en vivo', `
            <p>Este navegador no permite conectar sensores por Bluetooth.</p>
            <p class="reloj-nota">Usa Chrome en Android o en el computador. En iPhone, importa el archivo que exporta la app de tu reloj.</p>`);
    }
    relojVivo.userId = userId;
    const grabando = Boolean(relojVivo.inicio);
    openModal('❤️ Pulso en vivo', `
        <div class="reloj-vivo">
            <div class="reloj-vivo-bpm" id="rv-bpm">--</div>
            <div class="reloj-vivo-lbl">ppm · <span id="rv-zona">sin sensor</span></div>
            <div class="reloj-vivo-tiempo" id="rv-tiempo">00:00</div>
            <div class="form-row reloj-vivo-campos">
                <div class="form-group" style="margin:0"><label for="rv-nombre">Sesión</label>
                    <input type="text" id="rv-nombre" value="Entrenamiento con pulsómetro" maxlength="80"></div>
                <div class="form-group" style="margin:0"><label for="rv-tipo">Tipo</label>
                    <select id="rv-tipo">${RELOJ_TIPOS.map(t => `<option>${t}</option>`).join('')}</select></div>
            </div>
            <div class="reloj-acciones" style="justify-content:center">
                <button class="btn btn-primary" id="rv-conectar" onclick="relojConectar()" ${grabando ? 'hidden' : ''}>🔗 Conectar sensor y empezar</button>
                <button class="btn btn-primary" id="rv-terminar" onclick="relojTerminar()" ${grabando ? '' : 'hidden'}>✅ Terminar y guardar</button>
                <button class="btn btn-ghost" id="rv-cancelar" onclick="relojCancelar()" ${grabando ? '' : 'hidden'}>Descartar</button>
            </div>
            <p class="reloj-nota">Puedes cerrar esta ventana: la sesión sigue midiendo hasta que la termines.</p>
        </div>`);
    relojPintar();
}

async function relojConectar() {
    try {
        const dispositivo = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
        const servidor = await dispositivo.gatt.connect();
        const servicio = await servidor.getPrimaryService('heart_rate');
        const medida = await servicio.getCharacteristic('heart_rate_measurement');
        await medida.startNotifications();
        medida.addEventListener('characteristicvaluechanged', e => {
            const v = e.target.value;
            // Bit 0 de las banderas: el pulso viene en 16 bits en vez de 8
            const bpm = v.getUint8(0) & 1 ? v.getUint16(1, true) : v.getUint8(1);
            relojVivo.ultimo = bpm;
            if (bpm > 0) relojVivo.muestras.push({ t: Date.now(), hr: bpm });
        });
        dispositivo.addEventListener('gattserverdisconnected', () => {
            if (relojVivo.inicio) showToast('Se perdió la conexión con el sensor. Termina la sesión o vuelve a conectar.', 'error', 5000);
            const b = document.getElementById('rv-conectar'); if (b) b.hidden = false;
        });
        relojVivo.dispositivo = dispositivo;
        relojVivo.inicio ||= Date.now();
        relojVivo.reloj ||= setInterval(relojPintar, 1000);
        try { relojVivo.bloqueo = await navigator.wakeLock?.request('screen'); } catch { /* la pantalla puede apagarse */ }
        ['rv-terminar', 'rv-cancelar'].forEach(id => { const b = document.getElementById(id); if (b) b.hidden = false; });
        const b = document.getElementById('rv-conectar'); if (b) b.hidden = true;
        showToast(`Conectado a ${dispositivo.name || 'tu sensor'} ✓`);
    } catch (err) {
        if (err.name !== 'NotFoundError') showToast('No se pudo conectar el sensor: ' + err.message, 'error', 5000);
    }
}

function relojPintar() {
    const bpm = document.getElementById('rv-bpm');
    if (!bpm) return;
    const pad = n => String(n).padStart(2, '0');
    const seg = relojVivo.inicio ? Math.floor((Date.now() - relojVivo.inicio) / 1000) : 0;
    document.getElementById('rv-tiempo').textContent = `${seg >= 3600 ? Math.floor(seg / 3600) + ':' : ''}${pad(Math.floor(seg / 60) % 60)}:${pad(seg % 60)}`;
    bpm.textContent = relojVivo.ultimo || '--';
    // Zona aproximada en pantalla (la definitiva la calcula el servidor con la edad del atleta)
    const fcMax = Math.max(190, ...relojVivo.muestras.map(m => m.hr));
    const z = relojVivo.ultimo ? [0.5, 0.6, 0.7, 0.8, 0.9].filter(l => relojVivo.ultimo / fcMax >= l).length : 0;
    document.getElementById('rv-zona').textContent = relojVivo.dispositivo ? (z ? RELOJ_ZONAS[z - 1].nombre : 'reposo') : 'sin sensor';
    bpm.style.color = z ? RELOJ_ZONAS[z - 1].color : '';
}

function relojLimpiar() {
    try { relojVivo.dispositivo?.gatt?.disconnect(); } catch { /* ya estaba desconectado */ }
    clearInterval(relojVivo.reloj);
    relojVivo.bloqueo?.release?.();
    Object.assign(relojVivo, { dispositivo: null, muestras: [], inicio: null, ultimo: null, reloj: null, bloqueo: null });
}

function relojCancelar() {
    if (!confirm('¿Descartar esta sesión sin guardarla?')) return;
    relojLimpiar();
    closeModal();
}

async function relojTerminar() {
    const fin = Date.now();
    const duracionSeg = Math.round((fin - relojVivo.inicio) / 1000);
    if (duracionSeg < 60) return showToast('La sesión debe durar al menos 1 minuto.', 'error');
    const intervaloSeg = Math.max(5, Math.ceil(duracionSeg / 4000));
    const datos = {
        origen: 'bluetooth',
        inicio: new Date(relojVivo.inicio).toISOString(),
        fecha: RelojArchivos.fechaLocal(relojVivo.inicio),
        duracionSeg, intervaloSeg,
        pulsos: RelojArchivos.remuestrear(relojVivo.muestras, relojVivo.inicio, fin, intervaloSeg),
        nombre: document.getElementById('rv-nombre')?.value.trim() || 'Entrenamiento con pulsómetro',
        tipo: document.getElementById('rv-tipo')?.value || 'Cardio',
    };
    const userId = relojVivo.userId;
    if (await relojGuardar(userId, datos)) relojLimpiar();
}
