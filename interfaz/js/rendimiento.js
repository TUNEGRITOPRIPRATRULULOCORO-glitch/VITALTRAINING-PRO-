/* =============================================
   VitalTraining — rendimiento.js
   Listo para entrenar, carga y cumplimiento.
   Lo usan el atleta, el nutricionista y el médico.
============================================= */

// — RENDIMIENTO (listo para entrenar · carga · cumplimiento) —
const RD_NIVEL = {
    alto:        { clase:'rd-ok',   etiqueta:'Listo' },
    medio:       { clase:'rd-warn', etiqueta:'Moderado' },
    bajo:        { clase:'rd-bad',  etiqueta:'Descanso' },
    'sin-datos': { clase:'rd-none', etiqueta:'Sin registro' }
};
const RD_RIESGO = {
    optimo:      { clase:'rd-ok',   etiqueta:'Óptima' },
    precaucion:  { clase:'rd-warn', etiqueta:'Precaución' },
    alto:        { clase:'rd-bad',  etiqueta:'Riesgo alto' },
    bajo:        { clase:'rd-warn', etiqueta:'Carga baja' },
    'sin-datos': { clase:'rd-none', etiqueta:'Sin datos' }
};
const RD_CUMPL = {
    completo:'Completado', parcial:'Parcial', fallado:'No realizado', pendiente:'Pendiente hoy',
    proximo:'Próximo', descanso:'Descanso', 'sin-plan':'Sin plan'
};

function rdBadgeListo(listo) {
    const n = RD_NIVEL[listo?.nivel] || RD_NIVEL['sin-datos'];
    return `<span class="rd-badge ${n.clase}">${listo?.puntaje ?? '—'} · ${n.etiqueta}</span>`;
}

function rdBadgeRiesgo(carga) {
    const r = RD_RIESGO[carga?.riesgo] || RD_RIESGO['sin-datos'];
    const ratio = carga?.ratio != null ? `${String(carga.ratio).replace('.', ',')} · ` : '';
    return `<span class="rd-badge ${r.clase}">${ratio}${r.etiqueta}</span>`;
}

function rdTarjetaListo(listo) {
    const n = RD_NIVEL[listo.nivel] || RD_NIVEL['sin-datos'];
    const pct = listo.puntaje ?? 0;
    const circ = 2 * Math.PI * 42;
    return `
    <div class="card rd-card">
        <div class="card-header"><h2>⚡ Listo para entrenar</h2></div>
        <div class="rd-card-body rd-listo">
            <svg class="rd-anillo ${n.clase}" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="42" class="rd-anillo-fondo"/>
                <circle cx="50" cy="50" r="42" class="rd-anillo-valor" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pct / 100)}"/>
                <text x="50" y="50" class="rd-anillo-num">${listo.puntaje ?? '—'}</text>
            </svg>
            <div>
                <span class="rd-badge ${n.clase}">${n.etiqueta}</span>
                <p class="rd-mensaje">${escapeHtml(listo.mensaje)}</p>
                ${listo.nivel === 'sin-datos' ? `<button class="btn btn-primary btn-sm" onclick="pfRenderView('salud')">Registrar salud</button>` : ''}
            </div>
        </div>
    </div>`;
}

// "+35 %", "el doble", "un 20 % menos"... comparado con su semana normal
function rdComparacionSemana(cambio) {
    if (cambio == null) return '';
    if (cambio >= 90)  return 'Esta semana entrenaste <strong>casi el doble</strong> que en una semana normal tuya.';
    if (cambio >= 5)   return `Esta semana entrenaste <strong>un ${cambio} % más</strong> que en una semana normal tuya.`;
    if (cambio <= -5)  return `Esta semana entrenaste <strong>un ${Math.abs(cambio)} % menos</strong> que en una semana normal tuya.`;
    return 'Esta semana entrenaste <strong>lo mismo</strong> que en una semana normal tuya.';
}

// Versión para el atleta: sin ratios, comparando "esta semana" con "tu semana normal"
function rdTarjetaCarga(carga) {
    const r = RD_RIESGO[carga.riesgo] || RD_RIESGO['sin-datos'];
    const iconos = { optimo:'🟢', precaucion:'🟡', alto:'🔴', bajo:'🔵', 'sin-datos':'⚪' };
    const conDatos = carga.cronica != null;
    // Escala de las barras: que quepan la semana actual y la zona segura (hasta 1,3 × normal)
    const tope = conDatos ? Math.max(carga.aguda, carga.cronica * 1.6, 1) : 1;
    const pct = v => Math.min(100, Math.round(v / tope * 100));
    return `
    <div class="card rd-card">
        <div class="card-header"><h2>📈 Mi carga de entrenamiento</h2></div>
        <div class="rd-card-body">
            <div class="rd-carga-estado ${r.clase}"><span>${iconos[carga.riesgo] || '⚪'}</span>${escapeHtml(carga.titulo || r.etiqueta)}</div>
            <p class="rd-mensaje">${conDatos
                ? rdComparacionSemana(carga.cambioPorcentaje) + (carga.riesgo === 'alto' ? ' Subir tanto de golpe aumenta el riesgo de lesión.' : '')
                : escapeHtml(carga.mensaje)}</p>
            ${conDatos ? `
            <div class="rd-barras" aria-label="Comparación de carga">
                <div class="rd-barra-fila">
                    <span class="rd-barra-lab">Esta semana</span>
                    <div class="rd-barra-pista">
                        <div class="rd-barra-valor ${r.clase}" style="width:${pct(carga.aguda)}%"></div>
                        <div class="rd-barra-zona" style="left:${pct(carga.cronica * 0.8)}%;width:${pct(carga.cronica * 1.3) - pct(carga.cronica * 0.8)}%" title="Zona segura"></div>
                    </div>
                </div>
                <div class="rd-barra-fila">
                    <span class="rd-barra-lab">Semana normal</span>
                    <div class="rd-barra-pista"><div class="rd-barra-valor rd-normal" style="width:${pct(carga.cronica)}%"></div></div>
                </div>
                <div class="rd-barra-leyenda"><i></i> Zona segura</div>
            </div>` : ''}
            <div class="rd-consejo"><strong>Qué hacer:</strong> ${escapeHtml(carga.consejo || '')}</div>
            <details class="rd-explicacion">
                <summary>¿Cómo se calcula?</summary>
                Cada sesión suma <em>minutos × lo dura que fue (1 a 10)</em>, el número que eliges al marcarla como completada.
                Comparamos tus últimos 7 días con tu semana promedio del último mes. Subir mucho de golpe es lo que más aumenta el riesgo de lesión.
            </details>
        </div>
    </div>`;
}

function rdTarjetaCumplimiento(cumpl, racha) {
    const cabecera = ['L','M','X','J','V','S','D'].map(d => `<div class="rd-dia-cab">${d}</div>`).join('');
    const celdas = cumpl.dias.map(d =>
        `<div class="rd-dia rd-dia-${d.estado} ${d.hoy ? 'rd-dia-hoy' : ''}" title="${d.dia} ${formatFecha(d.fecha)} · ${RD_CUMPL[d.estado]}">${Number(d.fecha.slice(8))}</div>`
    ).join('');
    const leyenda = ['completo','parcial','fallado','proximo','descanso'].map(e =>
        `<span><i class="rd-dia rd-dia-${e}"></i>${RD_CUMPL[e]}</span>`).join('');
    return `
    <div class="card rd-card">
        <div class="card-header"><h2>📅 Cumplimiento · 4 semanas</h2>${racha ? `<span class="rd-racha">🔥 ${racha} ${racha === 1 ? 'día' : 'días'}</span>` : ''}</div>
        <div class="rd-card-body">
            <div class="rd-carga-cifras">
                <div><span class="rd-cifra">${cumpl.porcentaje ?? '—'}${cumpl.porcentaje != null ? '%' : ''}</span><span class="rd-cifra-lab">Del plan cumplido</span></div>
                <div><span class="rd-cifra">${cumpl.completos}<small>/${cumpl.completos + cumpl.parciales + cumpl.fallados}</small></span><span class="rd-cifra-lab">Sesiones completas</span></div>
            </div>
            <div class="rd-calendario">${cabecera}${celdas}</div>
            <div class="rd-leyenda">${leyenda}</div>
        </div>
    </div>`;
}

function rdSeccionDashboard(r) {
    return `<div class="rd-grid">${rdTarjetaListo(r.listo)}${rdTarjetaCarga(r.carga)}${rdTarjetaCumplimiento(r.cumplimiento, r.racha)}</div>`;
}

async function rdCargarEquipo() {
    const data = await apiFetch(`${API}/rendimiento/equipo`).then(r => r.json()).catch(() => null);
    return Object.fromEntries((data?.atletas || []).map(a => [a.id, a]));
}
