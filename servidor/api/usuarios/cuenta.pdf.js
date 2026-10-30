/**
 * "Mis datos" en PDF: los mismos datos que la exportación JSON (cuenta.service.exportar),
 * presentados para leerlos: portada, ficha y una tabla por sección.
 * Fuente Helvetica de PDFKit: admite tildes y eñes; no se usan emojis.
 */
const PDFDocument = require('pdfkit');

const VERDE = '#16a34a';
const GRIS = '#64748b';
const BORDE = '#e2e8f0';
const MARGEN = 48;

const fecha = v => {
  if (!v) return '';
  const s = v instanceof Date ? v.toISOString() : String(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};
const fechaHora = v => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fecha(v) : `${fecha(d.toISOString())} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const lista = v => (Array.isArray(v) ? v : (() => { try { return JSON.parse(v || '[]'); } catch { return []; } })());
// La fuente del PDF (Helvetica, codificación WinAnsi) no tiene emojis ni símbolos raros:
// se quitan (o se cambian por uno parecido) para que no salgan caracteres basura
const WINANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const PARECIDOS = { '≈': '~', '→': '->', '←': '<-', '✓': 'OK', '✔': 'OK', '−': '-', '≤': '<=', '≥': '>=' };
function legible(v) {
  return Array.from(String(v), ch => PARECIDOS[ch] ?? (ch.codePointAt(0) <= 0xff || WINANSI_EXTRA.includes(ch) ? ch : ''))
    .join('').replace(/\s{2,}/g, ' ').trim();
}
const texto = v => (v == null || v === '' ? '' : legible(v));
const RESTRICCION = { no_apto: 'Baja médica', adaptado: 'En recuperación' };
const RANGOS = ['Bronce', 'Plata', 'Oro', 'Platino', 'Esmeralda', 'Rubí', 'Diamante'];
const rango = paso => (paso >= 21 ? 'Radiante' : `${RANGOS[Math.floor(paso / 3)]} ${['I', 'II', 'III'][paso % 3]}`);

/** Secciones con tabla: título, columnas [{ titulo, ancho (proporción), valor(fila) }]. */
const TABLAS = [
  { clave: 'salud', titulo: 'Registro diario de salud', columnas: [
    ['Fecha', 1.1, r => fecha(r.fecha)], ['Fatiga', 0.7, r => `${r.fatiga}/10`], ['Sueño', 0.7, r => `${r.sueno}/10`],
    ['Recuperación', 1, r => `${r.recuperacion}/10`], ['Notas', 3, r => texto(r.notas)]] },
  { clave: 'comidas', titulo: 'Comidas apuntadas', columnas: [
    ['Fecha', 1.1, r => fecha(r.fecha)], ['Tipo', 1, r => texto(r.tipo)], ['Comida', 2.6, r => texto(r.nombre)],
    ['kcal', 0.7, r => texto(r.calorias)], ['Registró', 1.3, r => texto(r.registrado_por) || 'Tú']] },
  { clave: 'entrenamientos', titulo: 'Entrenamientos apuntados', columnas: [
    ['Fecha', 1.1, r => fecha(r.fecha)], ['Entrenamiento', 2.2, r => texto(r.nombre)], ['Tipo', 1.1, r => texto(r.tipo)],
    ['Minutos', 0.8, r => texto(r.duracion_minutos)], ['Intensidad', 1, r => texto(r.intensidad)], ['Esfuerzo', 0.8, r => texto(r.rpe)]] },
  { clave: 'sesionesConReloj', titulo: 'Sesiones con reloj o pulsómetro', columnas: [
    ['Fecha', 1.1, r => fecha(r.inicio)], ['Origen', 1, r => (r.origen === 'bluetooth' ? 'Pulsómetro' : 'Reloj')],
    ['Distancia', 0.9, r => (r.distancia_m ? `${(r.distancia_m / 1000).toFixed(1)} km` : '')],
    ['Pulso medio', 1, r => texto(r.fc_media)], ['Pulso máx.', 0.9, r => texto(r.fc_max)], ['TRIMP', 0.7, r => texto(r.trimp)]] },
  { clave: 'sesionesDelPlan', titulo: 'Sesiones del plan', columnas: [
    ['Fecha', 1.1, r => fecha(r.fecha)], ['Día', 1, r => texto(r.dia_semana)], ['Sesión', 2, r => texto(r.tipo)],
    ['Estado', 1, r => texto(r.estado)], ['Minutos', 0.8, r => texto(r.duracion_minutos)], ['Esfuerzo', 0.8, r => texto(r.rpe)]] },
  { clave: 'series', titulo: 'Series de fuerza', columnas: [
    ['Fecha', 1.1, r => fecha(r.fecha)], ['Ejercicio', 3, r => texto(r.ejercicio)], ['Peso', 0.9, r => (r.peso ? `${r.peso} kg` : 'Sin peso')], ['Repeticiones', 1.1, r => texto(r.repeticiones)]] },
  { clave: 'testsFisicos', titulo: 'Tests físicos', columnas: [
    ['Fecha', 1.1, r => fecha(r.fecha)], ['Prueba', 1.6, r => texto(r.prueba)], ['Resultado', 1, r => texto(r.valor)],
    ['Registró', 1.4, r => texto(r.registrado_por) || 'Tú'], ['Notas', 2, r => texto(r.notas)]] },
  { clave: 'rangos', titulo: 'Rangos alcanzados', columnas: [
    ['Marca', 3, r => texto(r.clave).replace(/^(fuerza|test):/, '')], ['Rango', 1.4, r => rango(Number(r.paso))], ['Desde', 1.1, r => fecha(r.fecha)]] },
  { clave: 'logros', titulo: 'Logros conseguidos', columnas: [
    ['Logro', 3, r => texto(r.clave)], ['Fecha', 1.2, r => fecha(r.fecha)]] },
  { clave: 'lesiones', titulo: 'Lesiones', columnas: [
    ['Inicio', 1, r => fecha(r.fecha_inicio)], ['Zona y tipo', 2, r => `${texto(r.zona)} · ${texto(r.tipo)} · ${texto(r.gravedad)}`],
    ['Estado', 1.1, r => (r.fecha_alta ? `Alta ${fecha(r.fecha_alta)}` : RESTRICCION[r.restriccion] || texto(r.restriccion))], ['Indicaciones', 2.6, r => texto(r.indicaciones)]] },
  { clave: 'notasDelMedico', titulo: 'Notas de tu médico', columnas: [
    ['Fecha', 1.1, r => fecha(r.created_at)], ['Médico', 1.3, r => texto(r.autor_nombre)], ['Nota', 4.5, r => texto(r.texto)]] },
  { clave: 'notasDelNutricionista', titulo: 'Notas de tu nutricionista', columnas: [
    ['Fecha', 1.1, r => texto(r.fecha)], ['Nutricionista', 1.4, r => texto(r.nutricionista_nombre)], ['Nota', 4.4, r => texto(r.texto)]] },
  { clave: 'alertas', titulo: 'Alertas y avisos', columnas: [
    ['Fecha', 1.1, r => texto(r.fecha)], ['Tipo', 1.1, r => texto(r.tipo)], ['Mensaje', 4.7, r => texto(r.mensaje)]] },
  { clave: 'equipos', titulo: 'Equipos', columnas: [
    ['Equipo', 3, r => texto(r.nombre)], ['Deporte', 2, r => texto(r.deporte) || 'Varios']] },
  { clave: 'mensajes', titulo: 'Mensajes', columnas: [
    ['Fecha', 1.3, r => fechaHora(r.created_at)], ['De', 1.3, r => texto(r.de)], ['Para', 1.3, r => texto(r.para)], ['Mensaje', 3.1, r => texto(r.texto)]] },
  { clave: 'conversacionConVita', titulo: 'Conversación con Vita', columnas: [
    ['Fecha', 1.3, r => fechaHora(r.created_at)], ['Quién', 0.9, r => (r.rol === 'atleta' ? 'Tú' : 'Vita')], ['Mensaje', 4.8, r => texto(r.texto)]] },
  { clave: 'tickets', titulo: 'Tickets de soporte', columnas: [
    ['Fecha', 1.1, r => texto(r.fecha)], ['Asunto', 2.2, r => texto(r.titulo)], ['Categoría', 1.2, r => texto(r.categoria)], ['Estado', 1, r => texto(r.estado)], ['Detalle', 2.4, r => texto(r.descripcion)]] },
];

function titulo(doc, t) {
  if (doc.y > doc.page.height - 140) doc.addPage();
  doc.moveDown(0.8).font('Helvetica-Bold').fontSize(14).fillColor(VERDE).text(t, MARGEN);
  doc.moveTo(MARGEN, doc.y + 2).lineTo(doc.page.width - MARGEN, doc.y + 2).strokeColor(VERDE).lineWidth(1).stroke();
  doc.moveDown(0.5).fillColor('#0f172a');
}

function campos(doc, pares) {
  for (const [k, v] of pares) {
    if (v == null || v === '') continue;
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(`${k}: `, MARGEN, doc.y, { continued: true })
      .font('Helvetica').text(legible(v));
  }
}

/** Tabla con cabecera que se repite en cada página y filas que crecen con el texto. */
function tabla(doc, columnas, filas) {
  const ancho = doc.page.width - MARGEN * 2;
  const total = columnas.reduce((t, c) => t + c[1], 0);
  const anchos = columnas.map(c => (c[1] / total) * ancho);
  const PAD = 4;
  const alto = (valores, negrita) => {
    doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);
    return Math.max(...valores.map((v, i) => doc.heightOfString(v || ' ', { width: anchos[i] - PAD * 2 }))) + PAD * 2;
  };
  const fila = (valores, { negrita = false, fondo = null } = {}) => {
    const h = alto(valores, negrita);
    if (doc.y + h > doc.page.height - MARGEN) { doc.addPage(); if (!negrita) fila(columnas.map(c => c[0]), { negrita: true, fondo: '#f0fdf4' }); }
    const y = doc.y;
    if (fondo) doc.rect(MARGEN, y, ancho, h).fill(fondo);
    let x = MARGEN;
    valores.forEach((v, i) => {
      doc.fillColor(negrita ? '#14532d' : '#0f172a').font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
        .text(v || '', x + PAD, y + PAD, { width: anchos[i] - PAD * 2 });
      x += anchos[i];
    });
    doc.moveTo(MARGEN, y + h).lineTo(MARGEN + ancho, y + h).strokeColor(BORDE).lineWidth(0.5).stroke();
    doc.x = MARGEN;
    doc.y = y + h;
  };
  fila(columnas.map(c => c[0]), { negrita: true, fondo: '#f0fdf4' });
  filas.forEach((r, i) => fila(columnas.map(c => c[2](r)), { fondo: i % 2 ? '#f8fafc' : null }));
}

/** @returns {Promise<Buffer>} el PDF con todos los datos */
function generarPdf(datos) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGEN, bufferPages: true, info: { Title: 'Mis datos en VitalTraining', Author: 'VitalTraining' } });
    const partes = [];
    doc.on('data', p => partes.push(p));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    const c = datos.cuenta || {};
    // Portada
    doc.rect(0, 0, doc.page.width, 120).fill('#0f1f14');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(24).text('VitalTraining', MARGEN, 40);
    doc.font('Helvetica').fontSize(12).fillColor('#a3c9b0').text('Mis datos', MARGEN, 72);
    doc.fillColor(GRIS).fontSize(9).text(`Generado el ${fechaHora(datos.generado)}. Incluye todo lo que la app guarda de ti, salvo tu contraseña (cifrada) y las notas privadas de tu médico.`, MARGEN, 140);

    titulo(doc, 'Cuenta');
    campos(doc, [['Nombre', c.nombre], ['Correo', c.email], ['Rol', c.rol], ['Estado', c.estado], ['Deporte', c.deporte_principal],
      ['Posición', c.posicion], ['Objetivo', c.objetivo], ['Fecha de nacimiento', fecha(c.fecha_nacimiento)], ['Registro', c.fecha_registro]]);

    const p = datos.perfil;
    if (p) {
      titulo(doc, 'Perfil');
      campos(doc, [['Nombre', p.nombre], ['Edad', p.edad], ['Peso', p.peso && `${p.peso} kg`], ['Altura', p.altura && `${p.altura} cm`],
        ['Sexo', p.sexo], ['Posición', p.posicion], ['Día de partido', p.dia_partido]]);
    }

    const pm = datos.perfilMedico;
    if (pm) {
      titulo(doc, 'Perfil médico y plan');
      campos(doc, [['Condiciones', lista(pm.condiciones).join(', ') || 'Ninguna'], ['Alergias', lista(pm.alergias).join(', ') || 'Ninguna'], ['Alimentación', pm.preferencias]]);
      const obj = pm.plan_alimenticio?.objetivos;
      if (obj?.entreno) campos(doc, [['Objetivo día de entreno', `${obj.entreno.kcal} kcal · proteína ${obj.entreno.proteina} g · carbohidratos ${obj.entreno.carbs} g · grasa ${obj.entreno.grasa} g`],
        ['Objetivo día de descanso', `${obj.descanso.kcal} kcal · proteína ${obj.descanso.proteina} g · carbohidratos ${obj.descanso.carbs} g · grasa ${obj.descanso.grasa} g`]]);
      const semana = pm.rutina_semanal?.semana || [];
      if (semana.length) {
        doc.moveDown(0.4);
        tabla(doc, [['Día', 1, d => d.dia], ['Sesión', 1.6, d => texto(d.tipo)], ['Ejercicios', 4.4, d => (d.ejercicios || []).map(e => e.nombre).join(', ') || 'Descanso']], semana);
      }
    }

    for (const t of TABLAS) {
      const filas = datos[t.clave] || [];
      titulo(doc, `${t.titulo} (${filas.length})`);
      if (!filas.length) doc.font('Helvetica').fontSize(9).fillColor(GRIS).text('Sin datos.', MARGEN);
      else tabla(doc, t.columnas, filas);
    }

    // Número de página en cada hoja
    const rango = doc.bufferedPageRange();
    for (let i = rango.start; i < rango.start + rango.count; i++) {
      doc.switchToPage(i);
      const abajo = doc.page.margins.bottom;
      doc.page.margins.bottom = 0; // el pie va dentro del margen: sin esto PDFKit abriría otra página
      doc.font('Helvetica').fontSize(8).fillColor(GRIS)
        .text(`VitalTraining · Mis datos · página ${i + 1} de ${rango.count}`, MARGEN, doc.page.height - 30, { width: doc.page.width - MARGEN * 2, align: 'center', lineBreak: false });
      doc.page.margins.bottom = abajo;
    }
    doc.end();
  });
}

module.exports = { generarPdf };
