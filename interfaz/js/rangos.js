/* =============================================
   VitalTraining — rangos.js
   Rangos de Bronce a Radiante: emblemas, "Camino a Radiante", progreso hacia el siguiente
   rango y la celebración al subir. Los calcula el servidor; aquí solo se dibujan.
   También el resumen de fuerza y rangos que ven el médico y el nutricionista.
============================================= */

const RG_ORDEN = ['Bronce', 'Plata', 'Oro', 'Platino', 'Esmeralda', 'Rubí', 'Diamante', 'Radiante'];
const RG_IDS = ['bronce', 'plata', 'oro', 'platino', 'esmeralda', 'rubi', 'diamante', 'radiante'];
// Mismos colores base que el servidor (servidor/api/rangos/rangos.catalogo.js)
const RG_COLORES = ['#b0703c', '#94a3b8', '#eab308', '#38bdf8', '#10b981', '#e11d48', '#6366f1', '#f59e0b'];

/*
 * Cada rango tiene su silueta y gana adornos al subir (como en los juegos competitivos):
 * medalla → hexágono → escudo → cresta → gema → gema con alas → diamante con alas → corona radiante.
 * En el centro va siempre el pulso del logo de VitalTraining.
 * metal: [brillo, medio, sombra] · gema: color del centro
 */
const RG_ARTE = {
    bronce:    { metal: ['#f6c08f', '#b0703c', '#5c3317'], gema: '#ffd9b3', forma: 'M50 18 A30 30 0 1 1 49.99 18 Z' },
    plata:     { metal: ['#ffffff', '#a3b1c4', '#3f4b5c'], gema: '#eef2f7', forma: 'M50 15 L80 32 L80 64 L50 81 L20 64 L20 32 Z' },
    oro:       { metal: ['#fff3b0', '#eab308', '#8a4b08'], gema: '#fff8d6', forma: 'M50 12 L81 23 V47 C81 66 68 78 50 86 C32 78 19 66 19 47 V23 Z' },
    platino:   { metal: ['#e0f6ff', '#38bdf8', '#0b4a6b'], gema: '#e6f7ff', forma: 'M50 8 L61 23 L81 25 L73 45 L80 66 L60 70 L50 88 L40 70 L20 66 L27 45 L19 25 L39 23 Z' },
    esmeralda: { metal: ['#c9fbe4', '#10b981', '#054834'], gema: '#d6fdec', forma: 'M50 9 L81 45 L50 88 L19 45 Z', facetas: 'M50 9 L50 88 M19 45 L81 45 M34 27 L66 63 M66 27 L34 63' },
    rubi:      { metal: ['#ffd4dc', '#e11d48', '#6b0f22'], gema: '#ffe6eb', forma: 'M38 12 L62 12 L80 30 L80 58 L62 80 L38 80 L20 58 L20 30 Z', alas: 'pequenas' },
    diamante:  { metal: ['#e3e6ff', '#6d6ff5', '#251f78'], gema: '#eceaff', forma: 'M31 22 L69 22 L84 40 L50 86 L16 40 Z', facetas: 'M16 40 L84 40 M31 22 L40 40 L50 22 L60 40 L69 22 M40 40 L50 86 L60 40', alas: 'grandes' },
    radiante:  { metal: ['#fffaf0', '#f8b62b', '#a0520a'], gema: '#ffffff', forma: 'M50 6 L58 20 L72 13 L70 30 L83 38 L71 54 C71 71 61 80 50 88 C39 80 29 71 29 54 L17 38 L30 30 L28 13 L42 20 Z', alas: 'grandes', rayos: true },
};

const RG_ALAS = {
    pequenas: 'M27 36 C17 33 10 26 7 17 C13 23 19 26 27 28 Z M24 50 C14 49 8 43 5 35 C11 40 17 42 25 42 Z',
    grandes: 'M27 30 C14 26 4 15 0 2 C9 11 19 17 29 21 Z M23 44 C10 42 0 33 -4 20 C5 29 14 33 25 35 Z M24 58 C11 58 1 51 -3 40 C6 46 15 49 25 49 Z',
};

// Pulso del logo (el mismo trazo que img/logo.svg), centrado en el emblema
const RG_PULSO = '<path d="M9 13 L19 35 L25 21 L29 28 L35 12"/><path d="M29.5 12.6 L35 12 L36.4 17.4"/>';

let _rgUid = 0;

async function rgCargar(userId) {
    const data = await apiFetch(`${API}/rangos/${userId}`).then(r => r.json()).catch(() => null);
    return data?.ok ? data : null;
}

/** Rango a partir de su índice de color (para la escalera y las siluetas). */
function rgRangoDeTier(i, division = 'I') {
    return { id: RG_IDS[i], nombre: RG_ORDEN[i], color: RG_COLORES[i], division: i === 7 ? null : division, etiqueta: i === 7 ? 'Radiante' : `${RG_ORDEN[i]} ${division}` };
}

/**
 * Emblema SVG de un rango.
 * opciones.bloqueado: silueta gris con candado (rangos que aún no alcanzas)
 * opciones.sinDivision: solo la forma del rango (para la escalera)
 */
function rgEmblema(rango, tam = 56, { bloqueado = false, sinDivision = false } = {}) {
    const arte = RG_ARTE[rango.id] || RG_ARTE.bronce;
    const u = `rg${++_rgUid}`;
    const [brillo, medio, sombra] = arte.metal;
    const division = rango.division == null ? 0 : (['I', 'II', 'III'].indexOf(rango.division) + 1);
    const nivel = sinDivision ? 1 : division;
    const centro = 'translate(50 48)';
    const alas = arte.alas ? `
        <g fill="url(#${u}m)" stroke="${sombra}" stroke-width="1.4" stroke-linejoin="round">
            <path d="${RG_ALAS[arte.alas]}"/>
            <path d="${RG_ALAS[arte.alas]}" transform="translate(100 0) scale(-1 1)"/>
        </g>` : '';
    const rayos = arte.rayos ? `
        <g class="rg-rayos" fill="${brillo}" opacity="0.75">
            ${Array.from({ length: 16 }, (_, i) => `<path d="M48.6 -2 L51.4 -2 L50.4 14 L49.6 14 Z" transform="rotate(${i * 22.5} 50 48)"/>`).join('')}
        </g>
        <circle cx="50" cy="48" r="40" fill="url(#${u}aura)"/>` : '';
    // Divisiones: I = 1 tachuela; II = + gemas laterales; III = + gema superior y brillo
    const tachuelas = nivel ? Array.from({ length: Math.max(nivel, 1) }, (_, i) => {
        const x = 50 + (i - (Math.max(nivel, 1) - 1) / 2) * 10;
        return `<path d="M${x} 62 l4.2 4.8 -4.2 4.8 -4.2 -4.8 Z" fill="${brillo}" stroke="${sombra}" stroke-width="0.9"/>`;
    }).join('') : '';
    const lados = !sinDivision && division >= 2 ? `
        <path d="M17 48 l4 -5 4 5 -4 5 Z M83 48 l-4 -5 -4 5 4 5 Z" fill="url(#${u}g)" stroke="${sombra}" stroke-width="1"/>` : '';
    const corona = !sinDivision && division >= 3 ? `
        <path d="M50 1 l5 6 -5 6 -5 -6 Z" fill="url(#${u}g)" stroke="${sombra}" stroke-width="1"/>` : '';
    const brilla = !bloqueado && (division >= 3 || rango.id === 'radiante' || ['rubi', 'diamante'].includes(rango.id));

    return `
    <svg class="rg-emblema ${bloqueado ? 'rg-bloqueado' : ''} ${brilla ? 'rg-brilla' : ''} ${arte.rayos && !bloqueado ? 'rg-radiante' : ''}"
         style="--rg-color:${medio}" width="${tam}" height="${tam}" viewBox="-8 -6 116 104" role="img" aria-label="${escapeHtml(rango.etiqueta || rango.nombre)}">
        <defs>
            <linearGradient id="${u}m" x1="0.15" y1="0" x2="0.85" y2="1">
                <stop offset="0" stop-color="${brillo}"/><stop offset="0.45" stop-color="${medio}"/><stop offset="1" stop-color="${sombra}"/>
            </linearGradient>
            <radialGradient id="${u}p" cx="0.5" cy="0.4" r="0.7">
                <stop offset="0" stop-color="${sombra}"/><stop offset="1" stop-color="#0b1020"/>
            </radialGradient>
            <linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${medio}"/>
            </linearGradient>
            <radialGradient id="${u}aura"><stop offset="0" stop-color="${brillo}" stop-opacity="0.55"/><stop offset="1" stop-color="${medio}" stop-opacity="0"/></radialGradient>
        </defs>
        ${rayos}
        ${alas}
        <path d="${arte.forma}" fill="url(#${u}m)" stroke="${sombra}" stroke-width="2" stroke-linejoin="round"/>
        <path d="${arte.forma}" transform="${centro} scale(0.74) translate(-50 -48)" fill="url(#${u}p)" stroke="${brillo}" stroke-opacity="0.55" stroke-width="2"/>
        ${arte.facetas ? `<path d="${arte.facetas}" transform="${centro} scale(0.74) translate(-50 -48)" stroke="${brillo}" stroke-opacity="0.18" stroke-width="1.2" fill="none"/>` : ''}
        <g transform="${centro} scale(0.82) translate(-22.6 -25)" fill="none" stroke="${arte.gema}" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round">${RG_PULSO}</g>
        ${tachuelas}${lados}${corona}
        ${bloqueado ? '<g transform="translate(50 50)"><rect x="-9" y="-3" width="18" height="14" rx="3" fill="#e2e8f0"/><path d="M-5.5 -3 v-4 a5.5 5.5 0 0 1 11 0 v4" fill="none" stroke="#e2e8f0" stroke-width="3"/></g>' : ''}
    </svg>`;
}

/** Barra "hacia el siguiente" con el emblema del siguiente rango. */
function rgHaciaSiguiente(r, compacto = false) {
    if (!r.siguiente) {
        return r.rango.id === 'radiante' ? '<div class="rg-falta">🌟 Rango máximo. ¡Eres Radiante!</div>' : '';
    }
    const pct = Math.round((r.siguiente.progreso || 0) * 100);
    return `
    <div class="rg-hacia">
        <div class="rg-hacia-barra">
            <div class="rg-hacia-txt"><span>Hacia <strong style="color:${r.siguiente.rango.color}">${escapeHtml(r.siguiente.rango.etiqueta)}</strong></span><span>${pct} %</span></div>
            <div class="rg-barra"><div style="width:${Math.max(pct, 3)}%;--rg-a:${r.rango.color};--rg-b:${r.siguiente.rango.color}"></div></div>
        </div>
        ${compacto ? '' : rgEmblema(r.siguiente.rango, 40)}
    </div>
    ${compacto ? '' : `<div class="rg-falta">${escapeHtml(r.siguiente.falta)}</div>`}`;
}

function rgTarjeta(r) {
    return `
    <div class="card rg-card ${r.subio || r.nuevo ? 'rg-card-subio' : ''}" style="--rg-color:${r.rango.color}">
        ${r.subio ? '<span class="rg-cinta">⬆ ¡Subiste!</span>' : r.nuevo ? '<span class="rg-cinta">✨ Nuevo</span>' : ''}
        <div class="rg-card-cab">
            ${rgEmblema(r.rango, 72)}
            <div class="rg-card-titulo">
                <span class="rg-tipo">${r.tipo === 'fuerza' ? '🏋 Fuerza' : '⏱ Test físico'}</span>
                <strong>${escapeHtml(r.nombre)}</strong>
                <span class="rg-etiqueta" style="color:${r.rango.color}">${escapeHtml(r.rango.etiqueta)}</span>
            </div>
        </div>
        <div class="rg-marca">${escapeHtml(r.marca)}</div>
        ${rgHaciaSiguiente(r)}
    </div>`;
}

/** "Camino a Radiante": los 8 rangos; los alcanzados en color y los demás bloqueados. */
function rgCamino(mejor) {
    const actual = mejor ? RG_IDS.indexOf(mejor.id) : -1;
    return `
    <div class="card rg-camino">
        <div class="card-header"><h2>🗺 Camino a Radiante</h2><span class="ls-lesion-sub">${actual >= 0 ? `${actual + 1} de 8 rangos desbloqueados` : 'Consigue tu primer rango'}</span></div>
        <div class="rg-camino-fila">
            ${RG_ORDEN.map((nombre, i) => `
            <div class="rg-paso ${i < actual ? 'rg-paso-hecho' : ''} ${i === actual ? 'rg-paso-actual' : ''} ${i > actual ? 'rg-paso-futuro' : ''}">
                ${rgEmblema(rgRangoDeTier(i), i === actual ? 64 : 48, { bloqueado: i > actual, sinDivision: true })}
                <small>${nombre}</small>
                ${i === actual ? '<span class="rg-aqui">Estás aquí</span>' : ''}
            </div>`).join('<span class="rg-flecha" aria-hidden="true">›</span>')}
        </div>
    </div>`;
}

async function pfRenderRangos() {
    const main = document.getElementById('pf-content');
    const d = await rgCargar(currentUser.id);
    if (!d) { main.innerHTML = showError('No se pudieron cargar tus rangos.', "pfRenderView('rangos')"); return; }
    const subidas = d.rangos.filter(r => r.subio);
    const top = d.rangos[0] || null; // vienen ordenados de mayor a menor
    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>🏅 Mis rangos</h1><p>Tu nivel en cada ejercicio y test, de Bronce a Radiante</p></div>
        </div>
        ${top ? `
        <div class="rg-hero" style="--rg-color:${top.rango.color}">
            <div class="rg-hero-emblema">${rgEmblema(top.rango, 132)}</div>
            <div class="rg-hero-texto">
                <span class="rg-tipo">Tu mejor rango · ${escapeHtml(top.nombre)}</span>
                <h2>${escapeHtml(top.rango.etiqueta)}</h2>
                ${top.siguiente ? rgHaciaSiguiente(top) : '<p>🌟 Llegaste a lo más alto. ¡Eres Radiante!</p>'}
                <div class="rg-hero-datos">
                    <span><strong>${d.rangos.length}</strong> ${d.rangos.length === 1 ? 'marca con rango' : 'marcas con rango'}</span>
                    ${subidas.length ? `<span>⬆ <strong>${subidas.length}</strong> ${subidas.length === 1 ? 'subida nueva' : 'subidas nuevas'}</span>` : ''}
                </div>
            </div>
        </div>` : ''}
        ${d.enPausa ? '<div class="ls-aviso rd-bad"><strong>🔒 Rangos en pausa mientras estés de baja médica.</strong><div>Tus rangos se guardan tal cual: ahora lo importante es recuperarte. Al darte el alta, vuelves a subir.</div></div>' : ''}
        ${d.pendientes.length ? `<div class="eq-info">${d.pendientes.map(p => `ℹ️ ${escapeHtml(p)}`).join('<br>')} <button type="button" class="enlace-atleta" onclick="pfRenderView('perfil')">Ir a Mi Perfil →</button></div>` : ''}
        ${rgCamino(d.mejor)}
        ${d.rangos.length ? `<div class="rg-grid">${d.rangos.map(rgTarjeta).join('')}</div>` : `
        <div class="card empty-state rg-vacio">
            <div class="rg-vacio-emblema">${rgEmblema(rgRangoDeTier(0), 96, { bloqueado: true })}</div>
            <p><strong>Tu primer rango te está esperando.</strong> Se consigue de dos formas:</p>
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
                <div class="rg-divisiones">
                    ${['I', 'II', 'III'].map(dv => `<span>${rgEmblema(rgRangoDeTier(2, dv), 54)}<small>Oro ${dv}</small></span>`).join('')}
                </div>
                <p>8 rangos; los 7 primeros con 3 divisiones. Cada división añade adornos al emblema: <strong>I</strong> una tachuela, <strong>II</strong> gemas a los lados y <strong>III</strong> una gema arriba y brillo. Radiante es el máximo.</p>
                <p><strong>Fuerza:</strong> tu mejor serie se pasa a un máximo estimado (fórmula de Epley) y se compara con tu peso corporal, así que cuenta lo fuerte que eres para tu tamaño. Con mancuernas cuenta el peso de una.</p>
                <p><strong>Tests:</strong> tu mejor marca de cada prueba.</p>
                <p>Las referencias son orientativas, de adultos que entrenan, y cambian entre hombres y mujeres. <strong>Nunca bajas de rango:</strong> se guarda el más alto que alcanzaste. Si estás de baja médica, quedan en pausa.</p>
            </div>
        </details>
    </div>`;
    if (subidas.length) rgCelebracion(subidas[0]);
}

/** Pantalla de celebración al subir de rango (o al conseguir el primero). */
function rgCelebracion(r) {
    document.getElementById('rg-celebracion')?.remove();
    const capa = document.createElement('div');
    capa.id = 'rg-celebracion';
    capa.className = 'rg-celebracion';
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-label', `Subiste a ${r.rango.etiqueta}`);
    capa.style.setProperty('--rg-color', r.rango.color);
    capa.innerHTML = `
        <div class="rg-celebracion-caja">
            <div class="rg-celebracion-luz" aria-hidden="true"></div>
            <div class="rg-celebracion-emblema">${rgEmblema(r.rango, 168)}</div>
            <span class="rg-tipo">${r.subio ? '¡Subiste de rango!' : '¡Tu primer rango!'} · ${escapeHtml(r.nombre)}</span>
            <h2>${escapeHtml(r.rango.etiqueta)}</h2>
            ${r.siguiente ? `<p>Siguiente: <strong>${escapeHtml(r.siguiente.rango.etiqueta)}</strong> · ${escapeHtml(r.siguiente.falta)}</p>` : '<p>🌟 Rango máximo.</p>'}
            <button class="btn btn-primary" onclick="document.getElementById('rg-celebracion')?.remove()">¡Vamos! 💪</button>
        </div>
        ${Array.from({ length: 18 }, (_, i) => `<i class="rg-confeti" style="--i:${i};--x:${(i * 37) % 100}%"></i>`).join('')}`;
    capa.addEventListener('click', e => { if (e.target === capa) capa.remove(); });
    document.body.appendChild(capa);
}

/** Tras apuntar una serie o un test: si subió de rango en esa marca, lo celebra. */
async function rgCelebrarSubida(clave) {
    const d = await rgCargar(currentUser.id);
    const r = d?.rangos.find(x => x.clave === clave && (x.subio || x.nuevo));
    if (!r) return null;
    rgCelebracion(r);
    return r;
}

// ── Médico y nutricionista: resumen del atleta ──────

/** Rangos y récords del atleta en un contenedor (solo lectura). */
async function rgRenderResumen(contenedorId, userId) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    const [d, rec] = await Promise.all([
        rgCargar(userId),
        apiFetch(`${API}/series/${userId}/records`).then(r => r.json()).catch(() => null)
    ]);
    if (!d) { cont.innerHTML = '<p class="ls-vacio">No se pudieron cargar los rangos.</p>'; return; }
    const conRango = new Set(d.rangos.filter(r => r.tipo === 'fuerza').map(r => r.nombre));
    const otros = (rec?.records || []).filter(r => !conRango.has(r.ejercicio));
    const kg = v => `${String(v).replace('.', ',')} kg`;
    const serie = s => s.peso ? `${kg(s.peso)} × ${s.repeticiones}` : `${s.repeticiones} reps`;
    if (!d.rangos.length && !otros.length) {
        cont.innerHTML = '<p class="ls-vacio">Aún no apunta series ni tiene tests físicos con rango.</p>';
        return;
    }
    cont.innerHTML = `
        ${d.enPausa ? '<p class="ls-lesion-sub">🔒 Rangos en pausa por la baja médica.</p>' : ''}
        ${d.rangos.length ? `<div class="rg-lista">${d.rangos.map(r => `
            <div class="rg-fila">
                ${rgEmblema(r.rango, 44)}
                <div class="rg-fila-texto">
                    <strong>${escapeHtml(r.nombre)}</strong>
                    <span class="ls-lesion-sub">${escapeHtml(r.marca)}</span>
                    ${r.siguiente ? rgHaciaSiguiente(r, true) : ''}
                </div>
                <span class="rg-etiqueta" style="color:${r.rango.color}">${escapeHtml(r.rango.etiqueta)}</span>
            </div>`).join('')}</div>` : ''}
        ${otros.length ? `
        <div class="ls-sub">🏋 Otros récords</div>
        <div class="ser-records-grid" style="padding:8px 0 0">${otros.map(r => `
            <div class="ser-record">
                <div class="ser-record-nombre">${escapeHtml(r.ejercicio)}</div>
                <strong>${serie(r.record)}</strong>
                <span class="ls-lesion-sub">${r.record.e1rm ? `≈ ${kg(r.record.e1rm)} máx. · ` : ''}${formatFecha(r.record.fecha)} · ${r.sesiones} ${r.sesiones === 1 ? 'sesión' : 'sesiones'}</span>
            </div>`).join('')}</div>` : ''}`;
}
