/* =============================================
   VitalTraining — clasificacion.js
   Clasificación del atleta: Constancia (cumplir el plan: salud, sesiones y comidas) y
   Marcas (tests de su deporte y levantamientos, con la escala de los rangos).
   Compite con su equipo o con todo su deporte. Los puntos los calcula el servidor.
============================================= */

const _cl = { pestana: 'constancia', ambito: 'equipo', periodo: 'semana', clave: null, opciones: null };

async function pfRenderClasificacion() {
    const main = document.getElementById('pf-content');
    if (!_cl.opciones) {
        const op = await apiFetch(`${API}/clasificacion/opciones`).then(r => r.json()).catch(() => null);
        if (!op?.ok) { main.innerHTML = showError('No se pudo cargar la clasificación.', "pfRenderView('clasificacion')"); return; }
        _cl.opciones = op;
        _cl.ambito = op.tieneEquipo ? 'equipo' : 'deporte';
        _cl.clave = op.tests[0]?.clave || op.levantamientos[0]?.clave;
    }
    const op = _cl.opciones;
    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>🏆 Clasificación</h1><p>Compite con ${op.tieneEquipo ? `tu equipo (${escapeHtml(op.equipo)}) o con` : ''} todo ${escapeHtml(op.deporte)}</p></div>
        </div>
        <div class="cl-controles">
            <div class="cl-pestanas" role="tablist">
                <button role="tab" class="${_cl.pestana === 'constancia' ? 'activa' : ''}" onclick="clCambiar('pestana','constancia')">🔥 Constancia</button>
                <button role="tab" class="${_cl.pestana === 'marcas' ? 'activa' : ''}" onclick="clCambiar('pestana','marcas')">🏅 Marcas</button>
            </div>
            <div class="cl-filtros">
                ${op.tieneEquipo ? `<select aria-label="Con quién" onchange="clCambiar('ambito',this.value)">
                    <option value="equipo" ${_cl.ambito === 'equipo' ? 'selected' : ''}>👥 Mi equipo</option>
                    <option value="deporte" ${_cl.ambito === 'deporte' ? 'selected' : ''}>${getSportIcon(op.deporte)} Todo ${escapeHtml(op.deporte)}</option>
                </select>` : ''}
                ${_cl.pestana === 'constancia' ? `<select aria-label="Periodo" onchange="clCambiar('periodo',this.value)">
                    <option value="semana" ${_cl.periodo === 'semana' ? 'selected' : ''}>Esta semana</option>
                    <option value="mes" ${_cl.periodo === 'mes' ? 'selected' : ''}>Últimos 30 días</option>
                </select>` : `<select aria-label="Prueba" onchange="clCambiar('clave',this.value)">
                    <optgroup label="Tests de ${escapeHtml(op.deporte)}">${op.tests.map(t => `<option value="${t.clave}" ${_cl.clave === t.clave ? 'selected' : ''}>⏱ ${escapeHtml(t.nombre)}</option>`).join('')}</optgroup>
                    <optgroup label="Fuerza">${op.levantamientos.map(l => `<option value="${l.clave}" ${_cl.clave === l.clave ? 'selected' : ''}>🏋 ${escapeHtml(l.nombre)}</option>`).join('')}</optgroup>
                </select>`}
            </div>
        </div>
        <div id="cl-tabla">${showLoading()}</div>
        <div class="card cl-ajustes">
            <label class="cl-interruptor">
                <input type="checkbox" ${op.visible ? 'checked' : ''} onchange="clVisible(this.checked)">
                <span class="cl-interruptor-pista" aria-hidden="true"></span>
                <span><strong>Aparecer en las clasificaciones</strong><small>Si lo apagas, los demás no te ven; tú sigues viendo tu puesto. Nunca se muestran tus datos de salud ni tus lesiones.</small></span>
            </label>
        </div>
        <details class="card rg-explica">
            <summary class="card-header"><h2>¿Cómo se gana?</h2></summary>
            <div class="card-body">
                <p><strong>🔥 Constancia</strong> premia cumplir tu plan, no el talento: cualquiera puede ir primero.</p>
                <p>· Registrar cómo amaneciste: <strong>10 puntos</strong> al día · Sesión del plan completa: <strong>30</strong> (a medias o apuntada a mano: 15) · Cada comida apuntada: <strong>5</strong> (hasta 4 al día). Cuenta una sesión por día.</p>
                <p><strong>🏅 Marcas</strong> ordena tu mejor resultado con la misma escala de los rangos, que tiene en cuenta si eres hombre o mujer y, en fuerza, tu peso corporal. Así es justo comparar a todos.</p>
                <p><strong>✓ Marcas verificadas:</strong> en tu equipo solo cuentan las que registra o verifica tu entrenador. En todo el deporte también entran las tuyas, salvo las sospechosas sin verificar: de nivel Diamante o más, o una mejora demasiado grande de golpe (más de un 15 % en un test o un 25 % en fuerza en pocas semanas).</p>
                <p>En tu equipo se ven los nombres completos; en todo el deporte, solo el nombre y la inicial del apellido.</p>
            </div>
        </details>
    </div>`;
    await clCargarTabla();
}

function clCambiar(campo, valor) {
    _cl[campo] = valor;
    if (campo === 'pestana') enSegundoPlano(pfRenderClasificacion());
    else enSegundoPlano(clCargarTabla());
}

async function clCargarTabla() {
    const cont = document.getElementById('cl-tabla');
    if (!cont) return;
    cont.innerHTML = showLoading();
    const q = _cl.pestana === 'constancia'
        ? `constancia?ambito=${_cl.ambito}&periodo=${_cl.periodo}`
        : `marcas?ambito=${_cl.ambito}&clave=${encodeURIComponent(_cl.clave || '')}`;
    const d = await apiFetch(`${API}/clasificacion/${q}`).then(r => r.json()).catch(() => null);
    if (!d?.ok) { cont.innerHTML = `<div class="card"><div class="card-body"><p class="ls-vacio">${escapeHtml(d?.error || 'No se pudo cargar la tabla.')}</p></div></div>`; return; }
    const esMarca = _cl.pestana === 'marcas';
    const aviso = d.faltaDato ? `<div class="eq-info">ℹ️ ${escapeHtml(d.faltaDato)} <button type="button" class="enlace-atleta" onclick="pfRenderView('perfil')">Ir a Mi Perfil →</button></div>` : '';
    if (!d.filas.length) {
        cont.innerHTML = `${aviso}<div class="card empty-state"><p>${esMarca
            ? 'Nadie tiene todavía una marca en esta prueba. ¡Sé el primero! Regístrala en Tests físicos o apunta tus series en la rutina.'
            : 'Aún no hay puntos en este periodo.'}</p></div>`;
        return;
    }
    const verif = f => esMarca ? (f.verificado ? ' <span class="vf-badge vf-ok" title="Registrada o verificada por un entrenador">✓</span>' : ' <span class="vf-badge" title="La apuntó el propio atleta">sin verificar</span>') : '';
    const valor = f => esMarca ? `${escapeHtml(f.marca)}${verif(f)}` : `<strong>${f.puntos}</strong> pts`;
    const detalle = f => esMarca
        ? `<span class="cl-rango" style="color:${f.rango.color}">${rgEmblema(f.rango, 26)} ${escapeHtml(f.rango.etiqueta)}</span>`
        : `<span class="cl-detalle">🌅 ${f.salud} · 🏃 ${f.sesiones} · 🍽 ${f.comidas}</span>`;
    const podio = d.filas.slice(0, 3);
    const orden = [podio[1], podio[0], podio[2]].filter(Boolean); // 2.º, 1.º, 3.º como en un podio
    cont.innerHTML = `${aviso}
    <div class="cl-podio">
        ${orden.map(f => `
        <div class="cl-podio-puesto cl-p${f.posicion > 3 ? 3 : f.posicion} ${f.esYo ? 'cl-yo' : ''}">
            ${f.posicion === 1 ? '<span class="cl-corona" aria-hidden="true">👑</span>' : ''}
            <div class="cl-avatar">${avatarContenido(f.id, f.nombre)}</div>
            <strong class="cl-podio-nombre">${escapeHtml(f.nombre)}${f.esYo ? ' (tú)' : ''}</strong>
            <span class="cl-podio-valor">${valor(f)}</span>
            ${esMarca ? detalle(f) : ''}
            <div class="cl-pedestal"><span>${f.posicion}</span></div>
        </div>`).join('')}
    </div>
    <div class="card cl-tabla">
        <div class="card-header"><h2>${escapeHtml(d.titulo)}</h2><span class="ls-lesion-sub">${d.total} ${d.total === 1 ? 'atleta' : 'atletas'}${esMarca ? '' : ` · desde ${formatFecha(d.desde)}`}</span></div>
        ${d.filas.map(f => clFila(f, valor, detalle)).join('')}
        ${d.fueraDelTop ? `<div class="cl-separador">···</div>${clFila(d.fueraDelTop, valor, detalle)}` : ''}
    </div>
    ${d.yo ? `<p class="cl-animo">${clAnimo(d)}</p>` : ''}`;
}

function clFila(f, valor, detalle) {
    return `
    <div class="cl-fila ${f.esYo ? 'cl-yo' : ''}">
        <span class="cl-pos cl-pos-${f.posicion <= 3 ? f.posicion : 'n'}">${f.posicion}</span>
        <div class="cl-avatar cl-avatar-sm">${avatarContenido(f.id, f.nombre)}</div>
        <div class="cl-fila-texto"><strong>${escapeHtml(f.nombre)}${f.esYo ? ' · tú' : ''}</strong>${detalle(f)}</div>
        <span class="cl-valor">${valor(f)}</span>
    </div>`;
}

/** Frase de ánimo según el puesto (nunca regaña). */
function clAnimo(d) {
    const yo = d.yo;
    if (yo.posicion === 1) return '👑 ¡Vas primero! Mantén el ritmo.';
    const delante = d.filas.find(f => f.posicion === yo.posicion - 1) || d.filas.filter(f => f.posicion < yo.posicion).at(-1);
    if (_cl.pestana === 'constancia' && delante) {
        const falta = delante.puntos - yo.puntos + 1;
        return `🔥 Te faltan <strong>${falta} puntos</strong> para pasar a ${escapeHtml(delante.nombre)}: ${falta <= 10 ? 'con registrar tu salud mañana lo logras' : falta <= 30 ? 'una sesión completa y lo pasas' : 'sesión, salud y comidas al día, y lo alcanzas'}.`;
    }
    return '💪 Cada récord te acerca al siguiente puesto: apunta tus series y repite el test cada semana.';
}

async function clVisible(valor) {
    const res = await apiFetch(`${API}/clasificacion/visible`, { method: 'PUT', body: JSON.stringify({ visible: valor }) }).then(r => r.json()).catch(() => null);
    if (!res?.ok) return showToast('No se pudo guardar.', 'error');
    _cl.opciones.visible = res.visible;
    showToast(res.visible ? 'Apareces en las clasificaciones' : 'Ya no apareces en las clasificaciones');
}
