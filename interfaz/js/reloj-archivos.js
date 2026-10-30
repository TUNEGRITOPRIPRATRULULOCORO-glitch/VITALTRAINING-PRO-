/**
 * Lectura de archivos del reloj (.tcx y .gpx). Se usa en el navegador y en los tests.
 * Garmin, Polar, Coros, Suunto, Wahoo, Amazfit, Strava y Apple Watch (con apps como HealthFit)
 * exportan las sesiones en estos formatos.
 *
 * Devuelve el resumen de la sesión y la curva de pulso: un valor cada `intervaloSeg` segundos
 * (0 donde el reloj no midió). El servidor calcula con eso las zonas, el esfuerzo y la carga.
 */
(function (global) {
  const HUECO_MAX_SEG = 30;      // si el reloj deja de medir más que esto (pausa), no se inventa pulso
  const MUESTRAS_MAX = 4000;     // así el envío es pequeño aunque la sesión dure horas

  const DEPORTES = [
    [/run|carrera|correr|trail/i, 'Carrera'],
    [/bik|cycl|ciclismo|bici/i, 'Ciclismo'],
    [/swim|nata/i, 'Natación'],
    [/walk|camin|hik|senderismo/i, 'Caminata'],
    [/soccer|football|f[uú]tbol/i, 'Fútbol'],
  ];

  function nombreDeporte(deporte) {
    const d = DEPORTES.find(([re]) => re.test(String(deporte || '')));
    return d ? d[1] : 'Entrenamiento';
  }

  /** Contenido de <nombre> (con o sin prefijo como ns3:), o null. */
  function etiqueta(bloque, nombre) {
    const m = new RegExp(`<(?:\\w+:)?${nombre}>\\s*([^<]+?)\\s*</(?:\\w+:)?${nombre}>`, 'i').exec(bloque);
    return m ? m[1] : null;
  }

  /** Distancia en metros entre dos puntos GPS. */
  function distancia(a, b) {
    const rad = g => (g * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
  }

  /** puntos [{ t (ms), hr }] → pulso cada intervaloSeg desde inicioMs hasta finMs. */
  function remuestrear(puntos, inicioMs, finMs, intervaloSeg) {
    const conPulso = puntos.filter(p => p.hr > 0).sort((a, b) => a.t - b.t);
    const salida = [];
    let j = 0;
    for (let t = inicioMs; t <= finMs; t += intervaloSeg * 1000) {
      while (j + 1 < conPulso.length && conPulso[j + 1].t <= t) j++;
      const p = conPulso[j];
      salida.push(p && p.t <= t && t - p.t <= HUECO_MAX_SEG * 1000 ? p.hr : 0);
    }
    return salida;
  }

  function armar(puntos, { deporte = '', tiempoSeg = 0, distanciaM = 0, calorias = 0 } = {}) {
    if (puntos.length < 2) throw new Error('El archivo no trae los puntos de la sesión.');
    puntos.sort((a, b) => a.t - b.t);
    const inicioMs = puntos[0].t;
    const finMs = puntos[puntos.length - 1].t;
    const totalSeg = Math.round((finMs - inicioMs) / 1000);
    const intervaloSeg = Math.max(5, Math.ceil(totalSeg / MUESTRAS_MAX));
    const pulsos = remuestrear(puntos, inicioMs, finMs, intervaloSeg);
    return {
      inicio: new Date(inicioMs).toISOString(),
      // El tiempo en movimiento que calculó el reloj (sin pausas); si no lo trae, de principio a fin
      duracionSeg: tiempoSeg > 0 ? Math.round(tiempoSeg) : totalSeg,
      distanciaM: distanciaM > 0 ? Math.round(distanciaM) : null,
      calorias: calorias > 0 ? Math.round(calorias) : null,
      deporte: nombreDeporte(deporte),
      intervaloSeg,
      pulsos: pulsos.some(Boolean) ? pulsos : [],
    };
  }

  function leerTCX(texto) {
    const deporte = (/<Activity[^>]*Sport="([^"]+)"/i.exec(texto) || [])[1] || '';
    const puntos = [];
    for (const pieza of texto.split(/<Trackpoint>/i).slice(1)) {
      const tp = pieza.split(/<\/Trackpoint>/i)[0];
      const t = Date.parse(etiqueta(tp, 'Time'));
      if (Number.isNaN(t)) continue;
      const hr = /<HeartRateBpm[^>]*>\s*<Value>\s*(\d+)/i.exec(tp);
      puntos.push({ t, hr: hr ? Number(hr[1]) : 0 });
    }
    // Totales de cada vuelta, ya calculados por el reloj
    let tiempoSeg = 0, distanciaM = 0, calorias = 0;
    for (const vuelta of texto.split(/<Lap\b/i).slice(1)) {
      const cabecera = vuelta.split(/<Track>/i)[0];
      tiempoSeg += Number(etiqueta(cabecera, 'TotalTimeSeconds')) || 0;
      distanciaM += Number(etiqueta(cabecera, 'DistanceMeters')) || 0;
      calorias += Number(etiqueta(cabecera, 'Calories')) || 0;
    }
    return armar(puntos, { deporte, tiempoSeg, distanciaM, calorias });
  }

  function leerGPX(texto) {
    const deporte = etiqueta(texto, 'type') || etiqueta(texto, 'name') || '';
    const puntos = [];
    let distanciaM = 0, anterior = null;
    for (const pieza of texto.split(/<trkpt\b/i).slice(1)) {
      const p = pieza.split(/<\/trkpt>/i)[0];
      const t = Date.parse(etiqueta(p, 'time'));
      if (Number.isNaN(t)) continue;
      const lat = Number((/lat="([-\d.]+)"/i.exec(p) || [])[1]);
      const lon = Number((/lon="([-\d.]+)"/i.exec(p) || [])[1]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        if (anterior) distanciaM += distancia(anterior, { lat, lon });
        anterior = { lat, lon };
      }
      // Cada app escribe el pulso a su manera: <gpxtpx:hr>, <ns3:hr>, <heartrate>, <heart_rate>, <HeartRateBpm><Value>, hr="…"
      const hr = etiqueta(p, 'hr') ?? etiqueta(p, 'heartrate') ?? etiqueta(p, 'heart_rate') ?? etiqueta(p, 'heartRate')
        ?? (/<(?:\w+:)?HeartRateBpm[^>]*>\s*<(?:\w+:)?Value>\s*(\d+)/i.exec(p) || /\b(?:hr|heartrate)="(\d+)"/i.exec(p) || [])[1] ?? null;
      puntos.push({ t, hr: hr == null ? 0 : Number(hr) });
    }
    return armar(puntos, { deporte, distanciaM });
  }

  function leerArchivo(nombre, texto) {
    const n = String(nombre || '').toLowerCase();
    if (n.endsWith('.fit')) {
      throw new Error('Los archivos .fit todavía no se pueden leer: exporta la sesión como TCX o GPX.');
    }
    if (n.endsWith('.tcx') || /<TrainingCenterDatabase/i.test(texto)) return leerTCX(texto);
    if (n.endsWith('.gpx') || /<gpx[\s>]/i.test(texto)) return leerGPX(texto);
    throw new Error('Formato no reconocido: usa un archivo .tcx o .gpx exportado del reloj.');
  }

  /** Fecha 'YYYY-MM-DD' en la hora local del dispositivo (una sesión de noche no pasa al día siguiente). */
  function fechaLocal(iso) {
    const d = new Date(iso);
    const pad = x => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  const api = { leerArchivo, leerTCX, leerGPX, remuestrear, nombreDeporte, fechaLocal };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.RelojArchivos = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
