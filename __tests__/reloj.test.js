// Reloj y pulsómetro: lectura de archivos .tcx/.gpx, zonas y carga, y guardado con pg-mem.
const archivos = require('../interfaz/js/reloj-archivos');
const calc = require('../servidor/api/reloj/reloj.calculos');

const hace = dias => new Date(Date.now() - dias * 86400000);

/** TCX de prueba: una vuelta de 20 min con un punto cada 10 s y el pulso subiendo de 100 a 180. */
function tcx(inicio = hace(1)) {
  const puntos = Array.from({ length: 121 }, (_, i) => `
        <Trackpoint><Time>${new Date(inicio.getTime() + i * 10000).toISOString()}</Time>
          <DistanceMeters>${i * 30}</DistanceMeters>
          <HeartRateBpm><Value>${Math.round(100 + (80 * i) / 120)}</Value></HeartRateBpm></Trackpoint>`).join('');
  return `<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity Sport="Running">
    <Lap StartTime="${inicio.toISOString()}"><TotalTimeSeconds>1150</TotalTimeSeconds><DistanceMeters>3600</DistanceMeters>
      <Calories>260</Calories><AverageHeartRateBpm><Value>140</Value></AverageHeartRateBpm>
      <Track>${puntos}</Track></Lap></Activity></Activities></TrainingCenterDatabase>`;
}

function gpx() {
  const inicio = hace(2);
  const puntos = Array.from({ length: 61 }, (_, i) => `
    <trkpt lat="${(4.6 + i * 0.0001).toFixed(4)}" lon="-74.0800"><time>${new Date(inicio.getTime() + i * 5000).toISOString()}</time>
      <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${i < 30 ? 120 : 150}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>`).join('');
  return `<gpx version="1.1"><trk><name>Morning Ride</name><type>cycling</type><trkseg>${puntos}</trkseg></trk></gpx>`;
}

describe('lectura de archivos del reloj', () => {
  test('TCX: usa los totales del reloj y la curva de pulso cada 5 s', () => {
    const s = archivos.leerArchivo('carrera.tcx', tcx());
    expect(s).toMatchObject({ duracionSeg: 1150, distanciaM: 3600, calorias: 260, deporte: 'Carrera', intervaloSeg: 5 });
    expect(s.pulsos).toHaveLength(241);
    expect(s.pulsos[0]).toBe(100);
    expect(s.pulsos.at(-1)).toBe(180);
  });

  test('GPX: distancia por GPS, pulso de la extensión y deporte por el tipo', () => {
    const s = archivos.leerArchivo('salida.gpx', gpx());
    expect(s.deporte).toBe('Ciclismo');
    expect(s.duracionSeg).toBe(300);
    expect(s.distanciaM).toBeGreaterThan(650);
    expect(s.distanciaM).toBeLessThan(680);           // 60 tramos de ~11 m
    expect(s.pulsos.filter(b => b === 150)).toHaveLength(31);
  });

  test('pausas sin pulso, archivos .fit y formatos desconocidos', () => {
    const p = archivos.remuestrear([{ t: 0, hr: 120 }, { t: 100000, hr: 130 }], 0, 100000, 10);
    expect(p).toEqual([120, 120, 120, 120, 0, 0, 0, 0, 0, 0, 130]); // tras 30 s sin medir no se inventa pulso
    expect(() => archivos.leerArchivo('x.fit', '')).toThrow(/TCX o GPX/);
    expect(() => archivos.leerArchivo('x.txt', 'hola')).toThrow(/no reconocido/);
    expect(() => archivos.leerArchivo('x.gpx', '<gpx></gpx>')).toThrow(/puntos/);
  });
});

describe('zonas, esfuerzo y carga', () => {
  test('FC máxima por edad y zonas', () => {
    expect(calc.fcMaxTeorica(20)).toBe(194);
    expect(calc.fcMaxTeorica(null)).toBe(194);
    expect(calc.fcMaxTeorica(40)).toBe(180);
    expect(calc.zonaDe(90, 200)).toBe(0);
    expect(calc.zonaDe(150, 200)).toBe(3);
    expect(calc.zonaDe(185, 200)).toBe(5);
  });

  test('una hora en zona 3 es un esfuerzo 6 (media)', () => {
    const r = calc.resumir({ duracionSeg: 3600, pulsos: Array(720).fill(145), intervaloSeg: 5, edad: 20 });
    expect(r).toMatchObject({ minutos: 60, fcMedia: 145, fcMax: 145, fcMaxUsada: 194, trimp: 180, rpe: 6, intensidad: 'Media' });
    expect(r.zonas).toEqual([0, 0, 60, 0, 0]);
  });

  test('si el pulso supera la FC máxima teórica, se usa el real', () => {
    const r = calc.resumir({ duracionSeg: 600, pulsos: [...Array(100).fill(185), ...Array(20).fill(205)], intervaloSeg: 5, edad: 20 });
    expect(r.fcMaxUsada).toBe(205);
    expect(r.rpe).toBeGreaterThanOrEqual(9);
    expect(r.intensidad).toBe('Muy alta');
  });

  test('sin pulso (o con lecturas imposibles) solo cuenta la duración', () => {
    expect(calc.resumir({ duracionSeg: 1800, pulsos: [0, 0, 300, 10] })).toMatchObject({ minutos: 30, rpe: null, zonas: null });
  });

  test('reduce la curva para la gráfica', () => {
    const { pulsos, intervaloSeg } = calc.reducir(Array(1000).fill(150), 5, 360);
    expect(pulsos.length).toBeLessThanOrEqual(360);
    expect(intervaloSeg).toBe(15);
    expect(pulsos.every(b => b === 150)).toBe(true);
  });
});

describe('guardar sesiones del reloj', () => {
  const { query } = require('../base-de-datos/db');
  const { setupDatabase } = require('../base-de-datos/setup');
  const svc = require('../servidor/api/reloj/reloj.service');
  let carlos;

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await setupDatabase();
    carlos = Number((await query("SELECT id FROM usuarios WHERE email = 'carlos@vital.com'")).rows[0].id);
  }, 30000);
  afterAll(() => console.log.mockRestore());

  test('importa un archivo: crea la sesión con su carga y no la importa dos veces', async () => {
    const s = archivos.leerArchivo('carrera.tcx', tcx());
    const datos = { ...s, origen: 'archivo', nombre: 'Carrera (reloj)', fecha: archivos.fechaLocal(s.inicio) };
    const r = await svc.registrar(carlos, datos);
    expect(r).toMatchObject({ nombre: 'Carrera (reloj)', minutos: 19, distanciaM: 3600, fcMax: 180 });
    expect(r.rpe).toBeGreaterThan(3);
    expect(r.carga).toBe(r.minutos * r.rpe);

    const { rows: [rutina] } = await query('SELECT * FROM rutinas WHERE id = $1', [r.rutinaId]);
    expect(rutina).toMatchObject({ tipo: 'Cardio', duracion_minutos: 19, rpe: r.rpe, registrado_por: 'Reloj (archivo)' });
    expect(rutina.descripcion).toMatch(/3,6 km · FC media \d+ ppm \(máx\. 180\) · 260 kcal/);

    await expect(svc.registrar(carlos, datos)).rejects.toMatchObject({ status: 409 });
  });

  test('lista las sesiones y abre una con su curva; el historial muestra el pulso', async () => {
    const [s] = await svc.listar(carlos);
    expect(s).toMatchObject({ origen: 'archivo', distanciaM: 3600, fcMax: 180 });
    expect(s.zonas).toHaveLength(5);
    expect(s).not.toHaveProperty('pulsos');
    const d = await svc.detalle(carlos, s.id);
    expect(d.pulsos.length).toBeGreaterThan(200);
    await expect(svc.detalle(carlos + 999, s.id)).rejects.toMatchObject({ status: 404 });

    const historial = await require('../servidor/api/panel/historial.service').historialRutinas(carlos);
    expect(historial.datos.find(r => r.relojId)).toMatchObject({ fcMedia: s.fcMedia, distanciaM: 3600 });
  });

  test('pulsómetro en vivo y validaciones', async () => {
    const inicio = hace(0.1).toISOString();
    const r = await svc.registrar(carlos, { origen: 'bluetooth', inicio, duracionSeg: 600, intervaloSeg: 5, pulsos: Array(120).fill(160), tipo: 'Velocidad' });
    expect(r).toMatchObject({ nombre: 'Sesión con reloj', minutos: 10 });

    const base = { origen: 'bluetooth', inicio: hace(0).toISOString(), duracionSeg: 600 };
    await expect(svc.registrar(carlos, { ...base, origen: 'otro' })).rejects.toMatchObject({ status: 400 });
    await expect(svc.registrar(carlos, { ...base, duracionSeg: 30 })).rejects.toThrow(/1 minuto/);
    await expect(svc.registrar(carlos, { ...base, inicio: hace(400).toISOString() })).rejects.toThrow(/más de un año/);
    await expect(svc.registrar(carlos, { ...base, inicio: 'ayer' })).rejects.toThrow(/hora de inicio/);
    await expect(svc.registrar(carlos, { ...base, pulsos: Array(20000).fill(100) })).rejects.toThrow(/demasiados/);
  });

  test('sesión sin pulso: el atleta dice el esfuerzo y cuenta en la carga', async () => {
    const r = await svc.registrar(carlos, { origen: 'archivo', inicio: hace(0.5).toISOString(), duracionSeg: 3480, pulsos: [], distanciaM: 5830, nombre: 'Carrera (reloj)' });
    expect(r).toMatchObject({ minutos: 58, rpe: null, carga: null });
    await expect(svc.ponerEsfuerzo(carlos, r.id, 11)).rejects.toMatchObject({ status: 400 });
    const s = await svc.ponerEsfuerzo(carlos, r.id, 7);
    expect(s).toMatchObject({ rpe: 7, intensidad: 'Alta', carga: 406 });
    const [conPulso] = (await svc.listar(carlos)).filter(x => x.fcMedia);
    await expect(svc.ponerEsfuerzo(carlos, conPulso.id, 5)).rejects.toMatchObject({ status: 409 });
  });

  test('GPX con el pulso escrito de otras formas', () => {
    const punto = (i, extra) => `<trkpt lat="4.6" lon="-74.0${i}"><time>${new Date(Date.UTC(2026, 9, 1, 10, 0, i * 5)).toISOString()}</time>${extra}</trkpt>`;
    for (const forma of [v => `<extensions><heartrate>${v}</heartrate></extensions>`, v => `<extensions><ns3:TrackPointExtension><ns3:hr>${v}</ns3:hr></ns3:TrackPointExtension></extensions>`,
      v => `<extensions><HeartRateBpm><Value>${v}</Value></HeartRateBpm></extensions>`, v => `<extensions><heart_rate>${v}</heart_rate></extensions>`]) {
      const texto = `<gpx><trk><trkseg>${[0, 1, 2].map(i => punto(i, forma(140))).join('')}</trkseg></trk></gpx>`;
      expect(archivos.leerArchivo('x.gpx', texto).pulsos).toEqual([140, 140, 140]);
    }
  });

  test('cuenta para los logros y se borra con la sesión', async () => {
    const logros = await require('../servidor/api/logros/logros.service').obtener(carlos, { id: carlos, rol: 'Atleta' });
    expect(logros.logros.find(l => l.clave === 'reloj_1')).toMatchObject({ conseguido: true });

    const [s] = await svc.listar(carlos, 1);
    await query('DELETE FROM rutinas WHERE id = $1', [s.rutinaId]);
    await expect(svc.detalle(carlos, s.id)).rejects.toMatchObject({ status: 404 });
  });
});
