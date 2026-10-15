const { query } = require('../../data/db');

function avg(arr)    { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
function r1(n)       { return Math.round(n*10)/10; }
function getSemana(arr) {
  const hace7 = new Date(); hace7.setDate(hace7.getDate()-7);
  return arr.filter(x => new Date(x.createdAt||x.fecha) >= hace7);
}
function tieneCond(conds, ...palabras) {
  return palabras.some(p => conds.some(c => c.toLowerCase().includes(p.toLowerCase())));
}

// ── Dispatcher principal ───────────────────────────────────────────────────────
async function consulta(userId, tipo) {
  const tipoNorm = String(tipo || '').trim().toLowerCase();
  const [usuarioR, perfilR, pmR, saludR, comidasR, rutinasR, alertasR] = await Promise.all([
    query('SELECT * FROM usuarios WHERE id = $1', [userId]),
    query('SELECT * FROM perfiles WHERE user_id = $1', [userId]),
    query('SELECT * FROM perfiles_medicos WHERE user_id = $1', [userId]),
    query('SELECT id, user_id AS "userId", fecha, fatiga, sueno, recuperacion, notas, created_at AS "createdAt" FROM salud WHERE user_id = $1 ORDER BY fecha DESC', [userId]),
    query('SELECT id, user_id AS "userId", nombre, tipo, calorias, fecha, created_at AS "createdAt" FROM comidas WHERE user_id = $1 ORDER BY fecha DESC', [userId]),
    query('SELECT id, user_id AS "userId", nombre, tipo, duracion_minutos AS "duracionMinutos", fecha, created_at AS "createdAt" FROM rutinas WHERE user_id = $1 ORDER BY fecha DESC', [userId]),
    query('SELECT id, user_id AS "userId", tipo, mensaje, leida, fecha, created_at AS "createdAt" FROM alertas WHERE user_id = $1 ORDER BY created_at DESC', [userId])
  ]);

  const usuario = usuarioR.rows[0] || {};
  const perfil  = perfilR.rows[0] || {};
  const pmRow   = pmR.rows[0];
  const pm      = pmRow ? { condiciones: pmRow.condiciones || [], alergias: pmRow.alergias || [], preferencias: pmRow.preferencias, planAlimenticio: pmRow.plan_alimenticio, rutinaSemanal: pmRow.rutina_semanal } : null;
  const salud   = saludR.rows;
  const comidas = comidasR.rows;
  const rutinas = rutinasR.rows;
  const alertas = alertasR.rows;

  switch(tipoNorm) {
    case 'estado_semana':                 return estadoSemana(salud, comidas, rutinas, pm);
    case 'tendencia':                     return tendencia(salud, pm);
    case 'resumen':                       return resumen(salud, comidas, rutinas, alertas, pm);
    case 'entrenar_hoy':                  return entrenarHoy(salud, rutinas, pm);
    case 'fatiga':                        return fatiga(salud, rutinas, pm);
    case 'sobrecarga':                    return sobrecarga(rutinas, salud, pm);
    case 'sueno':                         return sueno(salud, pm);
    case 'recuperacion':                  return recuperacion(salud, rutinas, pm);
    case 'nutricion':                     return nutricion(comidas, perfil, pm);
    case 'calorias':                      return calorias(comidas, pm);
    case 'riesgo':                        return riesgo(salud, rutinas, alertas, pm);
    case 'alertas':                       return alertasResumen(alertas);
    case 'partido':                       return prePartido(salud, comidas, perfil, pm);
    case 'plan':                          return planSemana(salud, perfil, pm);
    case 'mejorar':                       return mejorar(salud, comidas, rutinas, pm);
    case 'personalizado':                 return planPersonalizado({ user: usuario, profile: perfil, pm, salud, comidas, rutinas, alertas, deporte: usuario?.deporte_principal || perfil?.deporte || 'Fútbol' });
    case 'plan_personalizado':            return planPersonalizado({ user: usuario, profile: perfil, pm, salud, comidas, rutinas, alertas, deporte: usuario?.deporte_principal || perfil?.deporte || 'Fútbol' });
    case 'entrenamiento_personalizado':   return planEntrenamientoPersonalizado({ user: usuario, pm, salud, rutinas, deporte: usuario?.deporte_principal || perfil?.deporte || 'Fútbol' });
    case 'alimentacion_personalizada':    return planAlimentacionPersonalizada({ user: usuario, pm, comidas, salud, deporte: usuario?.deporte_principal || perfil?.deporte || 'Fútbol' });
    default:                              return { respuesta: 'Consulta no reconocida.', tipo: 'warning' };
  }
}

// ── 1. ¿Cómo estoy esta semana? ───────────────────────────────────────────────
function estadoSemana(salud, comidas, rutinas, pm) {
  const ss = getSemana(salud);
  if (!ss.length) return { respuesta: 'No tienes registros de salud esta semana. Para analizarte debes registrar tu estado diariamente en "Mi Salud".', tipo: 'warning', icono: '📊' };

  const aF = r1(avg(ss.map(s=>s.fatiga)));
  const aS = r1(avg(ss.map(s=>s.sueno)));
  const aR = r1(avg(ss.map(s=>s.recuperacion)));
  const cs = getSemana(comidas).length;
  const rs = getSemana(rutinas);
  const min = rs.reduce((a,r)=>a+(Number(r.duracionMinutos)||0),0);
  const conds = pm?.condiciones || [];

  let estado = aF>=8 ? 'muy exigente con señales de agotamiento' : aF>=6 ? 'moderadamente exigente' : 'equilibrada';
  let tipo   = aF>=8 ? 'danger' : aF>=6 ? 'warning' : 'success';

  let txt = `Tu semana fue ${estado}. Fatiga promedio: ${aF}/10 · Sueño: ${aS}/10 · Recuperación: ${aR}/10.\n`;
  txt += `Registraste ${cs} comidas y ${rs.length} rutinas (${min} minutos de entrenamiento).\n`;

  if (aF>=8 && aS<=5) txt += '⚠️ Combinación crítica de fatiga alta y poco sueño — riesgo de sobrecarga elevado.\n';
  else if (aR>=7 && aF<=5) txt += '✅ Buena recuperación y fatiga controlada. Vas por buen camino.\n';
  else if (ss.length < 4)  txt += 'Te faltan registros — intenta registrar todos los días para un análisis más preciso.\n';

  // Recordatorios de contexto (no diagnósticos)
  if (conds.length) {
    if (tieneCond(conds,'asma') && aF>=6)
      txt += '🫁 Recordatorio: tienes asma registrada. Si la fatiga viene acompañada de dificultad para respirar, consulta a tu médico antes de tu próxima sesión.\n';
    if (tieneCond(conds,'arritmia','cardíaco','hipertensión') && aF>=7)
      txt += '❤️ Recordatorio: tienes una condición cardíaca registrada. Con fatiga alta, es recomendable que un médico evalúe si es seguro continuar entrenando a este ritmo.\n';
    if (tieneCond(conds,'diabetes') && aS<=5)
      txt += '🩸 Recordatorio: tienes diabetes registrada. Si el sueño deficiente se mantiene, podría afectar tu control — coméntalo con tu médico.\n';
    if (tieneCond(conds,'tendinitis','menisco','fascitis','lumbar') && aR<=4)
      txt += '🦵 Recordatorio: tienes una condición musculoesquelética registrada. Recuperación baja sostenida puede requerir revisión médica para descartar reagudización.\n';
  }

  return { respuesta: txt.trim(), tipo, icono: '📊' };
}

// ── 2. ¿Estoy mejorando? ─────────────────────────────────────────────────────
function tendencia(salud, pm) {
  if (salud.length < 4) return { respuesta: `Necesitas al menos 4 registros de salud para analizar tu tendencia. Llevas ${salud.length}. Registra diariamente.`, tipo: 'warning', icono: '📈' };

  const rec   = salud.slice(0,8).reverse();
  const mitad = Math.ceil(rec.length/2);
  const antes = rec.slice(0,mitad);
  const ahora = rec.slice(mitad);
  const conds = pm?.condiciones || [];

  const fatAnt = avg(antes.map(s=>s.fatiga));
  const fatAho = avg(ahora.map(s=>s.fatiga));
  const recAnt = avg(antes.map(s=>s.recuperacion));
  const recAho = avg(ahora.map(s=>s.recuperacion));
  const snAnt  = avg(antes.map(s=>s.sueno));
  const snAho  = avg(ahora.map(s=>s.sueno));

  const mejoras = [];
  const retrocesos = [];
  if (fatAho < fatAnt-0.5) mejoras.push('fatiga bajando'); else if (fatAho > fatAnt+0.5) retrocesos.push('fatiga subiendo');
  if (recAho > recAnt+0.5) mejoras.push('recuperación mejorando'); else if (recAho < recAnt-0.5) retrocesos.push('recuperación bajando');
  if (snAho  > snAnt+0.5)  mejoras.push('sueño mejorando'); else if (snAho < snAnt-0.5)  retrocesos.push('sueño empeorando');

  let txt = '', tipo = '';
  if (mejoras.length >= 2 && !retrocesos.length) { txt = `Tendencia positiva: ${mejoras.join(', ')}. Estás progresando bien.`; tipo = 'success'; }
  else if (retrocesos.length >= 2 && !mejoras.length) { txt = `Tendencia negativa: ${retrocesos.join(', ')}. Revisa tu rutina y descanso.`; tipo = 'danger'; }
  else if (mejoras.length) { txt = `Tendencia mixta. Mejoras en: ${mejoras.join(', ')}. Pendiente: ${retrocesos.join(', ')||'sin retrocesos claros'}.`; tipo = 'warning'; }
  else { txt = 'Tu estado se mantiene estable. No hay mejoras ni retrocesos significativos en los últimos registros.'; tipo = 'info'; }

  if (conds.length && retrocesos.includes('recuperación bajando') && tieneCond(conds,'tendinitis','menisco','lumbar','fascitis'))
    txt += '\n🦵 Recordatorio: tienes una condición musculoesquelética. Si la recuperación sigue bajando, considera consultar a tu médico para descartar que esté relacionado.';
  if (conds.length && retrocesos.includes('sueño empeorando') && tieneCond(conds,'insomnio','apnea','ansiedad','depresión'))
    txt += '\n🧠 Recordatorio: tienes una condición que puede influir en el sueño. Si el deterioro persiste, es recomendable comentárselo a un profesional de salud.';

  return { respuesta: txt, tipo, icono: '📈' };
}

// ── 3. Resumen semanal ────────────────────────────────────────────────────────
function resumen(salud, comidas, rutinas, alertas, pm) {
  const ss = getSemana(salud);
  const cs = getSemana(comidas);
  const rs = getSemana(rutinas);
  const noLeidas = alertas.filter(a=>!a.leida).length;
  const calTotal = cs.reduce((a,c)=>a+Number(c.calorias||0),0);
  const minTotal = rs.reduce((a,r)=>a+(Number(r.duracionMinutos)||0),0);
  const altaInt  = rs.filter(r=>r.intensidad==='alta').length;
  const conds    = pm?.condiciones || [];
  const alergias = pm?.alergias    || [];

  let txt = `Resumen de los últimos 7 días:\n`;
  txt += `• Registros de salud: ${ss.length}/7 días\n`;
  txt += `• Comidas registradas: ${cs.length} · ${calTotal} kcal totales\n`;
  txt += `• Rutinas completadas: ${rs.length} · ${minTotal} minutos · ${altaInt} de alta intensidad\n`;
  txt += `• Alertas sin leer: ${noLeidas}\n`;
  if (pm) {
    txt += `• Condiciones médicas: ${conds.length ? conds.slice(0,3).join(', ')+(conds.length>3?` (+${conds.length-3} más)`:'') : 'ninguna'}\n`;
    txt += `• Alergias alimentarias: ${alergias.length ? alergias.slice(0,2).join(', ')+(alergias.length>2?` (+${alergias.length-2} más)`:'') : 'ninguna'}\n`;
    txt += `• Preferencia alimentaria: ${pm.preferencias||'Sin restricciones'}\n`;
  }

  if (ss.length === 7) txt += '\n✅ Registro completo. ¡Excelente consistencia!';
  else if (ss.length < 3) txt += '\n⚠️ Menos de 3 registros de salud esta semana. La consistencia es clave.';

  return { respuesta: txt.trim(), tipo: ss.length>=5?'success':ss.length>=3?'warning':'danger', icono: '📋' };
}

// ── 4. ¿Puedo entrenar hoy? ───────────────────────────────────────────────────
function entrenarHoy(salud, rutinas, pm) {
  const hoy  = new Date().toISOString().slice(0,10);
  const reg  = salud.find(s => s.fecha === hoy);
  const conds = pm?.condiciones || [];

  if (!reg) return { respuesta: 'No has registrado tu estado de hoy. Ve a "Mi Salud", registra cómo te sientes y vuelve a consultar.', tipo: 'warning', icono: '🏃' };

  const { fatiga: f, sueno: s, recuperacion: r } = reg;

  // Umbrales más estrictos para condiciones de riesgo
  const esCardíaco    = tieneCond(conds,'arritmia','cardíaco','hipertensión','soplo');
  const esMusculo     = tieneCond(conds,'tendinitis','menisco','fascitis','lumbar','hernia','pubalgia','periostitis','bursitis');
  const esRespiratoro = tieneCond(conds,'asma');
  const esDiabetes    = tieneCond(conds,'diabetes','hipoglucemia');

  let txt = '', tipo = '';
  const limFatiga = esCardíaco ? 6 : 7;

  if (f >= 9) {
    txt = `Fatiga ${f}/10 — DESCANSO COMPLETO recomendado. Tu cuerpo está en el límite. Entrenar hoy aumenta el riesgo de lesión.`;
    tipo = 'danger';
  } else if (f >= limFatiga || r <= 3) {
    txt = `Fatiga ${f}/10 · Recuperación ${r}/10 — Solo entrenamiento ligero o técnico. Evita sprints y alta intensidad hoy.`;
    tipo = 'warning';
  } else if (s <= 4) {
    txt = `Sueño ${s}/10 — Puedes entrenar pero con cuidado. El bajo descanso aumenta el riesgo de lesiones y reduce la concentración.`;
    tipo = 'warning';
  } else {
    txt = `Fatiga ${f}/10 · Sueño ${s}/10 · Recuperación ${r}/10 — Estás en buen estado. ¡Puedes entrenar normalmente hoy!`;
    tipo = 'success';
  }

  if (esCardíaco)    txt += '\n❤️ Recordatorio: tienes una condición cardíaca. Tu médico es quien debe indicarte los límites de esfuerzo permitidos — consulta con él si tienes dudas.';
  if (esMusculo)     txt += '\n🦵 Recordatorio: tienes una condición musculoesquelética. Un calentamiento adecuado puede ayudar a reducir el riesgo — consulta con tu médico o fisioterapeuta si sientes molestias.';
  if (esRespiratoro) txt += '\n🫁 Recordatorio: tienes asma registrada. Si tu médico te indicó inhalador, tenlo disponible durante el entrenamiento.';
  if (esDiabetes)    txt += '\n🩸 Recordatorio: tienes diabetes registrada. Tu médico puede indicarte cómo manejar la glucosa durante el ejercicio.';

  return { respuesta: txt, tipo, icono: '🏃' };
}

// ── 5. ¿Tengo fatiga alta? ────────────────────────────────────────────────────
function fatiga(salud, rutinas, pm) {
  const u5 = salud.slice(0,5);
  if (!u5.length) return { respuesta: 'Sin registros de fatiga aún. Ve a "Mi Salud" y empieza a registrar tu estado diario.', tipo: 'warning', icono: '⚡' };

  const actual = u5[0].fatiga;
  const prom   = r1(avg(u5.map(s=>s.fatiga)));
  const rs     = getSemana(rutinas);
  const minSem = rs.reduce((a,r)=>a+(Number(r.duracionMinutos)||0),0);
  const altaInt= rs.filter(r=>r.intensidad==='alta').length;
  const conds  = pm?.condiciones || [];

  let txt = `Fatiga actual: ${actual}/10 · Promedio últimos ${u5.length} días: ${prom}/10.\n`;
  txt += `Esta semana: ${rs.length} sesiones · ${minSem} minutos · ${altaInt} de alta intensidad.\n`;

  if (actual>=9)      txt += '🔴 Fatiga crítica. Descanso total hoy.';
  else if (actual>=7) txt += '🟠 Fatiga alta. Reduce la intensidad o descansa mañana.';
  else if (actual>=5) txt += '🟡 Fatiga moderada. Escucha a tu cuerpo.';
  else                txt += '🟢 Fatiga baja. Estás en buen estado físico.';

  if (tieneCond(conds,'tendinitis','menisco','fascitis','pubalgia') && actual>=6)
    txt += '\n🦵 Recordatorio: tienes una condición musculoesquelética. Si la fatiga alta viene acompañada de dolor en la zona afectada, consulta a tu médico antes de seguir entrenando.';
  if (tieneCond(conds,'anemia') && actual>=6)
    txt += '\n🩸 Recordatorio: tienes anemia registrada. La fatiga persistente podría estar relacionada — es recomendable que tu médico evalúe si tu tratamiento es adecuado.';
  if (tieneCond(conds,'hipotiroidismo','hipertiroidismo') && prom>=6)
    txt += '\n⚗️ Recordatorio: tienes una condición tiroidea. La fatiga sostenida puede requerir revisión de tus niveles hormonales — consulta a tu endocrinólogo.';

  return { respuesta: txt.trim(), tipo: actual>=7?'danger':actual>=5?'warning':'success', icono: '⚡' };
}

// ── 6. ¿Estoy sobreentrenando? ────────────────────────────────────────────────
function sobrecarga(rutinas, salud, pm) {
  const rs   = getSemana(rutinas);
  const ss   = getSemana(salud);
  const alta  = rs.filter(r=>r.intensidad==='alta').length;
  const min   = rs.reduce((a,r)=>a+(Number(r.duracionMinutos)||0),0);
  const aF    = ss.length ? r1(avg(ss.map(s=>s.fatiga))) : null;
  const conds = pm?.condiciones || [];

  if (!rs.length) return { respuesta: 'No registraste rutinas esta semana. Sin datos de entrenamiento no puedo evaluar la carga.', tipo: 'warning', icono: '⚡' };

  // Umbrales más bajos para condiciones de riesgo
  const esRiesgo = tieneCond(conds,'arritmia','cardíaco','hipertensión','asma','diabetes','hernia','lumbar');
  const limAlta  = esRiesgo ? 2 : 4;
  const limMin   = esRiesgo ? 300 : 420;

  let txt = '', tipo = '';
  if (alta>=limAlta && aF && aF>=7) {
    txt = `🔴 Señales claras de sobrecarga: ${alta} sesiones de alta intensidad con fatiga promedio ${aF}/10. Necesitas al menos 2 días de recuperación activa.`;
    tipo = 'danger';
  } else if (alta>=(limAlta-1) || min>limMin) {
    txt = `🟠 Semana exigente: ${rs.length} sesiones · ${min} min · ${alta} de alta intensidad. Monitorea tu fatiga de cerca y descansa bien.`;
    tipo = 'warning';
  } else {
    txt = `🟢 Carga controlada: ${rs.length} sesiones · ${min} min · ${alta} de alta intensidad. Nivel adecuado esta semana.`;
    tipo = 'success';
  }

  if (esRiesgo && tipo !== 'success')
    txt += `\n⚠️ Recordatorio: tienes condiciones de salud registradas (${conds.slice(0,2).join(', ')}). Esto no determina tu límite, pero es recomendable que tu médico valide el nivel de carga que puedes manejar con seguridad.`;

  return { respuesta: txt, tipo, icono: '⚡' };
}

// ── 7. ¿Cómo está mi sueño? ───────────────────────────────────────────────────
function sueno(salud, pm) {
  const u7   = salud.slice(0,7);
  const conds = pm?.condiciones || [];
  if (!u7.length) return { respuesta: 'Sin registros de sueño. Registra tu estado diariamente en "Mi Salud".', tipo: 'warning', icono: '😴' };

  const prom   = r1(avg(u7.map(s=>s.sueno)));
  const tend   = u7.length>=3 ? (u7[0].sueno>u7[2].sueno?'mejorando':u7[0].sueno<u7[2].sueno?'empeorando':'estable') : 'estable';
  const minimo = Math.min(...u7.map(s=>s.sueno));

  let txt = '', tipo = '';
  if (prom<=4) {
    txt = `🔴 Sueño promedio: ${prom}/10 — crítico. Un futbolista necesita entre 7-9 horas. El sueño deficiente afecta la recuperación muscular, los reflejos y el rendimiento.`;
    tipo = 'danger';
  } else if (prom<=6) {
    txt = `🟡 Sueño promedio: ${prom}/10 — regular. Intenta acostarte a la misma hora cada noche.`;
    tipo = 'warning';
  } else {
    txt = `🟢 Sueño promedio: ${prom}/10 — bueno. Estás descansando suficiente para una recuperación óptima.`;
    tipo = 'success';
  }
  txt += ` Tendencia: ${tend}. Mínimo registrado esta semana: ${minimo}/10.`;

  if (tieneCond(conds,'insomnio') && prom<=6)
    txt += '\n😴 Recordatorio: tienes insomnio crónico registrado. Si el sueño sigue siendo bajo, consulta con tu médico — puede haber ajustes en tu tratamiento que ayuden.';
  if (tieneCond(conds,'apnea') && prom<=5)
    txt += '\n😴 Recordatorio: tienes apnea del sueño registrada. El sueño de baja calidad podría estar relacionado — es recomendable que tu médico lo evalúe.';
  if (tieneCond(conds,'ansiedad','depresión') && tend==='empeorando')
    txt += '\n🧠 Recordatorio: tienes una condición que puede influir en el sueño. Si el deterioro persiste, coméntalo con tu médico o psicólogo.';
  if (tieneCond(conds,'diabetes') && prom<=5)
    txt += '\n🩸 Recordatorio: tienes diabetes registrada. Si el sueño deficiente se mantiene, puede ser relevante comentárselo a tu médico en la próxima consulta.';

  return { respuesta: txt, tipo, icono: '😴' };
}

// ── 8. ¿Cómo está mi recuperación? ───────────────────────────────────────────
function recuperacion(salud, rutinas, pm) {
  const u5    = salud.slice(0,5);
  const conds = pm?.condiciones || [];
  if (!u5.length) return { respuesta: 'Sin registros de recuperación aún.', tipo: 'warning', icono: '💪' };

  const prom = r1(avg(u5.map(s=>s.recuperacion)));
  const rs   = getSemana(rutinas);
  const alta = rs.filter(r=>r.intensidad==='alta').length;

  let txt = '', tipo = '';
  if (prom<=3) {
    txt = `🔴 Recuperación promedio: ${prom}/10 — muy baja.`;
    if (alta>=3) txt += ` Llevas ${alta} sesiones de alta intensidad recientes — tu cuerpo no está recuperándose suficiente.`;
    txt += ' Prioriza el descanso, la hidratación y la nutrición post-entrenamiento.';
    tipo = 'danger';
  } else if (prom<=6) {
    txt = `🟡 Recuperación promedio: ${prom}/10 — moderada. Puedes mejorar con mejor nutrición post-entrenamiento y más horas de sueño.`;
    tipo = 'warning';
  } else {
    txt = `🟢 Recuperación promedio: ${prom}/10 — excelente. Tu cuerpo está respondiendo bien al entrenamiento.`;
    tipo = 'success';
  }

  if (tieneCond(conds,'tendinitis','menisco','bursitis','fascitis','shin splints') && prom<=5)
    txt += '\n🦵 Recordatorio: tienes una condición musculoesquelética. Si la recuperación baja es constante, podría valer la pena consultarlo con tu médico o fisioterapeuta.';
  if (tieneCond(conds,'artritis') && prom<=5)
    txt += '\n🦴 Recordatorio: tienes artritis registrada. Si sientes inflamación persistente post-entrenamiento, consúltalo con tu reumatólogo.';
  if (tieneCond(conds,'anemia') && prom<=5)
    txt += '\n🩸 Recordatorio: tienes anemia registrada. Si la recuperación es lenta de forma persistente, comenta con tu médico si tu tratamiento actual es suficiente.';

  return { respuesta: txt, tipo, icono: '💪' };
}

// ── 9. ¿Cómo va mi alimentación? ─────────────────────────────────────────────
function nutricion(comidas, perfil, pm) {
  const sem     = getSemana(comidas);
  const conds   = pm?.condiciones  || [];
  const alergias = pm?.alergias    || [];
  const pref    = pm?.preferencias || 'Sin restricciones';

  if (!sem.length) return { respuesta: 'No tienes comidas registradas esta semana. El nutricionista no puede hacerte seguimiento sin estos datos. Registra tus comidas diariamente.', tipo: 'warning', icono: '🍽' };

  const calTotal  = sem.reduce((a,c)=>a+Number(c.calorias||0),0);
  const calDia    = r1(calTotal/7);
  const porTipo   = sem.reduce((acc,c)=>{acc[c.tipo]=(acc[c.tipo]||0)+1;return acc;},{});
  const frecuente = Object.entries(porTipo).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
  const diasConComida = [...new Set(sem.map(c=>c.fecha))].length;

  let txt = `Registraste ${sem.length} comidas en ${diasConComida} días (~${calDia} kcal/día). Tipo más frecuente: ${frecuente}.\n`;

  if (calDia<1800)      txt += '⚠️ Posible déficit calórico. Un futbolista activo necesita entre 2500-3500 kcal/día.\n';
  else if (calDia>4000) txt += '⚠️ Ingesta calórica muy alta. Verifica que corresponde a tu nivel de entrenamiento.\n';
  else                  txt += '✅ Tu ingesta calórica está dentro del rango normal para un atleta activo.\n';

  if (diasConComida<4)  txt += '⚠️ Registra todos los días para que el nutricionista te pueda hacer un seguimiento completo.\n';

  // Consejos específicos por condición
  if (tieneCond(conds,'diabetes'))
    txt += '🩸 Con diabetes: prioriza carbohidratos complejos (avena, arroz integral, camote) y evita azúcares simples.\n';
  if (tieneCond(conds,'hipertensión'))
    txt += '❤️ Con hipertensión: reduce el sodio al máximo. Evita alimentos procesados, embutidos y comidas en conserva.\n';
  if (tieneCond(conds,'colesterol'))
    txt += '❤️ Con colesterol alto: prioriza grasas saludables (aguacate, aceite de oliva, nueces) y evita frituras.\n';
  if (tieneCond(conds,'anemia'))
    txt += '🩸 Con anemia: incluye fuentes de hierro (carnes rojas magras, legumbres, espinaca) y combínalas con vitamina C.\n';
  if (tieneCond(conds,'celiaca','gluten') || alergias.some(a=>a.includes('Gluten')))
    txt += '🌾 Sin gluten: verifica que todos tus alimentos estén certificados sin gluten — la contaminación cruzada es frecuente.\n';
  if (tieneCond(conds,'intestino','Crohn','colitis','reflujo','gastritis'))
    txt += '🫁 Con tu condición digestiva: come despacio, en porciones pequeñas y evita comidas copiosas antes del entrenamiento.\n';
  if (pref.includes('Vegetariano') || pref.includes('Vegano'))
    txt += `🌱 Con preferencia ${pref}: asegúrate de cubrir tu proteína con legumbres, tofu, quinoa y suplementos de B12 si es vegano.\n`;
  if (alergias.length)
    txt += `🚫 Alergias registradas: ${alergias.slice(0,3).join(', ')}${alergias.length>3?` (+${alergias.length-3} más)`:''} — tu plan alimenticio ya excluye estos alimentos.\n`;

  if (pm?.planAlimenticio?.semana?.length)
    txt += '📋 Tienes un plan alimenticio personalizado generado en "Mi Plan" — úsalo como guía base para tus comidas.';

  return { respuesta: txt.trim(), tipo: 'info', icono: '🍽' };
}

// ── 10. ¿Cuántas calorías? ────────────────────────────────────────────────────
function calorias(comidas, pm) {
  const sem   = getSemana(comidas);
  const conds = pm?.condiciones || [];
  if (!sem.length) return { respuesta: 'Sin comidas registradas esta semana. Registra tu alimentación para ver el análisis calórico.', tipo: 'warning', icono: '🔥' };

  const total     = sem.reduce((a,c)=>a+Number(c.calorias||0),0);
  const porDia    = r1(total/7);
  const porComida = r1(total/sem.length);
  const porTipoCal = sem.reduce((acc,c)=>{acc[c.tipo]=(acc[c.tipo]||0)+Number(c.calorias||0);return acc;},{});
  const masCals   = Object.entries(porTipoCal).sort((a,b)=>b[1]-a[1])[0];

  // Rango calórico personalizado por condición
  let minKcal = 2200, maxKcal = 3500;
  if (tieneCond(conds,'sobrepeso','obesidad')) { minKcal = 2000; maxKcal = 2800; }
  if (tieneCond(conds,'diabetes'))             { minKcal = 2000; maxKcal = 2800; }
  if (tieneCond(conds,'hipotiroidismo'))       { minKcal = 2000; maxKcal = 2800; }

  let txt = `Total semanal: ${total} kcal · Promedio diario: ${porDia} kcal · Por comida: ${porComida} kcal.\n`;
  if (masCals) txt += `Mayor aporte calórico: ${masCals[0]} (${masCals[1]} kcal).\n`;

  if (porDia<minKcal)      txt += `⚠️ Déficit calórico probable. Para tu perfil, el rango recomendado es ${minKcal}-${maxKcal} kcal/día.`;
  else if (porDia>maxKcal) txt += `⚠️ Ingesta por encima del rango recomendado (${minKcal}-${maxKcal} kcal/día para tu perfil).`;
  else                     txt += `✅ Ingesta calórica dentro del rango recomendado para tu perfil (${minKcal}-${maxKcal} kcal/día).`;

  return { respuesta: txt.trim(), tipo: 'info', icono: '🔥' };
}

// ── 11. ¿Estoy en riesgo de lesión? ──────────────────────────────────────────
function riesgo(salud, rutinas, alertas, pm) {
  const ult      = salud[0];
  const noLeidas = alertas.filter(a=>!a.leida).length;
  const alta     = getSemana(rutinas).filter(r=>r.intensidad==='alta').length;
  const conds    = pm?.condiciones || [];

  if (!ult) return { respuesta: 'Sin datos de salud no puedo evaluar el riesgo de lesión. Registra tu estado diariamente.', tipo: 'warning', icono: '🦵' };

  const factores = [];
  if (ult.fatiga>=8)       factores.push(`fatiga alta (${ult.fatiga}/10)`);
  if (ult.recuperacion<=3) factores.push(`recuperación baja (${ult.recuperacion}/10)`);
  if (ult.sueno<=4)        factores.push(`poco sueño (${ult.sueno}/10)`);
  if (alta>=3)             factores.push(`${alta} sesiones de alta intensidad recientes`);
  if (noLeidas>=3)         factores.push(`${noLeidas} alertas sin revisar`);

  // Condiciones que aumentan el riesgo base
  const condsRiesgo = [];
  if (tieneCond(conds,'tendinitis'))          condsRiesgo.push('tendinitis activa');
  if (tieneCond(conds,'menisco'))             condsRiesgo.push('lesión de menisco');
  if (tieneCond(conds,'fascitis'))            condsRiesgo.push('fascitis plantar');
  if (tieneCond(conds,'pubalgia'))            condsRiesgo.push('pubalgia deportiva');
  if (tieneCond(conds,'lumbar','hernia'))     condsRiesgo.push('problema lumbar');
  if (tieneCond(conds,'esguince'))            condsRiesgo.push('esguince recurrente');
  if (tieneCond(conds,'arritmia','cardíaco')) condsRiesgo.push('condición cardíaca');
  if (tieneCond(conds,'asma'))                condsRiesgo.push('asma');
  if (tieneCond(conds,'diabetes'))            condsRiesgo.push('diabetes');
  if (condsRiesgo.length) factores.push(`condiciones médicas: ${condsRiesgo.join(', ')}`);

  const nivel = factores.length>=4?'ALTO':factores.length>=2?'MEDIO':'BAJO';
  const colores = { ALTO:'danger', MEDIO:'warning', BAJO:'success' };

  let txt = `Riesgo de lesión: ${nivel}.\n`;
  txt += factores.length ? `Factores detectados:\n${factores.map(f=>`• ${f}`).join('\n')}` : '✅ No se detectan factores de riesgo. Sigue así.';
  if (nivel==='ALTO') txt += '\n\n⚠️ Consulta con el cuerpo técnico y el nutricionista antes de tu próxima sesión intensa.';
  if (condsRiesgo.length && nivel!=='BAJO') txt += `\n💡 Recordatorio: tienes condiciones médicas registradas que podrían ser relevantes. No sustituimos la opinión de un médico — si tienes dudas sobre tu seguridad para entrenar, consúltalo con un profesional.`;

  return { respuesta: txt, tipo: colores[nivel], icono: '🦵' };
}

// ── 12. Mis alertas ───────────────────────────────────────────────────────────
function alertasResumen(alertas) {
  if (!alertas.length) return { respuesta: 'No tienes alertas registradas aún. Las alertas se generan automáticamente cuando tu fatiga, recuperación o sueño superan ciertos límites.', tipo: 'info', icono: '🔔' };

  const noLeidas = alertas.filter(a=>!a.leida);
  const porTipo  = alertas.reduce((acc,a)=>{acc[a.tipo]=(acc[a.tipo]||0)+1;return acc;},{});
  const masComun = Object.entries(porTipo).sort((a,b)=>b[1]-a[1])[0];

  let txt = `Tienes ${alertas.length} alertas en total · ${noLeidas.length} sin leer.\n`;
  txt += `Distribución: ${Object.entries(porTipo).map(([t,n])=>`${t} (${n})`).join(', ')}.\n`;
  if (masComun) txt += `La alerta más frecuente es de tipo "${masComun[0]}" — eso indica un patrón que debes atender.\n`;
  if (noLeidas.length>3)   txt += '⚠️ Tienes muchas alertas sin revisar. Ve a tu dashboard y márcalas como leídas.';
  else if (!noLeidas.length) txt += '✅ Todas tus alertas están revisadas.';

  return { respuesta: txt.trim(), tipo: noLeidas.length>3?'warning':'info', icono: '🔔' };
}

// ── 13. Antes del partido ─────────────────────────────────────────────────────
function prePartido(salud, comidas, perfil, pm) {
  const ult   = salud[0];
  const hoy   = new Date().toISOString().slice(0,10);
  const choy  = comidas.filter(c=>c.fecha===hoy);
  const pos   = perfil?.posicion || '';
  const conds = pm?.condiciones  || [];
  const alergias = pm?.alergias  || [];

  if (!ult) return { respuesta: 'Sin datos de salud no puedo darte recomendaciones para el partido. Registra tu estado primero.', tipo: 'warning', icono: '⚽' };

  let txt = '', tipo = '';
  if (ult.fatiga>=8) {
    txt = `⚠️ Con fatiga ${ult.fatiga}/10 tu rendimiento estará reducido. Comunícalo al cuerpo técnico.\n`;
    tipo = 'danger';
  } else {
    txt = `✅ Estás en condiciones de partido (fatiga ${ult.fatiga}/10 · recuperación ${ult.recuperacion}/10).\n`;
    tipo = 'success';
  }

  txt += 'Recomendaciones generales: hidratación 2-3h antes, carbohidratos 3h antes, evita comidas pesadas 1h antes.\n';
  if (!choy.length) txt += '⚠️ No has registrado comidas hoy — asegúrate de alimentarte bien antes del partido.\n';

  // Por posición
  if (pos==='Portero')          txt += '🥅 Como portero: enfócate en concentración y tiempo de reacción.\n';
  else if (pos==='Delantero')   txt += '⚽ Como delantero: carbohidratos simples (plátano, jugo natural) para energía rápida.\n';
  else if (pos.includes('Defensa') || pos==='Lateral') txt += '🛡️ Como defensa: hidratación máxima para mantener la resistencia en los duelos.\n';
  else if (pos==='Mediocampista') txt += '🎯 Como mediocampista: equilibrio entre carbohidratos y proteínas 3h antes.\n';
  else if (pos==='Extremo')      txt += '💨 Como extremo: carbohidratos de rápida absorción para mantener la velocidad.\n';

  // Por condición médica
  if (tieneCond(conds,'asma'))
    txt += '🫁 Recordatorio: tienes asma registrada. Si tu médico te indicó inhalador de rescate, tenlo disponible durante el partido.\n';
  if (tieneCond(conds,'diabetes','hipoglucemia'))
    txt += '🩸 Recordatorio: tienes diabetes/hipoglucemia registrada. Consulta con tu médico cómo manejar la glucosa en actividad competitiva.\n';
  if (tieneCond(conds,'arritmia','cardíaco','soplo'))
    txt += '❤️ Recordatorio: tienes una condición cardíaca. Si en algún momento sientes palpitaciones o molestia en el pecho, detente y avisa al médico del equipo.\n';
  if (tieneCond(conds,'hipertensión'))
    txt += '❤️ Recordatorio: tienes hipertensión registrada. Tu médico es quien mejor puede orientarte sobre límites de esfuerzo en competencia.\n';
  if (tieneCond(conds,'tendinitis','fascitis','menisco'))
    txt += '🦵 Recordatorio: tienes una condición musculoesquelética. Si sientes dolor inusual durante el partido, comunícalo al cuerpo técnico.\n';

  // Alergias alimentarias en comida pre-partido
  if (alergias.length)
    txt += `🚫 Revisa que tu comida pre-partido no contenga: ${alergias.slice(0,3).join(', ')}.\n`;

  return { respuesta: txt.trim(), tipo, icono: '⚽' };
}

// ── 14. Plan para la semana ───────────────────────────────────────────────────
function planSemana(salud, perfil, pm) {
  const ult     = salud[0];
  const pos     = perfil?.posicion || 'jugador';
  const cansado = ult && ult.fatiga>=7;
  const conds   = pm?.condiciones || [];
  const rutinaPM = pm?.rutinaSemanal?.semana || [];

  // Si tiene rutina generada en el perfil médico, usarla como base
  if (rutinaPM.length) {
    let txt = `Plan personalizado para la próxima semana (${pos})${conds.length?' · adaptado a tus condiciones':''}:\n\n`;
    rutinaPM.forEach(dia => {
      const esDescanso = !dia.ejercicios || dia.ejercicios.length === 0;
      txt += `• ${dia.dia}: ${dia.tipo}`;
      if (!esDescanso && dia.ejercicios?.length) txt += ` (${dia.ejercicios.length} ejercicios)`;
      txt += '\n';
    });
    if (cansado)        txt += '\n⚠️ Estás con fatiga alta — considera reducir la intensidad esta semana y priorizar recuperación.';
    else                txt += '\n✅ Tu plan ya está adaptado a tu posición y condiciones médicas. Consúltalo completo en "Mi Plan".';
    if (conds.length)   txt += `\n💊 Condiciones consideradas en la rutina: ${conds.slice(0,3).join(', ')}${conds.length>3?' y más':''}.`;
    return { respuesta: txt.trim(), tipo: cansado?'warning':'success', icono: '📅' };
  }

  // Sin perfil médico, plan genérico
  let txt = `Plan sugerido para la próxima semana (${pos}):\n`;
  if (cansado) {
    txt += '• Lunes: Recuperación activa — 30 min caminata o natación\n';
    txt += '• Martes: Técnica y táctica — baja intensidad\n';
    txt += '• Miércoles: Descanso completo\n';
    txt += '• Jueves: Entrenamiento media intensidad — 60 min\n';
    txt += '• Viernes: Técnica específica por posición\n';
    txt += '• Sábado: Partido o simulacro\n';
    txt += '• Domingo: Descanso completo\n';
    txt += '\n⚠️ Plan conservador por nivel actual de fatiga. Completa tu perfil médico para un plan personalizado.';
  } else {
    txt += '• Lunes: Entrenamiento físico alta intensidad — 75 min\n';
    txt += '• Martes: Técnica y táctica — media intensidad\n';
    txt += '• Miércoles: Recuperación activa\n';
    txt += '• Jueves: Entrenamiento físico — 60 min\n';
    txt += '• Viernes: Táctica de partido\n';
    txt += '• Sábado: Partido\n';
    txt += '• Domingo: Descanso completo\n';
    txt += '\n💡 Completa tu perfil médico en "Mi Plan" para obtener una rutina 100% adaptada a tu posición y condiciones.';
  }
  return { respuesta: txt.trim(), tipo: cansado?'warning':'success', icono: '📅' };
}

// ── 15. ¿Cómo puedo mejorar? ─────────────────────────────────────────────────
function mejorar(salud, comidas, rutinas, pm) {
  const ss    = getSemana(salud);
  const cs    = getSemana(comidas);
  const rs    = getSemana(rutinas);
  const conds = pm?.condiciones || [];

  const problemas = [];
  if (ss.length<5)                                   problemas.push({ area:'Consistencia', consejo:'Registra tu estado de salud todos los días. Solo con datos continuos puedo ayudarte de verdad.' });
  if (ss.length && avg(ss.map(s=>s.sueno))<6)        problemas.push({ area:'Sueño', consejo:'Duerme entre 7-9 horas. El sueño es cuando los músculos se reparan y el rendimiento se consolida.' });
  if (ss.length && avg(ss.map(s=>s.recuperacion))<5) problemas.push({ area:'Recuperación', consejo:'Incluye días de recuperación activa entre sesiones intensas y mejora la nutrición post-entrenamiento.' });
  if (cs.length<8)                                   problemas.push({ area:'Nutrición', consejo:'Registra más comidas diariamente. La nutrición es el 50% del rendimiento deportivo.' });
  if (!rs.length)                                    problemas.push({ area:'Entrenamiento', consejo:'Sin rutinas registradas no hay progreso visible. Empieza a registrar tus sesiones.' });

  // Consejos específicos por condición
  if (tieneCond(conds,'tendinitis','fascitis','menisco','lumbar'))
    problemas.push({ area:'Condición musculoesquelética', consejo:'Tienes una condición en esta área. Un fisioterapeuta o médico deportivo puede orientarte sobre cómo entrenar de forma segura y evitar reagudizaciones.' });
  if (tieneCond(conds,'anemia'))
    problemas.push({ area:'Anemia registrada', consejo:'La anemia puede influir en tu energía y recuperación. Consulta con tu médico si tu tratamiento es adecuado para tu nivel de actividad.' });
  if (tieneCond(conds,'diabetes','hipoglucemia'))
    problemas.push({ area:'Diabetes / Glucemia', consejo:'Tu médico puede darte un protocolo seguro para manejar la glucosa antes, durante y después del ejercicio.' });
  if (tieneCond(conds,'asma'))
    problemas.push({ area:'Asma registrada', consejo:'Un médico puede ayudarte a definir un protocolo de calentamiento seguro y el manejo del inhalador en el contexto deportivo.' });
  if (!pm)
    problemas.push({ area:'Perfil médico', consejo:'Completa tu perfil médico en "Mi Plan" para obtener un plan de alimentación y rutina 100% personalizado a tu estado de salud.' });

  if (!problemas.length) return { respuesta: 'Estás trabajando bien en todas las áreas. Mantén la consistencia y sigue registrando diariamente.', tipo: 'success', icono: '💡' };

  const principal = problemas[0];
  let txt = `Tu prioridad de mejora: ${principal.area}.\n${principal.consejo}`;
  if (problemas.length>1) txt += `\n\nOtras áreas a mejorar: ${problemas.slice(1).map(p=>p.area).join(', ')}.`;

  return { respuesta: txt, tipo: 'warning', icono: '💡' };
}

function normalizarObjetivo(texto = '') {
  const t = (texto || '').toLowerCase();
  if (t.includes('masa') || t.includes('ganar') || t.includes('volumen')) return 'ganar masa muscular';
  if (t.includes('peso') || t.includes('adelgazar') || t.includes('perder')) return 'perder grasa';
  if (t.includes('rendimiento') || t.includes('competencia') || t.includes('partido')) return 'rendimiento deportivo';
  if (t.includes('recuper') || t.includes('lesi')) return 'recuperación y prevención';
  return 'mantenimiento y mejora general';
}

function getUserSnapshot(user, salud, pm) {
  const actual = salud[0] || { fatiga: 5, sueno: 6, recuperacion: 5 };
  const condiciones = Array.isArray(pm?.condiciones) ? pm.condiciones : [];
  const alergias = Array.isArray(pm?.alergias) ? pm.alergias : [];
  const objetivo = normalizarObjetivo(user?.objetivo || user?.meta || '');
  const deporte = user?.deporte_principal || user?.deporte || 'Fútbol';
  const posicion = user?.posicion || 'general';
  const peso = Number(user?.peso || 70);
  const altura = Number(user?.altura || 170);
  const imc = altura > 0 ? peso / ((altura / 100) ** 2) : 22;

  return { actual, condiciones, alergias, objetivo, deporte, posicion, peso, altura, imc };
}

function planEntrenamientoPersonalizado({ user, pm, salud, rutinas, deporte }) {
  const snapshot = getUserSnapshot(user, salud, pm);
  const fatiga = snapshot.actual.fatiga ?? 5;
  const recuperacion = snapshot.actual.recuperacion ?? 5;
  const objetivo = snapshot.objetivo;
  const posicion = snapshot.posicion;
  const deporteKey = (deporte || snapshot.deporte || 'Fútbol').toLowerCase();
  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  if (pm?.rutinaSemanal?.semana?.length) {
    const semana = pm.rutinaSemanal.semana;
    const mensaje = semana.map(dia => {
      const titulo = dia?.tipo || 'Entrenamiento';
      const ejercicios = (dia?.ejercicios || []).slice(0, 4).map((e, i) => `${i + 1}. ${e?.nombre || 'Ejercicio'}`).join('; ');
      return `• ${dia?.dia || 'Día'}: ${titulo}${ejercicios ? ` — ${ejercicios}` : ''}`;
    }).join('\n');

    return {
      respuesta: `Rutina semanal personalizada para ${user?.nombre || 'este atleta'}\nPerfil: ${snapshot.deporte} · ${snapshot.posicion} · objetivo: ${objetivo}\nEstado actual: fatiga ${fatiga}/10, recuperación ${recuperacion}/10, sueño ${snapshot.actual.sueno ?? 6}/10.\n\n${mensaje}\n\nEsto es un plan individual, no una rutina estándar para todos.`,
      tipo: fatiga >= 7 || recuperacion <= 3 ? 'warning' : 'success',
      icono: '🏋️'
    };
  }

  const isLowLoad = fatiga >= 8 || recuperacion <= 3;
  const carga = isLowLoad ? 'carga reducida' : 'carga progresiva';

  const baseMap = {
    'ganar masa muscular': {
      Lunes: 'Fuerza máxima + hipertrofia — 4-5 ejercicios compuestos, 3-4 series, 6-8 repeticiones, pausas controladas.',
      Martes: 'Velocidad y técnica — sprints cortos, aceleraciones y trabajo específico del deporte con baja fatiga.',
      Miércoles: 'Recuperación activa — 30-40 min de movilidad, caminata suave y estiramientos.',
      Jueves: 'Fuerza de potencia — sentadillas, press, peso muerto y trabajo explosivo.',
      Viernes: 'Técnica + resistencia — cambios de ritmo, conducción, pase y trabajo aeróbico moderado.',
      Sábado: 'Volumen moderado — circuito de fuerza complementario y trabajo específico por posición.',
      Domingo: 'Descanso o carga muy ligera — movilidad y recuperación respiratoria.'
    },
    'perder grasa': {
      Lunes: 'Cardio de intensidad moderada + fuerza general — circuito con alta demanda metabólica.',
      Martes: 'Técnica + intervalos — trabajo de velocidad con pausas y desplazamientos específicos.',
      Miércoles: 'Recuperación activa — movilidad, caminata y sesiones de baja carga.',
      Jueves: 'Fuerza con baja fatiga — ejercicios compuestos y alta repetición controlada.',
      Viernes: 'Técnica-táctica + intensidad baja-media — mantener calidad sin sobrecargar.',
      Sábado: 'Cardio intervalado + fuerza complementaria.',
      Domingo: 'Descanso total o recuperación activa de 20-30 min.'
    },
    'rendimiento deportivo': {
      Lunes: 'Potencia + fuerza — saltos, fuerza explosiva y aceleración.',
      Martes: 'Técnica y patrones de juego — velocidad, reacción y precisión técnica.',
      Miércoles: 'Recuperación o movilidad — trabajo de activación y descanso activo.',
      Jueves: 'Resistencia específica — intervalos de alta intensidad con pausas.',
      Viernes: 'Táctica + velocidad — simulación de situaciones del deporte.',
      Sábado: 'Entrenamiento principal o partido — intensidad controlada.',
      Domingo: 'Descanso completo y recuperación.'
    },
    default: {
      Lunes: 'Fuerza general + trabajo explosivo — intensidad media-alta y técnica de movimiento.',
      Martes: 'Técnica y velocidad — trabajo de desplazamiento y precisión.',
      Miércoles: 'Recuperación activa — movilidad, estiramientos, caminata y trabajo respiratorio.',
      Jueves: 'Fuerza complementaria — circuitos y control de progresión.',
      Viernes: 'Táctica y resistencia — intensidad media con foco en ejecución.',
      Sábado: 'Entrenamiento específico del deporte o simulación.',
      Domingo: 'Descanso total o recuperación activa ligera.'
    }
  };

  const sportSpecific = {
    futbol: 'Si juegas fútbol, prioriza aceleraciones, cambios de dirección, fuerza de piernas y resistencia repetitiva.',
    baloncesto: 'Si juegas baloncesto, prioriza saltos, explosividad, desplazamientos laterales y trabajo de corte y rebote.',
    tenis: 'Si juegas tenis, prioriza fuerza de piernas, velocidad, coordinación y resistencia de intervalos cortos.',
    natacion: 'Si nadas, prioriza fuerza de espalda y tronco, resistencia aeróbica y trabajo de técnica en el agua.',
    default: 'El plan prioriza fuerza, velocidad, técnica y recuperación según tu nivel actual.'
  };

  const positionSpecific = {
    portero: 'Como portero, mantén más trabajo de reacción, explosividad, estabilidad y técnica con menos volumen de carga general.',
    delantero: 'Como delantero, enfatiza velocidad, aceleración, fuerza explosiva y trabajo de finalización.',
    mediocampista: 'Como mediocampista, equilibras resistencia, fuerza, técnica y cambios de ritmo.',
    defensa: 'Como defensa, prioriza potencia, fuerza de piernas, duelos y estabilidad.',
    extremo: 'Como extremo, prioriza aceleraciones, cambios de dirección, potencia y resistencia repetitiva.',
    default: 'La sesión se adapta a tu perfil general y al objetivo del plan.'
  };

  const plan = dias.map((dia, index) => {
    let detalle = baseMap[objetivo]?.[dia] || baseMap.default[dia];
    if (isLowLoad) {
      detalle = `${detalle} Como hoy hay ${carga}, reduce la intensidad un 30-40%, evita máximos y prioriza técnica y movilidad.`;
    }
    return `• ${dia}: ${detalle}`;
  });

  let respuesta = `Rutina semanal personalizada para ${user?.nombre || 'este atleta'}\n`;
  respuesta += `Perfil: ${snapshot.deporte} · ${snapshot.posicion} · objetivo: ${objetivo}\n`;
  respuesta += `Estado actual: fatiga ${fatiga}/10, recuperación ${recuperacion}/10, sueño ${snapshot.actual.sueno ?? 6}/10.\n`;
  respuesta += `${plan.join('\n')}\n`;
  respuesta += `${sportSpecific[deporteKey] || sportSpecific.default}\n`;
  respuesta += `${positionSpecific[posicion?.toLowerCase()] || positionSpecific.default}\n`;
  respuesta += `\n¿Por qué este plan le sirve a esta persona?: porque está ajustado a su objetivo, a su deporte, a su posición y a su estado real de fatiga y recuperación, no a una rutina estándar para todos.`;

  return { respuesta, tipo: isLowLoad ? 'warning' : 'success', icono: '🏋️' };
}

function planAlimentacionPersonalizada({ user, pm, comidas, salud, deporte }) {
  const snapshot = getUserSnapshot(user, salud, pm);
  const comidasSem = getSemana(comidas || []);
  const calProm = comidasSem.length ? Math.round(comidasSem.reduce((a, c) => a + Number(c.calorias || 0), 0) / 7) : 2400;
  const objetivo = snapshot.objetivo;
  const conds = snapshot.condiciones;

  if (pm?.planAlimenticio?.semana?.length) {
    const dias = pm.planAlimenticio.semana;
    const bloque = dias.map(dia => {
      const slots = ['desayuno', 'meriendaMañana', 'almuerzo', 'meriendaTarde', 'cena'];
      const comidas = slots.map(slot => {
        const item = dia[slot];
        return item ? `${slot === 'almuerzo' ? 'Almuerzo' : slot === 'cena' ? 'Cena' : slot === 'desayuno' ? 'Desayuno' : slot === 'meriendaMañana' ? 'Merienda mañana' : 'Merienda tarde'}: ${item.nombre || item.desc || 'Comida'} (${item.kcal || 0} kcal)` : null;
      }).filter(Boolean).join(' · ');
      return `• ${dia.dia}: ${comidas}`;
    }).join('\n');

    return {
      respuesta: `Plan nutricional semanal personalizado para ${user?.nombre || 'este atleta'}\nPerfil: ${deporte} · objetivo ${objetivo} · IMC ${snapshot.imc.toFixed(1)}\n\n${bloque}\n\nSe respeta tu preferencia alimentaria y tus condiciones médicas.`,
      tipo: 'info',
      icono: '🥗'
    };
  }

  let kcal = 2600;
  if (objetivo === 'ganar masa muscular') kcal = 2900;
  if (objetivo === 'perder grasa') kcal = 2200;
  if (objetivo === 'rendimiento deportivo') kcal = 2800;
  if (snapshot.imc > 27) kcal = Math.max(2100, kcal - 200);

  let carbo = Math.round(kcal * 0.5 / 4);
  let proteina = Math.round((snapshot.peso || 70) * 1.8);
  let grasa = Math.round(kcal * 0.25 / 9);

  if (objetivo === 'ganar masa muscular') {
    carbo = Math.round(kcal * 0.55 / 4);
    proteina = Math.round((snapshot.peso || 70) * 2.1);
  }
  if (objetivo === 'perder grasa') {
    carbo = Math.round(kcal * 0.4 / 4);
    proteina = Math.round((snapshot.peso || 70) * 2.2);
  }

  const pref = (pm?.preferencias || '').toLowerCase();
  const esVegetariano = pref.includes('vegetariano');
  const esVegano = pref.includes('vegano');
  const baseAlmuerzo = esVegano ? 'tofu, legumbres, quinoa, verduras y arroz integral' : esVegetariano ? 'tofu, legumbres, quinoa, huevos si lo toleras y verduras' : 'pollo, pescado, tofu, quinoa, arroz integral y verduras';

  let respuesta = `Plan nutricional personalizado para ${user?.nombre || 'este atleta'}\n`;
  respuesta += `Perfil: ${deporte} · objetivo ${objetivo} · IMC ${snapshot.imc.toFixed(1)} · consumo actual promedio ${calProm} kcal/día\n`;
  respuesta += `Meta calórica sugerida: ${kcal} kcal/día · Carbohidratos: ${carbo} g · Proteínas: ${proteina} g · Grasas: ${grasa} g\n\n`;
  respuesta += `• Desayuno: avena, yogur o alternativas vegetales, fruta y semillas, sin violar tu preferencia.\n`;
  respuesta += `• Almuerzo: ${baseAlmuerzo}.\n`;
  respuesta += `• Snack: fruta, yogurt natural o batido de proteína según la hora y el nivel de carga del día.\n`;
  respuesta += `• Cena: proteína magra + verdura + carbohidrato moderado o baja según el entrenamiento del siguiente día.\n`;
  respuesta += `• Hidratación: 2 a 3 litros de agua al día y electrolitos si hay entrenamiento intenso o sudoración elevada.\n`;
  if (conds.includes('diabetes')) respuesta += `• Ajuste: controla los carbohidratos simples y prioriza hidratos complejos para mantener mejor estabilidad glucémica.\n`;
  if (conds.includes('hipertensión') || conds.includes('asma')) respuesta += `• Ajuste: baja el exceso de sal, alimentos ultraprocesados y prioriza opciones más estables para rendimiento y recuperación.\n`;
  if (snapshot.alergias.length) respuesta += `• Alergias registradas: ${snapshot.alergias.join(', ')} — evita esos ingredientes y reemplázalos por opciones equivalentes.\n`;
  respuesta += `\n¿Por qué este plan le sirve a esta persona?: porque está calculado sobre su objetivo, composición corporal, actividad y condiciones, y no como una dieta que sirve para todo el mundo.`;

  return { respuesta, tipo: 'info', icono: '🥗' };
}

function planPersonalizado({ user, profile, pm, salud, comidas, rutinas, alertas, deporte }) {
  const snapshot = getUserSnapshot(user || profile || {}, salud, pm);
  const objetivo = snapshot.objetivo;
  const fatiga = snapshot.actual.fatiga ?? 5;
  const recuperacion = snapshot.actual.recuperacion ?? 5;

  const planSemanal = pm?.rutinaSemanal?.semana?.length ? pm.rutinaSemanal.semana : null;
  const planComida = pm?.planAlimenticio?.semana?.length ? pm.planAlimenticio.semana : null;

  let respuesta = `Plan completo personalizado para ${user?.nombre || profile?.nombre || 'este atleta'}\n`;
  respuesta += `Perfil: ${snapshot.deporte} · ${snapshot.posicion} · objetivo: ${objetivo} · IMC ${snapshot.imc.toFixed(1)}\n`;
  respuesta += `Estado actual: fatiga ${fatiga}/10, recuperación ${recuperacion}/10, sueño ${snapshot.actual.sueno ?? 6}/10.\n\n`;

  if (planSemanal) {
    respuesta += 'ENTRENAMIENTO SEMANAL\n';
    planSemanal.forEach(dia => {
      const titulo = dia?.tipo || 'Entrenamiento';
      const ejercicios = (dia?.ejercicios || []).slice(0, 4).map((e, i) => `${i + 1}. ${e?.nombre || 'Ejercicio'}`).join(' · ');
      respuesta += `• ${dia?.dia || 'Día'}: ${titulo}${ejercicios ? ` — ${ejercicios}` : ''}\n`;
    });
  } else {
    const entrenamiento = planEntrenamientoPersonalizado({ user: user || profile || {}, pm, salud, rutinas, deporte }).respuesta;
    respuesta += `ENTRENAMIENTO\n${entrenamiento.split('\n').slice(1, 10).join('\n')}\n\n`;
  }

  if (planComida) {
    respuesta += '\nNUTRICIÓN SEMANAL\n';
    planComida.forEach(dia => {
      const slots = ['desayuno', 'meriendaMañana', 'almuerzo', 'meriendaTarde', 'cena'];
      const comidas = slots.map(slot => {
        const item = dia[slot];
        if (!item) return null;
        const nombre = item.nombre || 'Comida';
        const kcal = item.kcal ? ` (${item.kcal} kcal)` : '';
        return `${nombre}${kcal}`;
      }).filter(Boolean).join(' · ');
      respuesta += `• ${dia.dia}: ${comidas}\n`;
    });
  } else {
    const nutricion = planAlimentacionPersonalizada({ user: user || profile || {}, pm, comidas, salud, deporte }).respuesta;
    respuesta += `\nNUTRICIÓN\n${nutricion.split('\n').slice(1, 10).join('\n')}\n\n`;
  }

  respuesta += `\nRecomendación final: este plan es individual porque toma en cuenta tu deporte, objetivo, historial, recuperación, condiciones y preferencias; por eso no puede ser igual para otra persona con una meta o situación distinta.`;

  return { respuesta, tipo: fatiga >= 7 || recuperacion <= 3 ? 'warning' : 'success', icono: '🤖' };
}

module.exports = { consulta };