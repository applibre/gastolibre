/* ===========================================================
   GastoLibre · almacén
   El ÚNICO módulo que toca localStorage. Si algún día quieres
   cambiar a IndexedDB o a un archivo, solo se toca este archivo.

   Tres obsesiones, aprendidas de los fallos de otras apps:
   1. Una escritura que falla por falta de espacio AVISA, no se pierde en silencio.
   2. Un dato corrupto se rescata a un lado; jamás se destruye.
   3. Cada día se guarda una foto del día anterior antes de escribir.
   =========================================================== */
const Almacen = (() => {
  'use strict';

  const K_DATOS = 'gastolibre.datos';
  const K_AJUSTES = 'gastolibre.ajustes';
  const K_RESPALDO = 'gastolibre.respaldo';
  const VERSION = 1;

  /* ---------- valores de arranque ---------- */

  const CATEGORIAS = [
    { id: 'super', nombre: 'Súper', icono: '🛒', color: '#3ecf8e', tipo: 'gasto' },
    { id: 'comida', nombre: 'Comida', icono: '🍽️', color: '#f5b74f', tipo: 'gasto' },
    { id: 'transporte', nombre: 'Transporte', icono: '🚌', color: '#57c7ff', tipo: 'gasto' },
    { id: 'recibos', nombre: 'Recibos', icono: '🧾', color: '#a78bfa', tipo: 'gasto' },
    { id: 'renta', nombre: 'Renta', icono: '🏠', color: '#fb923c', tipo: 'gasto' },
    { id: 'salud', nombre: 'Salud', icono: '💊', color: '#f472b6', tipo: 'gasto' },
    { id: 'antojos', nombre: 'Antojos', icono: '🍫', color: '#facc15', tipo: 'gasto' },
    { id: 'ocio', nombre: 'Ocio', icono: '🎬', color: '#22d3ee', tipo: 'gasto' },
    { id: 'ropa', nombre: 'Ropa', icono: '👕', color: '#c084fc', tipo: 'gasto' },
    { id: 'casa', nombre: 'Casa', icono: '🛋️', color: '#94a3b8', tipo: 'gasto' },
    { id: 'educacion', nombre: 'Educación', icono: '📚', color: '#60a5fa', tipo: 'gasto' },
    { id: 'otros', nombre: 'Otros', icono: '⋯', color: '#64748b', tipo: 'gasto' },
    { id: 'sueldo', nombre: 'Sueldo', icono: '💵', color: '#3ecf8e', tipo: 'ingreso' },
    { id: 'extra', nombre: 'Extra', icono: '✨', color: '#facc15', tipo: 'ingreso' },
  ].map((c, i) => ({ ...c, orden: i, deleted: false }));

  const CUENTAS = [
    { id: 'efectivo', nombre: 'Efectivo', icono: '💵', orden: 0, deleted: false },
    { id: 'tarjeta', nombre: 'Tarjeta', icono: '💳', orden: 1, deleted: false },
    { id: 'banco', nombre: 'Banco', icono: '🏦', orden: 2, deleted: false },
  ];

  const ajustesPorDefecto = () => ({
    moneda: 'MXN',
    locale: 'es-MX',
    periodo: 'mes',
    presupuesto: 0,
    sumarIngresos: false,
    modoDiario: false,
    tema: 'auto',
    diaRevision: 0,          // domingo
    listo: false,            // ¿terminó la bienvenida?
  });

  const datosPorDefecto = () => ({
    v: VERSION,
    categorias: CATEGORIAS.map(c => ({ ...c })),
    cuentas: CUENTAS.map(c => ({ ...c })),
    movimientos: [],
    cuotas: [],
    recurrentes: [],
    huecos: [],
    meta: { creado: null, ultimoRespaldo: null, ultimaFoto: null, ultimaRevision: null },
  });

  /* ---------- avisos hacia la interfaz ---------- */
  let alAvisar = () => {};
  const escuchar = fn => { alAvisar = fn; };

  /* ---------- lectura tolerante a fallos ---------- */

  function leer(clave, porDefecto) {
    let crudo = null;
    try { crudo = localStorage.getItem(clave); } catch (_) { return porDefecto(); }
    if (!crudo) return porDefecto();
    try {
      const dato = JSON.parse(crudo);
      if (!dato || typeof dato !== 'object') throw new Error('forma inesperada');
      return dato;
    } catch (_) {
      // Nunca borramos: apartamos los bytes por si se pueden rescatar a mano.
      try { localStorage.setItem(clave + '.corrupto', crudo); } catch (__) {}
      alAvisar('Los datos guardados no se pudieron leer. Se empezó de cero, pero la copia dañada quedó guardada por si acaso.', 'error');
      return porDefecto();
    }
  }

  /* ---------- escritura que avisa si falla ---------- */

  let avisadoSinEspacio = false;

  function escribir(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch (e) {
      const sinEspacio = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
      if (sinEspacio && !avisadoSinEspacio) {
        avisadoSinEspacio = true;
        alAvisar('Ya no hay espacio para guardar. Descarga un respaldo desde Ajustes antes de seguir.', 'error');
      } else if (!sinEspacio) {
        alAvisar('No se pudo guardar en este dispositivo.', 'error');
      }
      return false;
    }
  }

  /* ---------- migraciones: ordenadas, inmutables, solo hacia adelante ---------- */

  const migraciones = {
    // 1: (d) => { ...; return d; }   ← ejemplo para futuras versiones
  };

  function migrar(datos) {
    let v = datos.v || 1;
    let guarda = 0;
    while (v < VERSION && guarda++ < 50) {
      const paso = migraciones[v];
      if (paso) datos = paso(datos);
      v++;
      datos.v = v;
    }
    return datos;
  }

  /** Rellena lo que falte sin pisar lo que ya existe (una importación vieja también pasa por aquí). */
  function sanear(datos) {
    const base = datosPorDefecto();
    const d = { ...base, ...datos };
    d.meta = { ...base.meta, ...(datos.meta || {}) };
    ['categorias', 'cuentas', 'movimientos', 'cuotas', 'recurrentes', 'huecos']
      .forEach(k => { if (!Array.isArray(d[k])) d[k] = base[k]; });
    if (!d.categorias.length) d.categorias = base.categorias;
    if (!d.cuentas.length) d.cuentas = base.cuentas;
    d.movimientos.forEach(m => {
      if (m.deleted === undefined) m.deleted = false;
      if (typeof m.monto !== 'number') m.monto = 0;
    });
    return migrar(d);
  }

  /* ---------- foto diaria: antes de la primera escritura del día ---------- */

  function fotoDelDia(datos, hoy) {
    if (datos.meta.ultimaFoto === hoy) return;
    const previo = leer(K_DATOS, () => null);
    if (previo && previo.movimientos && previo.movimientos.length) {
      escribir(K_RESPALDO, { fecha: datos.meta.ultimaFoto || 'anterior', datos: previo });
    }
    datos.meta.ultimaFoto = hoy;
  }

  /* ---------- interfaz pública ---------- */

  function cargar() {
    const ajustes = { ...ajustesPorDefecto(), ...leer(K_AJUSTES, () => ({})) };
    const datos = sanear(leer(K_DATOS, datosPorDefecto));
    return { ...datos, ajustes };
  }

  function guardar(estado, hoy) {
    const { ajustes, ...datos } = estado;
    if (hoy) fotoDelDia(datos, hoy);
    const a = escribir(K_AJUSTES, ajustes);
    const b = escribir(K_DATOS, datos);
    return a && b;
  }

  /** Copia de seguridad del día anterior, si existe. */
  const respaldoPrevio = () => leer(K_RESPALDO, () => null);

  /** Pide al navegador que no borre estos datos para liberar espacio. */
  async function persistir() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        if (await navigator.storage.persisted()) return true;
        return await navigator.storage.persist();
      }
    } catch (_) {}
    return false;
  }

  /** Cuánto espacio ocupa el registro, para mostrarlo en Ajustes. */
  function tamano() {
    try {
      const n = (localStorage.getItem(K_DATOS) || '').length + (localStorage.getItem(K_AJUSTES) || '').length;
      return n * 2; // UTF-16: dos bytes por carácter
    } catch (_) { return 0; }
  }

  function borrarTodo() {
    try {
      [K_DATOS, K_AJUSTES, K_RESPALDO].forEach(k => localStorage.removeItem(k));
      return true;
    } catch (_) { return false; }
  }

  return {
    VERSION, cargar, guardar, respaldoPrevio, persistir, tamano, borrarTodo,
    escuchar, sanear, ajustesPorDefecto, datosPorDefecto,
    CATEGORIAS, CUENTAS,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Almacen;
