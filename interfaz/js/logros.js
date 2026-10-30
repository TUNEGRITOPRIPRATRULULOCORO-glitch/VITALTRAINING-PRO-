/* =============================================
   VitalTraining — logros.js
   Logros del atleta: insignias por constancia, entrenamiento, progreso y resiliencia,
   con el progreso de las que faltan y la celebración al conseguir una nueva.
============================================= */

const LG_NIVEL = {
    bronce:   { nombre: 'Bronce',   metal: ['#f6c08f', '#b0703c', '#5c3317'] },
    plata:    { nombre: 'Plata',    metal: ['#ffffff', '#a3b1c4', '#3f4b5c'] },
    oro:      { nombre: 'Oro',      metal: ['#fff3b0', '#eab308', '#8a4b08'] },
    diamante: { nombre: 'Diamante', metal: ['#e3e6ff', '#6d6ff5', '#251f78'] },
};
let _lgUid = 0;

async function lgCargar(userId) {
    const d = await apiFetch(`${API}/logros/${userId}`).then(r => r.json()).catch(() => null);
    return d?.ok ? d : null;
}

/** Medalla SVG: aro de metal según el nivel, el icono al centro y cintas. Bloqueada: gris con anillo de progreso. */
function lgInsignia(l, tam = 72) {
    const [brillo, medio, sombra] = (LG_NIVEL[l.nivel] || LG_NIVEL.bronce).metal;
    const u = `lg${++_lgUid}`;
    const pct = l.progreso.meta ? l.progreso.actual / l.progreso.meta : 0;
    const circ = 2 * Math.PI * 36;
    return `
    <svg class="lg-insignia ${l.conseguido ? '' : 'lg-bloqueada'}" width="${tam}" height="${tam}" viewBox="0 0 100 100" role="img" aria-label="${escapeHtml(l.nombre)}">
        <defs>
            <linearGradient id="${u}m" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="${brillo}"/><stop offset="0.5" stop-color="${medio}"/><stop offset="1" stop-color="${sombra}"/></linearGradient>
            <radialGradient id="${u}c" cx="0.5" cy="0.35" r="0.75"><stop offset="0" stop-color="${sombra}"/><stop offset="1" stop-color="#0b1020"/></radialGradient>
        </defs>
        <path d="M34 66 L26 96 L38 89 L44 98 L50 70 Z M66 66 L74 96 L62 89 L56 98 L50 70 Z" fill="url(#${u}m)" stroke="${sombra}" stroke-width="1.2"/>
        <circle cx="50" cy="44" r="40" fill="url(#${u}m)" stroke="${sombra}" stroke-width="2"/>
        <circle cx="50" cy="44" r="31" fill="url(#${u}c)" stroke="${brillo}" stroke-opacity="0.5" stroke-width="1.5"/>
        <text x="50" y="${l.conseguido ? 54 : 52}" text-anchor="middle" font-size="28" class="lg-icono">${l.conseguido ? l.icono : '🔒'}</text>
        ${l.conseguido ? '' : `<circle cx="50" cy="44" r="36" fill="none" stroke="#22c55e" stroke-width="5" stroke-linecap="round"
            stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pct)}" transform="rotate(-90 50 44)" class="lg-anillo"/>`}
    </svg>`;
}

function lgTarjeta(l) {
    return `
    <div class="lg-tarjeta ${l.conseguido ? 'lg-conseguido' : ''} ${l.nuevo ? 'lg-nuevo' : ''}">
        ${l.nuevo ? '<span class="rg-cinta">✨ Nuevo</span>' : ''}
        ${lgInsignia(l)}
        <strong>${escapeHtml(l.nombre)}</strong>
        <span class="lg-desc">${escapeHtml(l.desc)}</span>
        ${l.conseguido
            ? `<span class="lg-fecha">${l.fecha ? `Conseguido el ${formatFecha(l.fecha)}` : 'Conseguido'}</span>`
            : `<div class="lg-progreso"><div class="rg-barra"><div style="width:${Math.max(4, Math.round(l.progreso.actual / l.progreso.meta * 100))}%;--rg-a:#22c55e;--rg-b:#16a34a"></div></div><span>${l.progreso.actual} / ${l.progreso.meta}</span></div>`}
    </div>`;
}

async function pfRenderLogros() {
    const main = document.getElementById('pf-content');
    const d = await lgCargar(currentUser.id);
    if (!d) { main.innerHTML = showError('No se pudieron cargar tus logros.', "pfRenderView('logros')"); return; }
    const grupos = [...new Set(d.logros.map(l => l.grupo))];
    // Lo más cerca de conseguirse primero, para que se vea qué está a un paso
    const casi = d.logros.filter(l => !l.conseguido).sort((a, b) => b.progreso.actual / b.progreso.meta - a.progreso.actual / a.progreso.meta).slice(0, 3);
    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>🎖 Logros</h1><p>Insignias por tu constancia, tu entrenamiento y tu progreso</p></div>
        </div>
        <div class="lg-resumen card">
            <div class="lg-resumen-num"><strong>${d.conseguidos}</strong><span>de ${d.total}</span></div>
            <div class="lg-resumen-barra">
                <span>Logros conseguidos</span>
                <div class="rg-barra"><div style="width:${Math.round(d.conseguidos / d.total * 100)}%;--rg-a:#eab308;--rg-b:#22c55e"></div></div>
                ${casi.length ? `<small>A un paso: ${casi.map(l => `<strong>${escapeHtml(l.nombre)}</strong> (${l.progreso.actual}/${l.progreso.meta})`).join(' · ')}</small>` : '<small>🌟 ¡Los conseguiste todos!</small>'}
            </div>
        </div>
        ${grupos.map(g => `
        <h2 class="lg-grupo">${escapeHtml(g)}</h2>
        <div class="lg-grid">${d.logros.filter(l => l.grupo === g).map(lgTarjeta).join('')}</div>`).join('')}
    </div>`;
    const nuevos = d.logros.filter(l => l.nuevo);
    if (nuevos.length) lgCelebracion(nuevos);
}

/** Celebración a pantalla completa (la misma de los rangos) con la insignia nueva. */
function lgCelebracion(nuevos) {
    document.getElementById('rg-celebracion')?.remove();
    const l = nuevos[0];
    const capa = document.createElement('div');
    capa.id = 'rg-celebracion';
    capa.className = 'rg-celebracion';
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-label', `Logro conseguido: ${l.nombre}`);
    capa.style.setProperty('--rg-color', (LG_NIVEL[l.nivel] || LG_NIVEL.bronce).metal[1]);
    capa.innerHTML = `
        <div class="rg-celebracion-caja">
            <div class="rg-celebracion-luz" aria-hidden="true"></div>
            <div class="rg-celebracion-emblema">${lgInsignia(l, 156)}</div>
            <span class="rg-tipo">🎖 ¡Logro conseguido! · ${escapeHtml((LG_NIVEL[l.nivel] || LG_NIVEL.bronce).nombre)}</span>
            <h2>${escapeHtml(l.nombre)}</h2>
            <p>${escapeHtml(l.desc)}${nuevos.length > 1 ? `<br>Y ${nuevos.length - 1} ${nuevos.length === 2 ? 'logro más' : 'logros más'}: ${nuevos.slice(1).map(n => escapeHtml(n.nombre)).join(', ')}` : ''}</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
                <button class="btn btn-primary" onclick="document.getElementById('rg-celebracion')?.remove()">¡Genial! 💪</button>
                <button class="btn btn-ghost" style="color:#fff" onclick="document.getElementById('rg-celebracion')?.remove();pfRenderView('logros')">Ver mis logros</button>
            </div>
        </div>
        ${Array.from({ length: 18 }, (_, i) => `<i class="rg-confeti" style="--i:${i};--x:${(i * 37) % 100}%"></i>`).join('')}`;
    capa.addEventListener('click', e => { if (e.target === capa) capa.remove(); });
    document.body.appendChild(capa);
}

/** Al abrir el dashboard: si consiguió logros desde la última vez, se celebran. */
async function lgComprobarNuevos() {
    if (!currentUser || !['Atleta', 'Futbolista'].includes(currentUser.rol)) return;
    const d = await lgCargar(currentUser.id);
    const nuevos = d?.logros.filter(l => l.nuevo) || [];
    if (nuevos.length && !document.getElementById('rg-celebracion')) lgCelebracion(nuevos);
}
