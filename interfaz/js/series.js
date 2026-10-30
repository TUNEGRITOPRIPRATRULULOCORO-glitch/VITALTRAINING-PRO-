/* =============================================
   VitalTraining — series.js
   Registro serie a serie (atleta): en cada ejercicio de la rutina apunta peso y repeticiones,
   viendo la sesión anterior, su récord y la sugerencia de hoy. Celebra los récords nuevos.
============================================= */

// Ejercicios de la rutina que se pueden apuntar (se guardan por índice para no meter nombres en los onclick)
let _serEjercicios = [];
let _serHoy = {};

const serKg = kg => `${String(kg).replace('.', ',')} kg`;
const serSerieTxt = s => s.peso ? `${serKg(s.peso)} × ${s.repeticiones}` : `${s.repeticiones} reps`;

/** Se pueden apuntar los ejercicios por repeticiones (no los de tiempo ni los sprints de 1). */
function serApuntable(e) {
    return Number(e.repeticiones) > 1;
}

async function serCargarHoy() {
    const data = await apiFetch(`${API}/series/${currentUser.id}/hoy`).then(r => r.json()).catch(() => null);
    _serHoy = data?.ok ? data.series : {};
}

/** Botón "Series" de un ejercicio de la rutina, con cuántas lleva hoy. */
function serBoton(e) {
    let i = _serEjercicios.findIndex(x => x.nombre === e.nombre);
    if (i < 0) i = _serEjercicios.push({ nombre: e.nombre, objetivo: Number(e.repeticiones) || null }) - 1;
    const hechas = _serHoy[e.nombre] || 0;
    return `<button class="btn-series ${hechas ? 'btn-series-hecho' : ''}" data-ser="${i}" onclick="serModal(${i})">${hechas ? `✓ ${hechas} ${hechas === 1 ? 'serie' : 'series'}` : '📝 Series'}</button>`;
}

async function serModal(i) {
    const ej = _serEjercicios[i];
    if (!ej) return;
    openModal(ej.nombre, `<div id="ser-modal">${showLoading()}</div>`);
    await serPintar(i);
}

async function serPintar(i, celebrar = null) {
    const ej = _serEjercicios[i];
    const cont = document.getElementById('ser-modal');
    if (!cont) return;
    const q = new URLSearchParams({ nombre: ej.nombre, ...(ej.objetivo ? { objetivo: ej.objetivo } : {}) });
    const d = await apiFetch(`${API}/series/${currentUser.id}/ejercicio?${q}`).then(r => r.json()).catch(() => null);
    if (!d?.ok) { cont.innerHTML = '<p class="ls-vacio">No se pudo cargar el ejercicio.</p>'; return; }

    const ultimaHoy = d.hoy.at(-1);
    const pesoInicial = ultimaHoy ? ultimaHoy.peso : d.sugerencia.peso;
    const repsInicial = ultimaHoy ? ultimaHoy.repeticiones : (d.sugerencia.repeticiones || ej.objetivo || 10);
    const r = d.record;

    cont.innerHTML = `
        ${celebrar ? `<div class="ser-record-nuevo">🏆 <div><strong>¡Nuevo récord!</strong><span>${escapeHtml(celebrar)}</span></div></div>` : ''}
        <div class="ser-resumen">
            ${ej.objetivo ? `<div><span class="eq-lab">Objetivo</span><strong>${ej.objetivo} repeticiones</strong></div>` : ''}
            <div><span class="eq-lab">Tu récord</span><strong>${r ? `${serSerieTxt(r)}${r.e1rm ? ` <small>≈ ${serKg(r.e1rm)} máx.</small>` : ''}` : '—'}</strong></div>
            <div><span class="eq-lab">La vez anterior${d.anterior ? ` · ${formatFecha(d.anterior.fecha)}` : ''}</span>
                <strong>${d.anterior ? d.anterior.series.map(serSerieTxt).join(' · ') : 'Primera vez'}</strong></div>
        </div>
        <div class="ser-sugerencia">💡 ${escapeHtml(d.sugerencia.texto)}</div>
        <div class="ser-hoy">
            <span class="eq-lab">Hoy</span>
            ${d.hoy.length ? d.hoy.map((s, n) => `
            <div class="ser-fila">
                <span class="ser-num">${n + 1}</span>
                <strong>${serSerieTxt(s)}</strong>
                <button type="button" class="ser-borrar" aria-label="Borrar serie ${n + 1}" onclick="serBorrar(${i},${s.id})">✕</button>
            </div>`).join('') : '<p class="ls-vacio">Aún no apuntas series de este ejercicio hoy.</p>'}
        </div>
        <div class="ser-form">
            <div class="form-group"><label>Peso (kg)</label><input type="number" id="ser-peso" min="0" max="600" step="0.5" inputmode="decimal" placeholder="Sin peso" value="${pesoInicial ?? ''}"></div>
            <div class="form-group"><label>Repeticiones</label><input type="number" id="ser-reps" min="1" max="100" step="1" inputmode="numeric" value="${repsInicial}"></div>
            <button class="btn btn-primary" onclick="serAnadir(${i})">+ Serie ${d.hoy.length + 1}</button>
        </div>
        <p class="campo-ayuda">Deja el peso vacío si es con tu propio cuerpo. Las series se guardan con la fecha de hoy.</p>
        ${d.historial.length > 1 ? `
        <details class="ls-historial"><summary>Últimas sesiones</summary>
            ${d.historial.map(h => `<div class="ser-hist"><span>${formatFecha(h.fecha)}</span><span>Mejor: ${serSerieTxt(h.mejor)}</span><span>${h.volumen ? `Volumen ${h.volumen.toLocaleString('es-CO')} kg` : ''}</span></div>`).join('')}
        </details>` : ''}
        <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Listo</button></div>`;
}

async function serAnadir(i) {
    const ej = _serEjercicios[i];
    const peso = document.getElementById('ser-peso')?.value;
    const repeticiones = Number(document.getElementById('ser-reps')?.value);
    if (!repeticiones) return showToast('Escribe las repeticiones.', 'error');
    const res = await apiFetch(`${API}/series/${currentUser.id}`, {
        method: 'POST', body: JSON.stringify({ ejercicio: ej.nombre, peso: peso === '' ? null : Number(peso), repeticiones })
    }).then(r => r.json()).catch(() => null);
    if (!res?.ok) return showToast(res?.error || 'No se pudo guardar la serie.', 'error');
    _serHoy[ej.nombre] = (_serHoy[ej.nombre] || 0) + 1;
    serActualizarBoton(i);
    let celebrar = null;
    if (res.record) {
        celebrar = `${serSerieTxt(res.serie)}${res.e1rm ? ` (≈ ${serKg(res.e1rm)} máximo estimado)` : ''}. ¡Vita está orgullosa! 💪`;
        showToast('🏆 ¡Nuevo récord personal!');
    }
    // Un récord (o la primera marca) puede subir el rango del ejercicio
    const rango = await rgCelebrarSubida(`fuerza:${ej.nombre}`);
    if (rango) celebrar = `${celebrar ? `${celebrar} ` : ''}${rango.subio ? 'Subiste' : 'Tu primer rango'}: ${rango.rango.etiqueta}.`;
    await serPintar(i, celebrar);
}

async function serBorrar(i, id) {
    const res = await apiFetch(`${API}/series/${currentUser.id}/${id}`, { method: 'DELETE' }).then(r => r.json()).catch(() => null);
    if (!res?.ok) return showToast('No se pudo borrar la serie.', 'error');
    const nombre = _serEjercicios[i].nombre;
    _serHoy[nombre] = Math.max(0, (_serHoy[nombre] || 1) - 1);
    serActualizarBoton(i);
    await serPintar(i);
}

function serActualizarBoton(i) {
    const ej = _serEjercicios[i];
    document.querySelectorAll(`[data-ser="${i}"]`).forEach(b => {
        b.outerHTML = serBoton({ nombre: ej.nombre, repeticiones: ej.objetivo });
    });
}

/** Tarjeta "Mis récords" de la vista de rutina (solo si ya hay alguno). */
async function serPintarRecords(contenedorId) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    const data = await apiFetch(`${API}/series/${currentUser.id}/records`).then(r => r.json()).catch(() => null);
    const lista = data?.records || [];
    if (!lista.length) { cont.innerHTML = ''; return; }
    cont.innerHTML = `
    <details class="card ser-records" ${lista.length <= 4 ? 'open' : ''}>
        <summary class="card-header"><h2>🏆 Mis récords</h2><span class="ls-lesion-sub">${lista.length} ${lista.length === 1 ? 'ejercicio' : 'ejercicios'}</span></summary>
        <div class="ser-records-grid">
            ${lista.map(r => `
            <div class="ser-record">
                <div class="ser-record-nombre">${escapeHtml(r.ejercicio)}</div>
                <strong>${serSerieTxt(r.record)}${r.record.verificado ? ' <span class="vf-badge vf-ok" title="Verificado por tu entrenador">✓</span>' : ''}</strong>
                <span class="ls-lesion-sub">${r.record.e1rm ? `≈ ${serKg(r.record.e1rm)} máx. · ` : ''}${formatFecha(r.record.fecha)}</span>
            </div>`).join('')}
        </div>
    </details>`;
}
