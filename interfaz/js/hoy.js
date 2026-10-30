/* =============================================
   VitalTraining — hoy.js
   "Hoy te toca…": la tarjeta del dashboard del atleta con lo que tiene que hacer hoy
   (registrar su salud, su sesión y las comidas de su plan). Los datos los arma el servidor.
============================================= */

let _hoy = null;

const HOY_CHECK = { hecho: '✓', parcial: '½', pendiente: '', descanso: '–', baja: '⏸' };

function hoyFormato(n) { return Number(n || 0).toLocaleString('es-CO'); }

async function hoyCargar(userId) {
    const data = await apiFetch(`${API}/rendimiento/${userId}/hoy`).then(r => r.json()).catch(() => null);
    _hoy = data?.ok ? data.hoy : null;
    return _hoy;
}

function hoyAccion(t) {
    if (t.comida) {
        return t.estado === 'hecho'
            ? '<span class="hoy-hecho-txt">Apuntada</span>'
            : `<button class="btn btn-ghost btn-sm" onclick="hoyApuntarComida('${t.tipoRegistro}', this)">✓ La comí</button>`;
    }
    if (t.accion === 'salud') return `<button class="btn btn-primary btn-sm" onclick="pfRenderView('salud')">Registrar</button>`;
    if (t.accion === 'plan') return `<button class="btn btn-primary btn-sm" onclick="pfRenderView('plan')">Completar</button>`;
    if (t.accion === 'rutina') {
        const ver = `<button class="btn btn-ghost btn-sm" onclick="hoyVerRutina()">Ver rutina</button>`;
        if (t.estado !== 'pendiente') return ver;
        const dia = escapeHtml(_hoy.dia).replace(/'/g, "\\'"), tipo = escapeHtml(t.titulo).replace(/'/g, "\\'");
        return `${ver}<button class="btn btn-primary btn-sm" onclick="pfModalCumplimiento('${dia}','${tipo}')">Marcar hecha</button>`;
    }
    return '';
}

function hoyDetalle(t) {
    if (t.comida) {
        const c = t.comida;
        return `${escapeHtml(c.nombre)} · <strong>${hoyFormato(c.kcal)} kcal</strong> · P ${c.proteina} g · C ${c.carbs} g · G ${c.grasa} g`;
    }
    return escapeHtml(t.detalle || '');
}

function hoyTarjeta(hoy) {
    if (!hoy) return '';
    const { hechas, total } = hoy.progreso;
    const pct = total ? hechas / total : 0;
    const circ = 2 * Math.PI * 26;
    const completo = total > 0 && hechas === total;
    return `
    <div class="card hoy-card hoy-${hoy.tipoDia || 'sin-plan'}" id="hoy-card">
        <div class="hoy-cab">
            <div class="hoy-cab-texto">
                <div class="hoy-eyebrow">Hoy te toca · ${escapeHtml(hoy.dia)}</div>
                <h2>${hoy.icono} ${escapeHtml(hoy.etiqueta)}</h2>
                <p>${escapeHtml(hoy.mensaje)}</p>
            </div>
            ${total ? `
            <div class="hoy-progreso" title="${hechas} de ${total} hecho">
                <svg viewBox="0 0 64 64" aria-hidden="true">
                    <circle cx="32" cy="32" r="26" class="hoy-anillo-fondo"/>
                    <circle cx="32" cy="32" r="26" class="hoy-anillo-valor" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pct)}"/>
                </svg>
                <div class="hoy-progreso-num"><strong>${hechas}/${total}</strong><span>hecho</span></div>
            </div>` : ''}
        </div>
        ${completo ? '<div class="hoy-completo">🎉 ¡Día completo! Todo lo de hoy está hecho.</div>' : ''}
        <ul class="hoy-lista">
            ${hoy.tareas.map(t => `
            <li class="hoy-tarea hoy-${t.estado}">
                <span class="hoy-check" aria-label="${t.estado}">${HOY_CHECK[t.estado] ?? ''}</span>
                <div class="hoy-tarea-texto">
                    <div class="hoy-tarea-titulo">${escapeHtml(t.titulo)}</div>
                    <div class="hoy-tarea-detalle">${hoyDetalle(t)}</div>
                </div>
                <div class="hoy-tarea-accion">${hoyAccion(t)}</div>
            </li>`).join('')}
        </ul>
        ${hoy.objetivo || hoy.consejos.length || hoy.meriendas.length ? `
        <div class="hoy-pie">
            ${hoy.objetivo ? `<span>🎯 ${hoyFormato(hoy.objetivo.kcal)} kcal · P ${hoy.objetivo.proteina} g · C ${hoy.objetivo.carbs} g · G ${hoy.objetivo.grasa} g</span>` : ''}
            ${hoy.consejos.map(c => `<span>${escapeHtml(c)}</span>`).join('')}
            ${hoy.meriendas.length ? `<span>🍎 Meriendas: ${hoy.meriendas.map(m => `${escapeHtml(m.nombre)} (${hoyFormato(m.kcal)} kcal)`).join(' · ')}</span>` : ''}
        </div>` : ''}
    </div>`;
}

function hoyVerRutina() {
    document.querySelectorAll('#panel-futbolista .nav-btn').forEach(b => b.classList.toggle('active', b.dataset.pfView === 'plan'));
    setTitle('Mi Plan');
    enSegundoPlano(pfRenderPlanRutina());
}

/** Apunta en el historial la comida del plan tal cual (un toque, sin formulario). */
async function hoyApuntarComida(tipo, boton) {
    const tarea = _hoy?.tareas.find(t => t.tipoRegistro === tipo);
    if (!tarea?.comida) return;
    boton.disabled = true;
    const c = tarea.comida;
    const res = await apiFetch(`${API}/panel/${currentUser.id}/comidas`, {
        method: 'POST',
        body: JSON.stringify({ nombre: c.nombre, tipo, calorias: c.kcal, proteina: c.proteina, fecha: _hoy.fecha, notas: 'Del plan de comidas' })
    }).then(r => r.json()).catch(() => null);
    if (!res?.ok) { boton.disabled = false; return showToast('No se pudo apuntar la comida.', 'error'); }
    showToast(`${tarea.titulo} apuntado 🍽`);
    await hoyRefrescar();
}

/** Vuelve a pintar solo la tarjeta (sin recargar todo el dashboard). */
async function hoyRefrescar() {
    const tarjeta = document.getElementById('hoy-card');
    if (!tarjeta) return;
    const hoy = await hoyCargar(currentUser.id);
    if (hoy) tarjeta.outerHTML = hoyTarjeta(hoy);
}
