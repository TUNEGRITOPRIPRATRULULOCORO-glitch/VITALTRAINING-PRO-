/* =============================================
   VitalTraining — atleta-plan.js
   Plan del atleta: perfil médico, rutina, plan de comidas y asistente IA.
============================================= */

// — ONBOARDING: PERFIL MÉDICO —
let _onbCat  = null;
let _onbDatos = {};

// actualizando=true cuando el atleta ya tiene perfil y entra desde "Actualizar perfil":
// el menú sigue activo, se puede volver sin guardar y se parte de sus respuestas actuales.
let _onbActualizando = false;

async function pfRenderOnboarding(actualizando = false) {
    _onbActualizando = actualizando;
    document.querySelectorAll('#panel-futbolista .nav-btn').forEach(b=>{
        b.disabled = !actualizando;
        b.classList.toggle('active', actualizando && b.dataset.pfView === 'plan');
    });
    const main=document.getElementById('pf-content');
    main.innerHTML=showLoading();
    const [catalogo, actual] = await Promise.all([
        apiFetch(`${API}/perfil-medico/catalogos`).then(r=>r.json()).catch(()=>null),
        actualizando ? apiFetch(`${API}/perfil-medico/${currentUser.id}`).then(r=>r.json()).catch(()=>null) : null
    ]);
    _onbCat = catalogo;
    if(!_onbCat?.ok){ main.innerHTML=showError('No se pudo cargar el catálogo médico.',`pfRenderOnboarding(${actualizando})`); return; }
    const p = actual?.perfil;
    _onbDatos={
        condiciones: p?.condiciones || [],
        alergias:    p?.alergias || [],
        preferencia: p?.preferencias || 'Sin restricciones'
    };
    pfOnboardingStep1();
}

function pfOnbVolverHTML() {
    return _onbActualizando
        ? `<button class="btn btn-ghost btn-sm onb-volver" onclick="pfRenderView('plan')">← Volver a mi plan sin guardar cambios</button>`
        : '';
}

function pfOnboardingStep1() {
    const catLabels={
        musculoesqueleticas:'🦴 Musculoesqueléticas',
        cardiorrespiratorias:'❤️ Cardiorrespiratorias',
        metabolicas:'⚗️ Metabólicas',
        digestivas:'🫁 Digestivas',
        neurologicasMentales:'🧠 Neurológicas / Mentales',
        otras:'🩺 Otras condiciones'
    };
    const condHTML=Object.entries(_onbCat.CONDICIONES).map(([key,conds])=>`
        <div class="onb-group">
            <div class="onb-group-title">
                ${catLabels[key]||key}
                <button class="onb-ninguna-cat-btn" onclick="pfOnboardingNingunaCat('onb-cat-${key}')">Ninguna</button>
            </div>
            <div class="onb-checks" id="onb-cat-${key}">
                ${conds.map(c=>`
                <label class="onb-check ${_onbDatos.condiciones.includes(c)?'checked':''}">
                    <input type="checkbox" value="${c.replace(/"/g,'&quot;')}" ${_onbDatos.condiciones.includes(c)?'checked':''}>
                    <span>${c}</span>
                </label>`).join('')}
            </div>
        </div>`).join('');
    document.getElementById('pf-content').innerHTML=`
    <div class="onb-wizard view-enter">
        ${pfOnbVolverHTML()}
        <div class="onb-progress">
            <div class="onb-step onb-step-active">1. Condiciones</div>
            <div class="onb-step-line"></div>
            <div class="onb-step">2. Alergias</div>
            <div class="onb-step-line"></div>
            <div class="onb-step">3. Preferencias</div>
        </div>
        <div class="onb-header">
            <h1>Tu Perfil Médico Deportivo</h1>
            <p>Para personalizar tu plan de entrenamiento y nutrición necesitamos conocer tu estado de salud. Esta información es confidencial y solo podrán consultarla el equipo médico, tu nutricionista y administradores autorizados.</p>
        </div>
        <div class="onb-section-title">¿Tienes alguna de estas condiciones de salud?</div>
        <p class="onb-hint">Selecciona las que apliquen. Cada categoría tiene su botón <strong>Ninguna</strong> si no aplica ninguna de ese grupo.</p>
        <div class="onb-conditions">${condHTML}</div>
        <div class="onb-actions">
            <div></div>
            <button class="btn btn-primary" onclick="pfOnboardingGoStep2()">Siguiente: Alergias →</button>
        </div>
    </div>`;
}

function pfOnboardingNingunaCat(grupoId) {
    document.querySelectorAll(`#${grupoId} input[type=checkbox]`).forEach(cb=>cb.checked=false);
}

function pfOnboardingGoStep2() {
    _onbDatos.condiciones=Array.from(document.querySelectorAll('.onb-conditions input[type=checkbox]:checked')).map(el=>el.value);
    pfOnboardingStep2();
}

function pfOnboardingStep2() {
    const gruposAlerg = {
        'Cereales y gluten':     ['Gluten (trigo, cebada, centeno)'],
        'Lácteos':               ['Lácteos / Lactosa'],
        'Proteínas animales':    ['Huevo','Mariscos','Pescado'],
        'Frutos secos':          ['Frutos secos (nueces, almendras, etc.)','Cacahuetes / Maní'],
        'Otros alimentos':       ['Soya / Soja','Maíz','Cítricos (naranja, limón)','Fresas / Frutos rojos','Chocolate / Cacao'],
        'Aditivos y especias':   ['Sulfitos (conservas, vino)','Sésamo / Ajonjolí','Mostaza','Apio']
    };
    const alergGruposHTML = Object.entries(gruposAlerg).map(([grupo, items])=>`
        <div class="onb-group">
            <div class="onb-group-title">
                ${grupo}
                <button class="onb-ninguna-cat-btn" onclick="pfOnboardingNingunaCat('onb-alerg-${grupo.replace(/\s/g,'-')}')">Ninguna</button>
            </div>
            <div class="onb-checks" id="onb-alerg-${grupo.replace(/\s/g,'-')}">
                ${items.map(a=>`
                <label class="onb-check ${_onbDatos.alergias.includes(a)?'checked':''}">
                    <input type="checkbox" value="${a.replace(/"/g,'&quot;')}" ${_onbDatos.alergias.includes(a)?'checked':''}>
                    <span>${a}</span>
                </label>`).join('')}
            </div>
        </div>`).join('');
    document.getElementById('pf-content').innerHTML=`
    <div class="onb-wizard view-enter">
        ${pfOnbVolverHTML()}
        <div class="onb-progress">
            <div class="onb-step onb-step-done">✓ Condiciones</div>
            <div class="onb-step-line onb-step-line-done"></div>
            <div class="onb-step onb-step-active">2. Alergias</div>
            <div class="onb-step-line"></div>
            <div class="onb-step">3. Preferencias</div>
        </div>
        <div class="onb-header">
            <h1>Alergias e Intolerancias Alimentarias</h1>
            <p>Selecciona los alimentos que no puedes consumir. Cada grupo tiene su botón <strong>Ninguna</strong> si no aplica ninguno de ese grupo.</p>
        </div>
        <div class="onb-section-title">¿Eres alérgico o intolerante a alguno de estos alimentos?</div>
        <div class="onb-conditions">${alergGruposHTML}</div>
        <div class="onb-actions">
            <button class="btn btn-ghost" onclick="pfOnboardingStep1()">← Atrás</button>
            <button class="btn btn-primary" onclick="pfOnboardingGoStep3()">Siguiente: Preferencias →</button>
        </div>
    </div>`;
}

function pfOnboardingGoStep3() {
    _onbDatos.alergias=Array.from(document.querySelectorAll('.onb-conditions input[type=checkbox]:checked')).map(el=>el.value);
    pfOnboardingStep3();
}

function pfOnboardingStep3() {
    const prefHTML=_onbCat.PREFERENCIAS.map(p=>`
        <label class="onb-radio ${_onbDatos.preferencia===p?'checked':''}">
            <input type="radio" name="pref" value="${p.replace(/"/g,'&quot;')}" ${_onbDatos.preferencia===p?'checked':''}>
            <span>${p}</span>
        </label>`).join('');
    document.getElementById('pf-content').innerHTML=`
    <div class="onb-wizard view-enter">
        ${pfOnbVolverHTML()}
        <div class="onb-progress">
            <div class="onb-step onb-step-done">✓ Condiciones</div>
            <div class="onb-step-line onb-step-line-done"></div>
            <div class="onb-step onb-step-done">✓ Alergias</div>
            <div class="onb-step-line onb-step-line-done"></div>
            <div class="onb-step onb-step-active">3. Preferencias</div>
        </div>
        <div class="onb-header">
            <h1>Preferencias Alimentarias</h1>
            <p>Tu preferencia ayuda a diseñar un plan nutricional que disfrutes y puedas mantener a largo plazo.</p>
        </div>
        <div class="onb-section-title">¿Cuál es tu preferencia alimentaria?</div>
        <div class="onb-radios">${prefHTML}</div>
        <div class="onb-actions">
            <button class="btn btn-ghost" onclick="pfOnboardingStep2()">← Atrás</button>
            <button class="btn btn-primary" onclick="pfOnboardingGuardar()">✓ Generar mi plan personalizado</button>
        </div>
    </div>`;
}

async function pfOnboardingGuardar() {
    const sel=document.querySelector('.onb-radios input[type=radio]:checked');
    _onbDatos.preferencia=sel?sel.value:'Sin restricciones';
    const main=document.getElementById('pf-content');
    main.innerHTML=`
    <div class="onb-wizard">
        <div class="onb-header">
            <h1>⏳ Generando tu plan personalizado...</h1>
            <p>Estamos creando tu rutina de entrenamiento y plan alimenticio basado en tu perfil médico. Esto toma unos segundos.</p>
        </div>
        <div style="display:flex;justify-content:center;padding:40px"><div class="auth-spinner-lg"></div></div>
    </div>`;
    const perfilData=await apiFetch(`${API}/panel/${currentUser.id}/perfil`).then(r=>r.json()).catch(()=>null);
    const posicion=perfilData?.perfil?.posicion||'Mediocampista';
    const res=await apiFetch(`${API}/perfil-medico/${currentUser.id}`,{
        method:'POST', body:JSON.stringify({..._onbDatos, posicion})
    });
    if(!res.ok){ showToast('Error al guardar el perfil médico. Intenta de nuevo.','error'); pfOnboardingStep3(); return; }
    document.querySelectorAll('#panel-futbolista .nav-btn').forEach(b=>b.disabled=false);
    showToast(_onbActualizando?'Perfil actualizado. Tu plan se ha regenerado.':'¡Perfil médico completado! Tu plan personalizado ha sido generado.','success',5000);
    pfRenderView('plan');
}

// — MI PLAN (ATLETA) —
async function pfRenderPlan() {
    const userId=currentUser.id;
    const main=document.getElementById('pf-content');
    main.innerHTML=showLoading();
    const data=await apiFetch(`${API}/perfil-medico/${userId}`).then(r=>r.json()).catch(()=>null);
    if(!data?.perfil){ main.innerHTML=showError('No tienes un perfil médico guardado.','pfRenderView(\'plan\')'); return; }
    const{condiciones=[],alergias=[],preferencias='',planAlimenticio={},rutinaSemanal={}}=data.perfil;

    const semanaAlim   = planAlimenticio?.semana || [];
    const semanaRutina = rutinaSemanal?.semana   || [];

    const condTags=condiciones.length
        ? condiciones.map(c=>`<span class="plan-tag plan-tag-cond">${c}</span>`).join('')
        : `<span class="plan-tag plan-tag-none">Sin condiciones de salud</span>`;
    const alergTags=alergias.length
        ? alergias.map(a=>`<span class="plan-tag plan-tag-alerg">${a}</span>`).join('')
        : `<span class="plan-tag plan-tag-none">Sin alergias</span>`;
    const prefTag=`<span class="plan-tag plan-tag-pref">${preferencias||'Sin restricciones'}</span>`;

    const diasAlim   = semanaAlim.length;
    const diasRutina = semanaRutina.filter(d=>d.ejercicios&&d.ejercicios.length).length;
    const deporte    = rutinaSemanal?.deporte || currentUser.deporte_principal || 'Fútbol';

    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>Mi Plan Personalizado</h1><p>Diseñado para tu rendimiento y recuperación</p></div>
            <button class="btn btn-ghost" onclick="pfRenderOnboarding(true)">⚙️ Actualizar perfil</button>
        </div>

        ${SIN_COMPETICION.includes(deporte) ? '' : planSemanaPartidoHTML(rutinaSemanal?.diaPartidoElegido ?? rutinaSemanal?.diaPartido)}

        <div class="card" style="margin-bottom:24px">
            <div class="card-header"><h2>🩺 Tu Perfil Médico</h2></div>
            <div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">
                <div><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted);margin-bottom:6px">Condiciones de salud</div><div class="plan-perfil-tags">${condTags}</div></div>
                <div><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted);margin-bottom:6px">Alergias / Intolerancias</div><div class="plan-perfil-tags">${alergTags}</div></div>
                <div><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted);margin-bottom:6px">Preferencia alimentaria</div><div class="plan-perfil-tags">${prefTag}</div></div>
            </div>
        </div>

        <div class="historial-landing">
            <div class="historial-card" onclick="pfRenderPlanAlimenticio()">
                <div class="historial-card-icon">🍽</div>
                <div class="historial-card-title">Plan Alimenticio</div>
                <div class="historial-card-meta">${diasAlim ? diasAlim + ' días planificados' : 'Sin plan asignado'}</div>
                <div class="historial-card-arrow">→</div>
            </div>
            <div class="historial-card" onclick="pfRenderPlanRutina()">
                <div class="historial-card-icon">🏋</div>
                <div class="historial-card-title">Rutina de Entrenamiento</div>
                <div class="historial-card-meta">${diasRutina ? diasRutina + ' días de ejercicio' : 'Sin rutina asignada'}</div>
                <div class="historial-card-arrow">→</div>
            </div>
        </div>
    </div>`;
}

/** Día de partido: se elige aquí mismo y la semana (rutina, comidas, sueño) se reorganiza. */
function planSemanaPartidoHTML(diaPartido) {
    const i = DIAS_SEMANA.indexOf(diaPartido);
    const detalle = i >= 0 ? `
        <ul class="partido-semana">
            <li><strong>${DIAS_SEMANA[(i+6)%7]}</strong> (víspera): sesión corta y suave, más carbohidratos en las comidas.</li>
            <li><strong>Noches antes del partido</strong>: duerme 8-9 h.</li>
            <li><strong>${diaPartido}</strong>: partido. Comida principal 3-4 h antes.</li>
            <li><strong>${DIAS_SEMANA[(i+1)%7]}</strong>: recuperación (descanso o actividad muy suave).</li>
        </ul>` : diaPartido === 'Ninguno'
        ? '<p class="msg-ayuda">Semana sin partido fijo: el día que antes era de partido ahora es una sesión normal de práctica. Si un día compites, elígelo aquí.</p>'
        : '<p class="msg-ayuda">Elige el día y organizamos tu semana: la víspera suave y con más carbohidratos, y el día siguiente de recuperación.</p>';
    return `
        <div class="card partido-card" style="margin-bottom:24px">
            <div class="card-header"><h2>📅 Tu semana de partido</h2></div>
            <div style="padding:16px 20px">
                <label class="partido-label">¿Qué día tienes partido o competición?
                    <select onchange="pfCambiarDiaPartido(this.value)">${diasPartidoOpciones(diaPartido || '')}</select>
                </label>
                ${detalle}
            </div>
        </div>`;
}

async function pfCambiarDiaPartido(dia) {
    if (!dia) return;
    const res = await apiFetch(`${API}/panel/${currentUser.id}/perfil`, { method:'PUT', body: JSON.stringify({ diaPartido: dia }) });
    if (!res.ok) { showToast('No se pudo guardar el día', 'error'); return; }
    showToast(dia === 'Ninguno' ? 'Listo: semana sin partido fijo' : `Listo: tu semana se organiza para el ${dia.toLowerCase()}`);
    enSegundoPlano(pfRenderPlan());
}

// — PLAN ALIMENTICIO (ATLETA) —
const NUT_TOMAS = [
    { key:'desayuno',       label:'Desayuno' },
    { key:'meriendaMañana', label:'Merienda mañana' },
    { key:'almuerzo',       label:'Almuerzo' },
    { key:'meriendaTarde',  label:'Merienda tarde' },
    { key:'cena',           label:'Cena' }
];
const NUT_TIPO_DIA = {
    entreno:        { icono:'🏃', clase:'nut-dia-entreno' },
    recuperacion:   { icono:'🧘', clase:'nut-dia-recuperacion' },
    precompetencia: { icono:'🔋', clase:'nut-dia-vispera' },
    partido:        { icono:'🏆', clase:'nut-dia-partido' },
    descanso:       { icono:'😴', clase:'nut-dia-descanso' }
};
const NUT_DATO = { peso:'peso', altura:'altura', edad:'edad', sexo:'sexo' };

function nutFormato(n) { return Number(n || 0).toLocaleString('es-CO'); }

// Barras de proteína, carbohidratos y grasa según su parte de las calorías
function nutMacrosHTML(o) {
    const kcal = Math.max(1, o.kcal);
    const fila = (nombre, gramos, kcalPorGramo, clase) => {
        const pct = Math.round(gramos * kcalPorGramo / kcal * 100);
        return `<div class="nut-macro"><span>${nombre}</span><div class="nut-macro-barra"><div class="${clase}" style="width:${pct}%"></div></div><strong>${gramos} g</strong></div>`;
    };
    return fila('Proteína', o.proteina, 4, 'nut-p') + fila('Carbohidratos', o.carbs, 4, 'nut-c') + fila('Grasa', o.grasa, 9, 'nut-g');
}

function nutTarjetaObjetivo(titulo, o) {
    if (!o) return '';
    return `
    <div class="nut-objetivo">
        <div class="nut-objetivo-titulo">${titulo}</div>
        <div class="nut-kcal">${nutFormato(o.kcal)} <small>kcal</small></div>
        ${nutMacrosHTML(o)}
        <div class="nut-agua">💧 ${String(o.aguaLitros).replace('.', ',')} L de agua</div>
    </div>`;
}

async function pfRenderPlanAlimenticio() {
    const userId=currentUser.id;
    const main=document.getElementById('pf-content');
    main.innerHTML=showLoading();
    const data=await apiFetch(`${API}/perfil-medico/${userId}`).then(r=>r.json()).catch(()=>null);
    if(!data?.perfil){ main.innerHTML=showError('No tienes un perfil médico guardado.','pfRenderPlan()'); return; }
    const plan=data.perfil.planAlimenticio||{};
    const semana=plan.semana||[];
    const base=plan.base||{};
    const notas=(plan.notas||[]).filter(n=>!n.startsWith('📝'));

    const aviso = base.estimados?.length ? `
        <div class="nut-aviso">
            <div>📝 <strong>Faltan datos para afinar tu plan:</strong> ${base.estimados.map(c=>NUT_DATO[c]||c).join(', ')}. Mientras tanto usamos valores de referencia.</div>
            <button class="btn btn-primary btn-sm" onclick="pfRenderView('perfil')">Completar Mi Perfil</button>
        </div>` : '';

    const datosUsados = [
        base.peso && !base.estimados?.includes('peso') ? `${base.peso} kg` : null,
        base.altura && !base.estimados?.includes('altura') ? `${base.altura} cm` : null,
        base.edad && !base.estimados?.includes('edad') ? `${base.edad} años` : null,
        base.sexo,
        base.deporte ? `${getSportIcon(base.deporte)} ${base.deporte}` : null,
        base.posicion,
        base.objetivo ? `Objetivo: ${base.objetivo}` : null
    ].filter(Boolean).map(escapeHtml).join(' · ');

    const diasHTML = semana.length ? semana.map(dia=>{
        const tipo = NUT_TIPO_DIA[dia.tipoDia] || NUT_TIPO_DIA.entreno;
        const o = dia.objetivo;
        const comidas = NUT_TOMAS.map(t=>{
            const c = dia[t.key] || {};
            const porcion = c.porcion && c.porcion !== 1 ? `<span class="nut-porcion" title="Cantidad respecto a la receta">×${String(c.porcion).replace('.', ',')}</span>` : '';
            return `
            <div class="plan-meal">
                <div class="plan-meal-tipo">${t.label}</div>
                <div class="plan-meal-nombre">${escapeHtml(c.nombre||'—')}</div>
                <div class="plan-meal-kcal">${nutFormato(c.kcal)} kcal ${porcion}</div>
                ${c.proteina!=null?`<div class="plan-meal-macros">Proteína ${c.proteina} g · Carbohidratos ${c.carbs} g · Grasa ${c.grasa} g</div>`:''}
            </div>`;
        }).join('');
        return `
        <div class="plan-day-card">
            <div class="plan-day-header">
                <div class="plan-day-name">${dia.dia||''} ${o?`<span class="nut-dia ${tipo.clase}">${tipo.icono} ${escapeHtml(o.etiqueta)}</span>`:''}</div>
                <div class="plan-day-kcal">${o?`🎯 Meta del día: <strong>${nutFormato(o.kcal)} kcal</strong> · Proteína ${o.proteina} g · Carbohidratos ${o.carbs} g · Grasa ${o.grasa} g`:`~${nutFormato(dia.total?.kcal)} kcal`}</div>
            </div>
            <div class="plan-meals-grid">${comidas}</div>
        </div>`;
    }).join('') : `<p style="color:var(--text-muted);padding:16px 0">Plan no disponible.</p>`;

    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title">
                <button class="btn btn-ghost btn-sm" onclick="pfRenderPlan()" style="margin-bottom:6px">← Volver al plan</button>
                <h1>🍽 Plan Alimenticio</h1>
                <p>Calculado para tu cuerpo, tu deporte y lo que entrenas cada día</p>
            </div>
        </div>
        ${aviso}
        ${plan.objetivos ? `
        <div class="card nut-resumen">
            <div class="card-header"><h2>🎯 Tus objetivos diarios</h2></div>
            <div class="nut-resumen-cuerpo">
                <div class="nut-objetivos">
                    ${nutTarjetaObjetivo('Día de entreno', plan.objetivos.entreno)}
                    ${nutTarjetaObjetivo('Día de descanso', plan.objetivos.descanso)}
                </div>
                ${datosUsados ? `<p class="nut-datos">Calculado con: ${datosUsados}</p>` : ''}
                <div class="nut-glosario">
                    <div><strong>kcal (calorías)</strong> La energía total que necesitas ese día. Si comes menos, bajas de peso; si comes más, subes.</div>
                    <div><strong>Proteína</strong> Repara y construye músculo. Está en carne, pollo, pescado, huevo, lácteos y legumbres.</div>
                    <div><strong>Carbohidratos</strong> El combustible para entrenar y jugar. Arroz, pasta, papa, pan, avena y fruta.</div>
                    <div><strong>Grasa</strong> Energía de reserva y hormonas. Aceite de oliva, aguacate, frutos secos y pescado azul.</div>
                    <div><strong>g (gramos)</strong> Cantidad del nutriente, no del alimento: 100 g de pollo tienen unos 30 g de proteína.</div>
                </div>
                <details class="rd-explicacion">
                    <summary>¿Cómo se calcula?</summary>
                    Tu gasto en reposo sale de tu peso, altura, edad y sexo (fórmula Mifflin-St Jeor) y se multiplica según lo que entrenas ese día.
                    Los carbohidratos se ajustan a la carga del día: menos en descanso y más en la víspera del partido para llenar tus reservas.
                    La proteína se mantiene estable para recuperar músculo, y la grasa completa el resto. Las porciones (×1,5, ×0,75…) indican cuánto
                    servirte de cada receta para llegar a tu objetivo. Es una guía: tu nutricionista puede ajustarla.
                </details>
            </div>
        </div>` : ''}
        <div class="card">
            <div style="padding:20px">
                ${notas.length?`<div class="nut-notas">${notas.map(escapeHtml).join('<br>')}</div>`:''}
                ${diasHTML}
            </div>
        </div>
    </div>`;
}

async function pfRenderPlanRutina() {
    const userId=currentUser.id;
    const main=document.getElementById('pf-content');
    main.innerHTML=showLoading();
    const data=await apiFetch(`${API}/perfil-medico/${userId}`).then(r=>r.json()).catch(()=>null);
    if(!data?.perfil){ main.innerHTML=showError('No tienes un perfil médico guardado.','pfRenderPlan()'); return; }
    const{rutinaSemanal={}}=data.perfil;
    const semanaRutina = rutinaSemanal?.semana || [];
    const notasRutina  = rutinaSemanal?.notas  || [];

    const [cumplData, lesiones]=await Promise.all([
        apiFetch(`${API}/panel/${userId}/cumplimiento`).then(r=>r.json()).catch(()=>({datos:[]})),
        lsCargar(userId)
    ]);
    const deBaja=lesiones?.estado.estado==='no_apto';
    const cumplidos=cumplData.datos||[];
    const hoy=new Date().toISOString().slice(0,10);
    const diasSemana=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const diaHoy=diasSemana[new Date().getDay()];

    const rutinaHTML=semanaRutina.length?semanaRutina.map(dia=>{
        const esDescanso=!dia.ejercicios||dia.ejercicios.length===0;
        const yaCompleto=cumplidos.some(c=>c.diaSemana===dia.dia&&String(c.fecha||'').slice(0,10)===hoy);
        const esHoy=dia.dia===diaHoy;
        const ejercHTML=esDescanso
            ?`<span style="color:var(--text-muted);font-size:13px">Descanso activo · estiramientos suaves</span>`
            :dia.ejercicios.map(e=>{
                const det=!e.series ? (e.tiempo||'')
                    : e.repeticiones===1 ? `${e.series} series`
                    : e.repeticiones ? `${e.series}×${e.repeticiones} reps`
                    : e.series===1 ? (e.tiempo||'')
                    : `${e.series}×${e.tiempo||''}`;
                const nombreEsc=e.nombre.replace(/'/g,"\\'").replace(/"/g,'&quot;');
                return `<div class="plan-ejercicio"><div class="plan-ejercicio-info"><span>${e.nombre}</span><span class="plan-ejercicio-series">${det}</span></div><button class="btn-video" onclick="verVideoEjercicio('${nombreEsc}')">▶ Ver video</button></div>`;
            }).join('');
        const cumplBtn=esDescanso||deBaja?''
            :yaCompleto
                ?`<span class="cumpl-badge cumpl-ok">✅ Completado hoy</span>`
                :esHoy
                    ?`<button class="btn btn-primary btn-sm cumpl-btn" onclick="pfModalCumplimiento('${dia.dia}','${(dia.tipo||'').replace(/'/g,"\\'").replace(/"/g,'&quot;')}')">✓ Marcar como completado</button>`
                    :``;
        return `
        <div class="plan-rutina-dia ${yaCompleto?'plan-dia-completo':''} ${deBaja&&!esDescanso?'plan-dia-pausa':''}">
            <div class="plan-rutina-dia-header">
                <div class="plan-rutina-dia-nombre">${dia.dia||''} — ${dia.tipo||''}</div>
                <div style="display:flex;align-items:center;gap:8px">
                    ${cumplBtn}
                    <div class="plan-rutina-dia-tipo ${esDescanso?'descanso':''}">${esDescanso?'Descanso':'Entrenamiento'}</div>
                </div>
            </div>
            <div class="plan-ejercicios">${ejercHTML}</div>
        </div>`;}).join('')
        :`<p style="color:var(--text-muted);padding:16px 0">Rutina no disponible.</p>`;

    const notasRutinaHTML=notasRutina.length
        ?`<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;font-size:13px;color:#1e40af;margin-bottom:20px;line-height:1.8">${notasRutina.join('<br>')}</div>`:'';

    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title">
                <button class="btn btn-ghost btn-sm" onclick="pfRenderPlan()" style="margin-bottom:6px">← Volver al plan</button>
                <h1>🏋 Rutina de Entrenamiento</h1>
                <p>Tu programa de ejercicio semanal</p>
            </div>
        </div>
        <div class="card">
            <div style="padding:20px">${lsAvisoRutina(lesiones)}${notasRutinaHTML}${rutinaHTML}</div>
        </div>
    </div>`;
}

const RPE_ETIQUETAS = ['', 'Muy fácil', 'Muy fácil', 'Fácil', 'Fácil', 'Moderado', 'Moderado', 'Duro', 'Duro', 'Muy duro', 'Máximo'];

function pfModalCumplimiento(diaSemana, tipo) {
    const diaEsc=diaSemana.replace(/'/g,"\\'"), tipoEsc=tipo.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    openModal(`Sesión del ${diaSemana}`, `
        <div class="form-group"><label>¿Cómo te fue?</label>
            <div class="rd-opciones">
                <label class="rd-opcion"><input type="radio" name="cumpl-estado" value="completo" checked><span class="rd-radio"></span>La hice completa</label>
                <label class="rd-opcion"><input type="radio" name="cumpl-estado" value="parcial"><span class="rd-radio"></span>La hice a medias</label>
            </div>
        </div>
        <div class="form-group"><label>Duración (minutos)</label><input type="number" id="cumpl-minutos" value="60" min="1" max="300"></div>
        <div class="form-group"><label>¿Qué tan dura fue? <strong id="cumpl-rpe-lab">6 · Moderado</strong></label>
            <input type="range" id="cumpl-rpe" class="range-green" min="1" max="10" value="6" oninput="document.getElementById('cumpl-rpe-lab').textContent=this.value+' · '+RPE_ETIQUETAS[this.value]">
            <div class="rd-rango-lab"><span>1 · Muy fácil</span><span>10 · Máximo</span></div>
        </div>
        <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="pfMarcarCumplimiento('${diaEsc}','${tipoEsc}')">Guardar</button></div>`);
}

async function pfMarcarCumplimiento(diaSemana, tipo) {
    const userId=currentUser.id;
    const fecha=new Date().toISOString().slice(0,10);
    const estado=document.querySelector('input[name="cumpl-estado"]:checked')?.value||'completo';
    const duracionMinutos=Number(document.getElementById('cumpl-minutos')?.value)||60;
    const rpe=Number(document.getElementById('cumpl-rpe')?.value)||null;
    const res=await apiFetch(`${API}/panel/${userId}/cumplimiento`,{method:'POST',body:JSON.stringify({diaSemana,tipo,fecha,estado,duracionMinutos,rpe})}).then(r=>r.json()).catch(()=>null);
    closeModal();
    if(res?.ok){showToast(estado==='parcial'?`${diaSemana} registrado como parcial`:`¡${diaSemana} completado! 💪`);enSegundoPlano(pfRenderPlanRutina());}
    else showToast('Error al registrar cumplimiento','error');
}

function verVideoEjercicio(nombre) {
    const query = encodeURIComponent(nombre + ' ejercicio tutorial');
    const ytUrl = `https://www.youtube.com/results?search_query=${query}`;
    openModal('▶ ' + nombre, `
        <div class="video-preview-box">
            <div class="video-preview-icon">▶</div>
            <div class="video-preview-nombre">${nombre}</div>
            <div class="video-preview-hint">Los videos se abren en YouTube para mayor compatibilidad</div>
            <a href="${ytUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary video-preview-btn">
                Buscar en YouTube
            </a>
        </div>
    `);
}

// — ASISTENTE IA (ATLETA) —
// Chat con Vita: el atleta escribe como a una persona. Con Claude configurado en el servidor
// conversa de verdad; si no, responde el modo básico con los análisis de la app.
let _iaEnviando = false;

async function pfRenderIA() {
    const main = document.getElementById('pf-content');
    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>Asistente IA</h1><p>Habla con Vita sobre tu entrenamiento, tus comidas, tu descanso o tu próximo partido</p></div>
        </div>
        <div class="ia-chat">
            <div class="ia-chat-cabecera">
                <div class="ia-avatar" aria-hidden="true">🌿</div>
                <div class="ia-chat-quien"><strong>Vita</strong><span class="ia-estado" id="ia-estado">Conectando…</span></div>
                <button type="button" class="ia-nueva" onclick="iaNuevaConversacion()" title="Borrar la conversación y empezar de cero">↺ <span>Nueva conversación</span></button>
            </div>
            <div class="ia-mensajes" id="ia-mensajes" aria-live="polite"></div>
            <form class="ia-escribir" onsubmit="event.preventDefault(); iaEnviar()">
                <textarea id="ia-texto" rows="1" maxlength="2000" placeholder="Escribe tu mensaje…" aria-label="Mensaje para Vita"
                    oninput="iaAjustarAltura(this)" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();iaEnviar();}"></textarea>
                <button type="submit" class="ia-enviar" id="ia-enviar" aria-label="Enviar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>
                </button>
            </form>
            <div class="ia-aviso">Vita orienta, pero no sustituye a tu médico ni a tu nutricionista.</div>
        </div>
    </div>`;

    const data = await apiFetch(`${API}/ia/${currentUser.id}/chat`).then(r => r.json()).catch(() => null);
    const estado = document.getElementById('ia-estado');
    if (!estado) return; // cambió de pantalla mientras cargaba
    const basico = data?.modo !== 'claude';
    estado.textContent = basico ? 'Modo básico' : 'En línea';
    estado.classList.toggle('ia-basico', basico);
    estado.title = basico ? 'Responde con los análisis de la app. Para conversar libremente, el administrador debe activar Claude.' : '';

    const mensajes = data?.mensajes || [];
    if (mensajes.length) mensajes.forEach(m => iaPintarMensaje(m.rol, m.texto, m.fecha));
    else iaPintarMensaje('asistente', iaSaludo());
    document.getElementById('ia-texto')?.focus();
}

function iaSaludo() {
    const nombre = currentUser.nombre.split(' ')[0]; // iaPintarMensaje ya lo escapa
    return `¡Hola, ${nombre}! 👋 Soy Vita. Puedes preguntarme lo que quieras: si hoy te conviene entrenar fuerte, qué comer antes del partido, cómo mejorar tu descanso o cómo ajustar tu rutina. ¿En qué te ayudo?`;
}

// Texto seguro con **negritas** y saltos de línea
function iaFormato(texto) {
    return escapeHtml(texto).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function iaPintarMensaje(rol, texto, fecha = null, { seguro = false } = {}) {
    const lista = document.getElementById('ia-mensajes');
    if (!lista) return;
    const esAtleta = rol === 'atleta';
    const hora = fecha ? new Date(fecha) : new Date();
    const fila = document.createElement('div');
    fila.className = `ia-fila ia-fila-${esAtleta ? 'atleta' : 'asistente'}`;
    fila.innerHTML = `
        ${esAtleta ? '' : '<div class="ia-avatar" aria-hidden="true">🌿</div>'}
        <div>
            <div class="ia-burbuja">${seguro ? texto : iaFormato(texto)}</div>
            <div class="ia-hora">${hora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>`;
    lista.appendChild(fila);
    lista.scrollTop = lista.scrollHeight;
    return fila;
}

function iaAjustarAltura(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

async function iaEnviar() {
    const campo = document.getElementById('ia-texto');
    const texto = campo?.value.trim();
    if (!texto || _iaEnviando) return;
    _iaEnviando = true;
    document.getElementById('ia-enviar').disabled = true;
    campo.value = ''; iaAjustarAltura(campo);

    iaPintarMensaje('atleta', texto);
    const escribiendo = iaPintarMensaje('asistente', '<span class="ia-escribiendo"><span></span><span></span><span></span></span>', null, { seguro: true });
    escribiendo?.querySelector('.ia-burbuja').setAttribute('aria-label', 'Vita está escribiendo');

    try {
        const res = await apiFetch(`${API}/ia/${currentUser.id}/chat`, { method: 'POST', body: JSON.stringify({ mensaje: texto }) });
        const data = await res.json().catch(() => ({}));
        escribiendo?.remove();
        iaPintarMensaje('asistente', res.ok ? data.respuesta : (data.error || 'No pude responder. Inténtalo de nuevo.'));
    } catch {
        escribiendo?.remove();
        iaPintarMensaje('asistente', 'No me pude conectar. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
        _iaEnviando = false;
        const boton = document.getElementById('ia-enviar');
        if (boton) boton.disabled = false;
        document.getElementById('ia-texto')?.focus();
    }
}

async function iaNuevaConversacion() {
    if (!confirm('¿Borrar la conversación con Vita y empezar de nuevo?')) return;
    const res = await apiFetch(`${API}/ia/${currentUser.id}/chat`, { method: 'DELETE' });
    if (!res.ok) return showToast('No se pudo borrar la conversación', 'error');
    document.getElementById('ia-mensajes').innerHTML = '';
    iaPintarMensaje('asistente', iaSaludo());
}
