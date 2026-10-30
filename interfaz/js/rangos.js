/* =============================================
   VitalTraining — rangos.js
   Rangos de Bronce a Radiante (atleta): emblema por ejercicio de fuerza y test físico,
   lo que falta para el siguiente y la celebración al subir. Los calcula el servidor.
============================================= */

const RG_ORDEN = ['Bronce', 'Plata', 'Oro', 'Platino', 'Esmeralda', 'Rubí', 'Diamante', 'Radiante'];
// Mismos colores que el servidor (servidor/api/rangos/rangos.catalogo.js)
const RG_COLORES = ['#b0703c', '#94a3b8', '#eab308', '#38bdf8', '#10b981', '#e11d48', '#6366f1', '#f59e0b'];

async function rgCargar(userId) {
    const data = await apiFetch(`${API}/rangos/${userId}`).then(r => r.json()).catch(() => null);
    return data?.ok ? data : null;
}

/** Emblema: escudo del color del rango con su división (I, II, III). */
function rgEmblema(rango, tam = 56) {
    const radiante = rango.division == null; // Radiante no tiene división: lleva estrella
    return `
    <svg class="rg-emblema ${radiante ? 'rg-radiante' : ''}" width="${tam}" height="${tam}" viewBox="0 0 64 64" role="img" aria-label="${escapeHtml(rango.etiqueta)}">
        <defs><linearGradient id="rg-${rango.id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${rango.color}" stop-opacity="0.75"/><stop offset="1" stop-color="${rango.color}"/>
        </linearGradient></defs>
        <path d="M32 3 L57 13 V31 C57 46 46 56 32 61 C18 56 7 46 7 31 V13 Z" fill="url(#rg-${rango.id})" stroke="rgba(255,255,255,0.65)" stroke-width="2.5"/>
        <path d="M32 11 L50 18 V31 C50 42 42 49.5 32 53.5 C22 49.5 14 42 14 31 V18 Z" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
        <text x="32" y="${radiante ? 40 : 39}" text-anchor="middle" class="rg-emblema-txt">${radiante ? '★' : escapeHtml(rango.division)}</text>
    </svg>`;
}

function rgTarjeta(r) {
    const pct = Math.round(r.rango.paso / 21 * 100);
    return `
    <div class="card rg-card ${r.subio || r.nuevo ? 'rg-card-subio' : ''}">
        ${r.subio ? '<span class="rg-cinta">⬆ ¡Subiste!</span>' : r.nuevo ? '<span class="rg-cinta">✨ Nuevo</span>' : ''}
        <div class="rg-card-cab">
            ${rgEmblema(r.rango)}
            <div class="rg-card-titulo">
                <span class="rg-tipo">${r.tipo === 'fuerza' ? '🏋 Fuerza' : '⏱ Test físico'}</span>
                <strong>${escapeHtml(r.nombre)}</strong>
                <span class="rg-etiqueta" style="color:${r.rango.color}">${escapeHtml(r.rango.etiqueta)}</span>
            </div>
        </div>
        <div class="rg-marca">${escapeHtml(r.marca)}</div>
        <div class="rg-barra" aria-label="Progreso hasta Radiante"><div style="width:${pct}%;background:${r.rango.color}"></div></div>
        ${r.siguiente
            ? `<div class="rg-falta">Para <strong>${escapeHtml(r.siguiente.rango.etiqueta)}</strong>: ${escapeHtml(r.siguiente.falta)}</div>`
            : r.rango.id === 'radiante' ? '<div class="rg-falta">🌟 Rango máximo. ¡Eres Radiante!</div>' : ''}
    </div>`;
}

async function pfRenderRangos() {
    const main = document.getElementById('pf-content');
    const d = await rgCargar(currentUser.id);
    if (!d) { main.innerHTML = showError('No se pudieron cargar tus rangos.', "pfRenderView('rangos')"); return; }
    const subidas = d.rangos.filter(r => r.subio);
    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>🏅 Mis rangos</h1><p>Tu nivel en cada ejercicio y test, de Bronce a Radiante</p></div>
        </div>
        ${d.mejor ? `
        <div class="card rg-hero">
            ${rgEmblema(d.mejor, 84)}
            <div>
                <span class="rg-tipo">Tu mejor rango</span>
                <h2 style="color:${d.mejor.color}">${escapeHtml(d.mejor.etiqueta)}</h2>
                <p>${d.rangos.length} ${d.rangos.length === 1 ? 'marca con rango' : 'marcas con rango'}${subidas.length ? ` · ⬆ ${subidas.length === 1 ? 'acabas de subir en' : 'subiste en'} ${subidas.map(r => escapeHtml(r.nombre)).join(', ')}` : ''}</p>
            </div>
        </div>` : ''}
        ${d.enPausa ? '<div class="ls-aviso rd-bad"><strong>🔒 Rangos en pausa mientras estés de baja médica.</strong><div>Tus rangos se guardan tal cual: ahora lo importante es recuperarte. Al darte el alta, vuelves a subir.</div></div>' : ''}
        ${d.pendientes.length ? `<div class="eq-info">${d.pendientes.map(p => `ℹ️ ${escapeHtml(p)}`).join('<br>')} <button type="button" class="enlace-atleta" onclick="pfRenderView('perfil')">Ir a Mi Perfil →</button></div>` : ''}
        ${d.rangos.length ? `<div class="rg-grid">${d.rangos.map(rgTarjeta).join('')}</div>` : `
        <div class="card empty-state rg-vacio">
            <p><strong>Aún no tienes rangos.</strong> Se consiguen de dos formas:</p>
            <p>🏋 Apuntando tus series en la rutina en ejercicios como Sentadilla con barra, Press de banca, Peso muerto, Press militar o Hip thrust.</p>
            <p>⏱ Registrando un test físico: salto, sprint, Yo-Yo, Cooper, flexiones…</p>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
                <button class="btn btn-primary btn-sm" onclick="pfRenderView('plan')">Ir a mi rutina</button>
                <button class="btn btn-ghost btn-sm" onclick="pfRenderView('tests')">Ir a tests físicos</button>
            </div>
        </div>`}
        <details class="card rg-explica">
            <summary class="card-header"><h2>¿Cómo funcionan los rangos?</h2></summary>
            <div class="card-body">
                <div class="rg-escalera">${RG_ORDEN.map((n, i) => `<span>${rgEmblema({ id: `esc-${i}`, etiqueta: n, division: i === 7 ? null : '', color: RG_COLORES[i] }, 34)}<small>${n}</small></span>`).join('')}</div>
                <p>8 rangos; los 7 primeros con 3 divisiones (I, II y III). Radiante es el máximo.</p>
                <p><strong>Fuerza:</strong> tu mejor serie se pasa a un máximo estimado (fórmula de Epley) y se compara con tu peso corporal, así que cuenta lo fuerte que eres para tu tamaño. Con mancuernas cuenta el peso de una.</p>
                <p><strong>Tests:</strong> tu mejor marca de cada prueba.</p>
                <p>Las referencias son orientativas, de adultos que entrenan, y cambian entre hombres y mujeres. <strong>Nunca bajas de rango:</strong> se guarda el más alto que alcanzaste. Si estás de baja médica, quedan en pausa.</p>
            </div>
        </details>
    </div>`;
}

/** Tras apuntar una serie o un test: si subió de rango en esa marca, lo celebra. */
async function rgCelebrarSubida(clave) {
    const d = await rgCargar(currentUser.id);
    const r = d?.rangos.find(x => x.clave === clave && (x.subio || x.nuevo));
    if (!r) return null;
    showToast(r.subio ? `🏅 ¡Subiste a ${r.rango.etiqueta} en ${r.nombre}!` : `🏅 Tu primer rango en ${r.nombre}: ${r.rango.etiqueta}`);
    return r;
}
