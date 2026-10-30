/* =============================================
   VitalTraining — evaluaciones.js
   Tests físicos periódicos (atleta y médico).
============================================= */

// — TESTS FÍSICOS (atleta y médico) —
const EV_TENDENCIA = {
    mejora:      { clase:'ev-mejora',  texto: c => `▲ Mejora ${String(c).replace('.', ',')} %` },
    empeora:     { clase:'ev-empeora', texto: c => `▼ Baja ${String(Math.abs(c)).replace('.', ',')} %` },
    estable:     { clase:'ev-estable', texto: () => '= Sin cambio claro' },
    primera:     { clase:'ev-estable', texto: () => 'Primera marca' },
    'sin-datos': { clase:'ev-vacio',   texto: () => 'Sin registrar' }
};
let _evDatos = null; // última respuesta, para el formulario de registro

function evValor(prueba, valor) {
    if (valor == null) return '—';
    const dec = prueba.decimales ?? 1;
    // Tiempos largos (5 km, 400 m) se leen mejor en minutos: 1530 s → 25:30
    if (prueba.unidad === 's' && Number(valor) >= 120) {
        const s = Math.round(Number(valor));
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min`;
    }
    return `${Number(valor).toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec })} ${prueba.unidad}`;
}

function evAvisoHTML(d, propio) {
    const quien = propio ? 'Tu' : 'Su';
    if (d.proxima === 'sin-datos') return `<div class="ev-aviso ev-aviso-info">📋 ${propio ? 'Aún no tienes' : 'Aún no tiene'} tests registrados. Haz la primera evaluación para tener una marca de referencia.</div>`;
    if (d.proxima === 'atrasada') return `<div class="ev-aviso ev-aviso-alerta">⏰ ${quien} última evaluación fue hace <strong>${d.diasDesde} días</strong>. Toca repetir los tests (se recomiendan cada 4–6 semanas).</div>`;
    if (d.proxima === 'toca') return `<div class="ev-aviso ev-aviso-info">🗓 Han pasado ${d.diasDesde} días desde la última evaluación: buen momento para repetir los tests.</div>`;
    return `<div class="ev-aviso ev-aviso-ok">✅ Al día: próxima evaluación en unos ${Math.max(0, d.recomendacion.min - d.diasDesde)} días.</div>`;
}

function evTarjetaHTML(p, { puedeRegistrar, userId }) {
    const t = EV_TENDENCIA[p.tendencia] || EV_TENDENCIA['sin-datos'];
    // El atleta no borra una marca verificada por su entrenador
    const puedeBorrar = h => puedeRegistrar && (!h.verificado || Number(userId) !== Number(currentUser.id));
    const historial = [...p.historial].reverse().map(h => `
        <li><span>${formatFecha(h.fecha)}</span><strong>${evValor(p, h.valor)}</strong>
            ${h.verificado ? `<span class="vf-badge vf-ok" title="Registrado por ${escapeHtml(h.registradoPor || 'un profesional')}">✓</span>` : ''}
            ${puedeBorrar(h) ? `<button class="ev-borrar" title="Borrar este resultado" onclick="evBorrar(${Number(userId)}, ${h.id})">✕</button>` : ''}</li>`).join('');
    return `
    <div class="card ev-tarjeta">
        <div class="ev-cabecera">
            <div><div class="ev-nombre">${escapeHtml(p.nombre)}</div><div class="ev-mide">${escapeHtml(p.mide)}</div></div>
            <span class="ev-tendencia ${t.clase}">${t.texto(p.cambioPct)}</span>
        </div>
        <div class="ev-valor">${p.ultimo ? evValor(p, p.ultimo.valor) : '—'}${p.ultimo?.verificado ? ' <span class="vf-badge vf-ok">✓ Verificado</span>' : ''}</div>
        <div class="ev-detalle">${p.ultimo ? `${formatFecha(p.ultimo.fecha)}${p.mejorMarca ? ` · Mejor: <strong>${evValor(p, p.mejorMarca.valor)}</strong>` : ''}` : (p.mejor === 'menor' ? 'Menos es mejor' : 'Más es mejor')}</div>
        ${p.historial.length >= 2 ? `<div class="ev-grafica"><canvas id="ev-chart-${p.id}" aria-label="Evolución de ${escapeHtml(p.nombre)}"></canvas></div>` : ''}
        <details class="rd-explicacion"><summary>Cómo se hace</summary>${escapeHtml(p.instrucciones)}</details>
        ${p.historial.length ? `<details class="rd-explicacion"><summary>Historial (${p.historial.length})</summary><ul class="ev-historial">${historial}</ul></details>` : ''}
        ${puedeRegistrar && !p.ultimo ? `<button class="btn btn-ghost btn-sm" onclick="evModalRegistrar(${Number(userId)}, '${p.id}')">+ Registrar primera marca</button>` : ''}
    </div>`;
}

function evDibujarGraficas(pruebas) {
    if (typeof Chart === 'undefined') return;
    for (const p of pruebas) {
        const canvas = document.getElementById(`ev-chart-${p.id}`);
        if (!canvas) continue;
        chartInstances[`ev-${p.id}`] = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: p.historial.map(h => formatFecha(h.fecha)),
                datasets: [{ data: p.historial.map(h => h.valor), borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.12)', fill: true, tension: 0.3, pointRadius: 3 }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    // En pruebas de tiempo el eje va al revés: subir siempre es mejorar
                    y: { reverse: p.mejor === 'menor', grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { font: { family: 'Outfit', size: 10 }, maxTicksLimit: 3 } }
                },
                maintainAspectRatio: false
            }
        });
    }
}

/** Pinta la batería de tests de un atleta en un contenedor. */
async function evRender(contenedorId, userId, { propio }) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    cont.innerHTML = showLoading();
    const d = await apiFetch(`${API}/evaluaciones/${userId}`).then(r => r.json()).catch(() => null);
    if (!d?.ok) { cont.innerHTML = showError(escapeHtml(d?.error || 'No se pudieron cargar los tests.'), `evRender('${contenedorId}', ${Number(userId)}, { propio: ${propio} })`); return; }
    _evDatos = { ...d, userId, contenedorId, propio };
    const rolActual = normalizeRole(currentUser.rol);
    // En un equipo, el atleta no registra sus tests: los mide su entrenador (marcas verificadas)
    const puedeRegistrar = (propio && !d.registraEntrenador) || ['Medico', 'Médico', 'Entrenador', 'Administrador'].includes(rolActual);
    if (propio && d.registraEntrenador) document.getElementById('pf-tests-btn')?.remove();
    cont.innerHTML = `
        ${propio && d.registraEntrenador ? '<div class="ev-aviso ev-aviso-info">✓ En tu equipo <strong>tus tests los registra tu entrenador</strong>: así todas las marcas de la clasificación son reales.</div>' : ''}
        ${evAvisoHTML(d, propio)}
        <div class="ev-grid">${d.pruebas.map(p => evTarjetaHTML(p, { puedeRegistrar, userId })).join('')}</div>`;
    evDibujarGraficas(d.pruebas);
}

function evModalRegistrar(userId, pruebaInicial) {
    if (!_evDatos) return;
    const hoy = new Date().toISOString().slice(0, 10);
    const opciones = _evDatos.pruebas.map(p => `<option value="${p.id}" ${p.id === pruebaInicial ? 'selected' : ''}>${escapeHtml(p.nombre)} (${p.unidad})</option>`).join('');
    openModal('Registrar resultado', `
        <div class="form-group"><label>Prueba</label><select id="ev-prueba" onchange="evAyudaPrueba()">${opciones}</select></div>
        <div class="ev-ayuda" id="ev-ayuda"></div>
        <div class="form-row">
            <div class="form-group"><label>Resultado <span id="ev-unidad" class="campo-ayuda"></span></label><input type="number" id="ev-valor" step="0.01" inputmode="decimal"></div>
            <div class="form-group"><label>Fecha</label><input type="date" id="ev-fecha" value="${hoy}" max="${hoy}"></div>
        </div>
        <div class="form-group"><label>Notas <span class="campo-ayuda">(opcional: superficie, calzado, cómo te sentiste)</span></label><input type="text" id="ev-notas" maxlength="300"></div>
        <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="ev-guardar" onclick="evGuardar(${Number(userId)})">Guardar</button></div>`);
    evAyudaPrueba();
    document.getElementById('ev-valor')?.focus();
}

function evAyudaPrueba() {
    const p = _evDatos?.pruebas.find(x => x.id === document.getElementById('ev-prueba')?.value);
    if (!p) return;
    document.getElementById('ev-ayuda').innerHTML = `<strong>Cómo se hace:</strong> ${escapeHtml(p.instrucciones)} <br><span>${p.mejor === 'menor' ? 'Menos es mejor' : 'Más es mejor'} · valores entre ${p.min} y ${p.max} ${p.unidad}</span>`;
    document.getElementById('ev-unidad').textContent = `(${p.unidad})`;
    const valor = document.getElementById('ev-valor');
    valor.min = p.min; valor.max = p.max;
}

async function evGuardar(userId) {
    const boton = document.getElementById('ev-guardar');
    const body = {
        prueba: document.getElementById('ev-prueba').value,
        valor: document.getElementById('ev-valor').value.replace(',', '.'),
        fecha: document.getElementById('ev-fecha').value,
        notas: document.getElementById('ev-notas').value.trim()
    };
    if (body.valor === '') return showToast('Escribe el resultado', 'error');
    boton.disabled = true;
    const res = await apiFetch(`${API}/evaluaciones/${userId}`, { method:'POST', body: JSON.stringify(body) }).then(r => r.json()).catch(() => null);
    boton.disabled = false;
    if (!res?.ok) return showToast(res?.error || 'No se pudo guardar', 'error');
    closeModal();
    showToast('Resultado guardado');
    enSegundoPlano(evRender(_evDatos.contenedorId, userId, { propio: _evDatos.propio }));
    if (_evDatos.propio) enSegundoPlano(rgCelebrarSubida(`test:${body.prueba}`));
}

async function evBorrar(userId, id) {
    if (!confirm('¿Borrar este resultado?')) return;
    const res = await apiFetch(`${API}/evaluaciones/${userId}/${id}`, { method:'DELETE' }).then(r => r.json()).catch(() => null);
    if (!res?.ok) return showToast('No se pudo borrar', 'error');
    showToast('Resultado borrado');
    enSegundoPlano(evRender(_evDatos.contenedorId, userId, { propio: _evDatos.propio }));
}

async function pfRenderTests() {
    const main = document.getElementById('pf-content');
    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>⏱ Tests físicos</h1><p>Mide tu progreso en velocidad, salto, agilidad y resistencia</p></div>
            <button class="btn btn-primary" id="pf-tests-btn" onclick="evModalRegistrar(${Number(currentUser.id)})">+ Registrar resultado</button>
        </div>
        <div id="pf-tests"></div>
        <p class="ev-nota">Toda prueba tiene un pequeño margen de error (2–6 %). Solo marcamos mejora o bajada cuando el cambio lo supera; si no, aparece "sin cambio claro".</p>
    </div>`;
    await evRender('pf-tests', currentUser.id, { propio: true });
}
