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
                <button class="btn btn-ghost btn-sm" onclick="relojGuia()">📘 Guía para conectar tu reloj</button>
            </div>
        </div>
    </div>`;
}

// ── Guía por marca ───────────────────────────────────
// Cómo activar el pulso en vivo (transmitir la frecuencia cardiaca por Bluetooth) y cómo sacar el
// archivo de cada marca. Los menús cambian según el modelo y la versión: los nombres son orientativos.
const STRAVA_GPX = 'Con la cuenta de Strava conectada, abre la actividad en strava.com desde un computador → ⋯ → <em>Exportar GPX</em> e impórtalo en Mi reloj.';
const RELOJ_GUIAS = [
    { id: 'xiaomi', nombre: 'Xiaomi / Redmi', patron: /xiaomi|redmi|mi band|mi smart|band \d/i,
      vivo: ['En la banda o el reloj: <em>Ajustes → Frecuencia cardiaca</em> (o <em>Ejercicio</em>) → activa <em>Transmitir frecuencia cardiaca</em> ("Heart rate broadcast"). No todos los modelos la tienen.',
             'Si no está en la banda, búscala en <em>Mi Fitness → Dispositivo → Frecuencia cardiaca</em>.',
             'En algunos modelos solo transmite con un entrenamiento en curso: inicia uno (por ejemplo "Correr") y luego conecta.'],
      archivo: ['En <em>Mi Fitness → Perfil → Cuentas de terceros</em> (o "Servicios conectados") conecta <strong>Strava</strong>.', STRAVA_GPX] },
    { id: 'amazfit', nombre: 'Amazfit (Zepp)', patron: /amazfit|zepp|gtr|gts|bip|balance|cheetah|t-rex/i,
      vivo: ['En el reloj: <em>Ajustes → Frecuencia cardiaca → Compartir frecuencia cardiaca</em>, o en la app <em>Zepp → tu reloj → Compartir frecuencia cardiaca</em>.',
             'Si no aparece en la lista, inicia un entrenamiento en el reloj y vuelve a conectar.'],
      archivo: ['En <em>Zepp → Perfil → Agregar cuentas</em> conecta <strong>Strava</strong>.', STRAVA_GPX] },
    { id: 'garmin', nombre: 'Garmin', patron: /garmin|forerunner|fenix|venu|vivo|instinct|epix/i,
      vivo: ['En el reloj: <em>Ajustes → Sensores y accesorios → Frecuencia cardiaca de muñeca → Transmitir frecuencia cardiaca</em> (en algunos modelos, desde el widget de frecuencia cardiaca).'],
      archivo: ['En <strong>Garmin Connect</strong> desde el navegador: abre la actividad → ⚙️ → <em>Exportar a TCX</em>.'] },
    { id: 'polar', nombre: 'Polar', patron: /polar/i,
      vivo: ['Activa <em>Compartir frecuencia cardiaca con otros dispositivos</em> en el perfil deportivo (en Polar Flow o en el reloj) e inicia un entrenamiento.',
             'Las bandas Polar H9/H10 funcionan directamente: póntelas y pulsa "Conectar sensor".'],
      archivo: ['En <strong>Polar Flow</strong> (web): abre la sesión → <em>Exportar sesión</em> → TCX o GPX.'] },
    { id: 'coros', nombre: 'Coros', patron: /coros|pace|apex|vertix/i,
      vivo: ['En el reloj: <em>Ajustes → Compartir FC</em> ("Heart rate broadcast") y luego conecta.'],
      archivo: ['En la app <strong>Coros</strong>: abre la actividad → compartir/exportar → .tcx o .gpx.'] },
    { id: 'huawei', nombre: 'Huawei / Honor', patron: /huawei|honor|watch gt|watch fit/i,
      vivo: ['En algunos modelos: <em>Huawei Health → tu reloj → Compartir datos de frecuencia cardiaca</em> (o en el reloj, en Ajustes de ejercicio). Si no está, tu modelo no lo transmite.'],
      archivo: ['Huawei Health no exporta archivos directamente. Si tu versión permite conectar <strong>Strava</strong> (en Perfil → Compartir datos), úsalo: ' + STRAVA_GPX,
                'Si no, guarda la sesión con su duración y marca qué tan dura fue (1 a 10).'] },
    { id: 'samsung', nombre: 'Samsung Galaxy Watch', patron: /galaxy|samsung/i,
      vivo: ['El Galaxy Watch no transmite el pulso a otras apps sin instalar una app adicional en el reloj: lo más fácil es importar el archivo.'],
      archivo: ['En <strong>Samsung Health → Ajustes → Servicios conectados</strong> conecta <strong>Strava</strong> (si aparece en tu versión).', STRAVA_GPX] },
    { id: 'apple', nombre: 'Apple Watch', patron: /apple/i,
      vivo: ['En iPhone las páginas web no pueden usar Bluetooth: usa la importación de archivo.'],
      archivo: ['Instala una app como <strong>HealthFit</strong> o <strong>RunGap</strong>, exporta el entrenamiento como TCX o GPX y súbelo aquí. También puedes conectar Strava y exportar desde strava.com.'] },
    { id: 'fitbit', nombre: 'Fitbit / Google Pixel Watch', patron: /fitbit|pixel/i,
      vivo: ['Fitbit no transmite el pulso en vivo a otras apps.'],
      archivo: ['Desde fitbit.com o la app: abre el ejercicio → <em>Exportar como TCX</em> (si tu cuenta lo permite), o conecta Strava y exporta el GPX.'] },
    { id: 'economicos', nombre: 'Relojes económicos (H Band, FitCloudPro, Da Fit…)', patron: /zw\d|hband|fitcloud|dafit|da fit|glory|wearfit|jyou/i,
      vivo: ['La mayoría solo envía el pulso a su propia app. Pruébalo: pulsa <em>"¿No aparece tu reloj? Buscar todos"</em> y elige tu reloj; la app te dirá si es compatible.',
             'Cierra antes su app oficial: muchos solo se conectan a una app a la vez.'],
      archivo: ['Busca en su app si permite conectar <strong>Strava</strong> o exportar la actividad. Si no, guarda la sesión con su duración y marca qué tan dura fue (1 a 10).'] },
    { id: 'banda', nombre: 'Banda de pecho', patron: /h10|h9|hrm|tickr|chest|banda|heart rate/i,
      vivo: ['Humedece los electrodos, ajústala bajo el pecho y pulsa <em>"Conectar sensor y empezar"</em>: aparece sola en la lista (Polar H9/H10, Garmin HRM, Wahoo TICKR, Coospo, Magene…).',
             'Es la opción más fiable para medir el pulso en vivo.'],
      archivo: ['La banda no guarda archivos: usa el pulso en vivo.'] },
];

function relojMarcaDe(nombre) {
    return RELOJ_GUIAS.find(g => g.patron.test(String(nombre || '')))?.id || null;
}

/** Guía para conectar el reloj: requisitos y pasos de la marca elegida. */
function relojGuia(marca = null) {
    const g = RELOJ_GUIAS.find(x => x.id === marca);
    const lista = pasos => `<ol class="reloj-guia-pasos">${pasos.map(p => `<li>${p}</li>`).join('')}</ol>`;
    openModal('📘 Conecta tu reloj', `
        <div class="reloj-guia">
            <p class="reloj-nota">Elige tu marca. Hay dos formas: <strong>pulso en vivo</strong> (el reloj transmite tu pulso mientras entrenas) o <strong>importar el archivo</strong> de tu entrenamiento.</p>
            <div class="reloj-guia-marcas">${RELOJ_GUIAS.map(x => `<button type="button" class="btn btn-sm ${x.id === marca ? 'btn-primary' : 'btn-ghost'}" onclick="relojGuia('${x.id}')">${x.nombre}</button>`).join('')}</div>
            ${g ? `
            <h3 class="reloj-subtitulo">❤️ Pulso en vivo · ${g.nombre}</h3>${lista(g.vivo)}
            <h3 class="reloj-subtitulo">📂 Importar el archivo · ${g.nombre}</h3>${lista(g.archivo)}` : ''}
            <div class="reloj-guia-requisitos">
                <strong>Para el pulso en vivo necesitas:</strong>
                <ul>
                    <li><strong>Google Chrome</strong> en Android o en el computador (en iPhone y en Brave no funciona).</li>
                    <li>Bluetooth encendido y, en <em>Ajustes → Apps → Chrome → Permisos</em>, permitir <em>Dispositivos cercanos</em> (o <em>Ubicación</em>).</li>
                    <li>Cerrar la app oficial del reloj si no aparece: algunos solo se conectan a una app a la vez.</li>
                </ul>
                <p class="reloj-nota">¿Tu sesión llegó sin pulso? Ábrela en Mi reloj y marca qué tan dura fue (1 a 10): así cuenta en tu carga igual.</p>
            </div>
        </div>`);
    document.querySelector('#modal-overlay .modal')?.classList.add('modal-wide');
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
        ${relojPedirEsfuerzoHTML(s)}
        <h3 class="reloj-subtitulo">Tiempo en cada zona</h3>
        ${relojZonasHTML(s.zonas)}
        <p class="reloj-nota">La sesión ya cuenta en tu carga de entrenamiento, tus logros y la clasificación.</p>`);
}

/** Sin pulso: el atleta dice qué tan dura fue la sesión para que cuente bien en su carga. */
function relojPedirEsfuerzoHTML(s) {
    if (s.fcMedia || !s.id) return '';
    const ayuda = { 1: 'Muy suave', 3: 'Suave', 5: 'Moderada', 7: 'Dura', 9: 'Muy dura', 10: 'Máxima' };
    return `
        <div class="reloj-esfuerzo">
            <strong>${s.rpe ? 'Esfuerzo guardado: ' + s.rpe + '/10 · puedes cambiarlo' : '¿Qué tan dura fue esta sesión?'}</strong>
            <p class="reloj-nota">El archivo no traía tu pulso: con tu respuesta calculamos el esfuerzo y la carga.</p>
            <div class="reloj-esfuerzo-botones">${Array.from({ length: 10 }, (_, i) => i + 1).map(n => `
                <button type="button" class="btn btn-sm ${s.rpe === n ? 'btn-primary' : 'btn-ghost'}" title="${ayuda[n] || ''}" onclick="relojGuardarEsfuerzo(${Number(s.id)}, ${n})">${n}</button>`).join('')}</div>
            <div class="reloj-esfuerzo-escala"><span>Muy suave</span><span>Máxima</span></div>
        </div>`;
}

async function relojGuardarEsfuerzo(sesionId, rpe) {
    const res = await apiFetch(`${API}/reloj/${currentUser.id}/sesiones/${sesionId}/esfuerzo`, { method: 'PUT', body: JSON.stringify({ rpe }) })
        .then(r => r.json()).catch(() => null);
    if (!res?.ok) return showToast(res?.error || 'No se pudo guardar el esfuerzo.', 'error');
    showToast(`Esfuerzo ${rpe}/10 guardado · carga ${res.sesion.carga} ✓`);
    enSegundoPlano(verSesionReloj(currentUser.id, sesionId));
    if (document.querySelector('[data-pf-view="reloj"].active')) enSegundoPlano(pfRenderReloj());
}

let relojGrafica = null;

async function verSesionReloj(userId, sesionId) {
    const res = await apiFetch(`${API}/reloj/${userId}/sesiones/${sesionId}`).then(r => r.json()).catch(() => null);
    if (!res?.ok) return showToast(res?.error || 'No se pudo abrir la sesión.', 'error');
    const s = res.sesion;
    openModal(`⌚ ${escapeHtml(s.nombre)}`, `
        <p class="reloj-nota">${formatFecha(s.fecha)} · ${s.origen === 'bluetooth' ? 'Pulsómetro Bluetooth' : 'Archivo del reloj'}</p>
        ${relojDatosHTML(s)}
        ${relojPedirEsfuerzoHTML(s)}
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
                <button class="btn btn-ghost btn-sm" onclick="relojConectar(true)" ${grabando ? 'hidden' : ''}>¿No aparece tu reloj? Buscar todos</button>
                <button class="btn btn-primary" id="rv-terminar" onclick="relojTerminar()" ${grabando ? '' : 'hidden'}>✅ Terminar y guardar</button>
                <button class="btn btn-ghost" id="rv-cancelar" onclick="relojCancelar()" ${grabando ? '' : 'hidden'}>Descartar</button>
            </div>
            <div id="rv-aviso" class="ev-aviso ev-aviso-alerta hidden"></div>
            <p class="reloj-nota">Puedes cerrar esta ventana: la sesión sigue midiendo hasta que la termines.</p>
        </div>`);
    relojPintar();
}

/** Mensaje claro para cada fallo de Bluetooth (antes algunos se quedaban sin aviso). */
function relojMensajeError(err, nombre) {
    const texto = String(err?.message || '');
    if (err?.name === 'NotFoundError' && /cancel/i.test(texto)) return null; // cerró la lista sin elegir
    if (err?.sinPulso) return `${nombre || 'Tu reloj'} se conectó, pero ahora no está compartiendo el pulso. Muchos relojes traen esa opción apagada ("Transmitir frecuencia cardiaca"): mira cómo activarla en tu marca. Si tu modelo no la tiene, importa sus entrenamientos como archivo o usa una banda de pecho.`;
    if (navigator.brave) return 'Brave trae el Bluetooth apagado para las páginas web. Abre VitalTraining en Google Chrome para usar el pulso en vivo.';
    if (/globally disabled|not available|adapter/i.test(texto) || err?.name === 'NotFoundError')
        return 'No se pudo usar el Bluetooth: enciéndelo y, en Ajustes del celular → Apps → Chrome → Permisos, permite "Dispositivos cercanos" (o "Ubicación").';
    if (err?.name === 'SecurityError' || err?.name === 'NotAllowedError') return 'El navegador no dio permiso para usar el Bluetooth. Revisa los permisos de Chrome y vuelve a intentarlo.';
    if (err?.name === 'NetworkError') return 'No se pudo conectar: acerca el reloj y cierra su app oficial (algunos relojes solo hablan con un celular a la vez).';
    return 'No se pudo conectar el sensor: ' + texto;
}

/**
 * todos=false: solo aparecen los sensores que comparten el pulso en formato estándar.
 * todos=true: aparece cualquier dispositivo cercano, para saber si un reloj que no salía es compatible.
 */
async function relojConectar(todos = false) {
    let dispositivo = null;
    try {
        dispositivo = await navigator.bluetooth.requestDevice(todos
            ? { acceptAllDevices: true, optionalServices: ['heart_rate'] }
            : { filters: [{ services: ['heart_rate'] }] });
        const servidor = await dispositivo.gatt.connect();
        const servicio = await servidor.getPrimaryService('heart_rate').catch(() => {
            try { dispositivo.gatt.disconnect(); } catch { /* ya desconectado */ }
            throw Object.assign(new Error('Sin servicio de pulso'), { sinPulso: true });
        });
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
        const mensaje = relojMensajeError(err, dispositivo?.name);
        if (mensaje) relojAvisoConexion(mensaje, relojMarcaDe(dispositivo?.name) || (err?.sinPulso ? '' : null));
    }
}

/** marca: id de la guía de esa marca ('' = guía general, null = sin enlace). */
function relojAvisoConexion(mensaje, marca = null) {
    const el = document.getElementById('rv-aviso');
    if (!el) return showToast(mensaje, 'error', 7000);
    const nombreMarca = RELOJ_GUIAS.find(g => g.id === marca)?.nombre;
    el.innerHTML = `${escapeHtml(mensaje)}${marca === null ? '' : `<br><button type="button" class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="relojGuia('${marca}')">📘 Cómo activarlo ${nombreMarca ? 'en ' + escapeHtml(nombreMarca.split(' (')[0]) : 'en tu reloj'}</button>`}`;
    el.classList.remove('hidden');
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
