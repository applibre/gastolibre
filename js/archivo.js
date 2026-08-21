/* ===========================================================
   GastoLibre · archivo vinculado
   Saca los datos del navegador y los pone en un archivo de verdad
   del dispositivo, que se actualiza solo con cada cambio.

   Realidad de los navegadores (agosto 2026):
   · Escritorio Chrome/Edge/Brave → sí, con la API File System Access.
   · Cualquier navegador de móvil  → esa API no existe todavía, así que
     ahí usamos la hoja de compartir del sistema (Drive, WhatsApp,
     correo…) y la descarga a la carpeta de Descargas.
   =========================================================== */
const Archivo = (() => {
  'use strict';

  const BD = 'gastolibre-archivo';
  const ALMACEN = 'manijas';
  const CLAVE = 'respaldo';

  /* ---------- qué puede este dispositivo ---------- */
  const soportaVinculo = () => typeof window.showSaveFilePicker === 'function';
  const soportaCompartir = () => {
    try {
      // probamos con .txt: es el tipo que todos los navegadores dejan compartir
      const f = new File(['x'], 'x.txt', { type: 'text/plain' });
      return !!(navigator.canShare && navigator.canShare({ files: [f] }));
    } catch (_) { return false; }
  };

  /* ---------- guardamos la "manija" del archivo en IndexedDB ----------
     (una manija de archivo no se puede guardar en localStorage) */

  const abrirBD = () => new Promise((ok, mal) => {
    const p = indexedDB.open(BD, 1);
    p.onupgradeneeded = () => p.result.createObjectStore(ALMACEN);
    p.onsuccess = () => ok(p.result);
    p.onerror = () => mal(p.error);
  });

  const conTienda = async (modo, fn) => {
    const bd = await abrirBD();
    return new Promise((ok, mal) => {
      const tx = bd.transaction(ALMACEN, modo);
      const pet = fn(tx.objectStore(ALMACEN));
      pet.onsuccess = () => ok(pet.result);
      pet.onerror = () => mal(pet.error);
    });
  };

  const guardarManija = (h) => conTienda('readwrite', t => t.put(h, CLAVE));
  const leerManija = () => conTienda('readonly', t => t.get(CLAVE)).catch(() => null);
  const olvidarManija = () => conTienda('readwrite', t => t.delete(CLAVE));

  async function permiso(h, pedir) {
    if (!h.queryPermission) return true;
    const opciones = { mode: 'readwrite' };
    if (await h.queryPermission(opciones) === 'granted') return true;
    if (!pedir) return false;
    return await h.requestPermission(opciones) === 'granted';
  }

  /* ---------- vincular, escribir, leer ---------- */

  async function vincular() {
    const h = await window.showSaveFilePicker({
      suggestedName: 'gastolibre.json',
      types: [{ description: 'Respaldo de GastoLibre', accept: { 'application/json': ['.json'] } }],
    });
    await guardarManija(h);
    await escribir(true);
    Estado.guardarAjustes({ archivoVinculado: h.name });
    return h.name;
  }

  /** Vuelca el estado actual al archivo. Silencioso si no hay permiso. */
  async function escribir(pedirPermiso = false) {
    const h = await leerManija();
    if (!h) return 'sin-archivo';
    if (!await permiso(h, pedirPermiso)) return 'sin-permiso';
    const w = await h.createWritable();
    await w.write(JSON.stringify(Exportar.sobre(), null, 2));
    await w.close();
    Estado.marcarRespaldo();
    return 'ok';
  }

  /** Trae lo que haya en el archivo hacia la app. */
  async function leer() {
    const h = await leerManija();
    if (!h) throw new Error('No hay ningún archivo vinculado.');
    if (!await permiso(h, true)) throw new Error('El navegador no dio permiso para leer el archivo.');
    const f = await h.getFile();
    return Exportar.importar(await f.text());
  }

  async function desvincular() {
    await olvidarManija();
    Estado.guardarAjustes({ archivoVinculado: null });
  }

  /** ¿Sigue vivo el vínculo y con permiso? */
  async function estadoVinculo() {
    if (!soportaVinculo()) return { soportado: false };
    const h = await leerManija();
    if (!h) return { soportado: true, vinculado: false };
    return { soportado: true, vinculado: true, nombre: h.name, permiso: await permiso(h, false) };
  }

  /* ---------- sincronización automática ---------- */

  let pendiente = null;
  let ultimoIntento = null;

  /** Lo llama el estado cada vez que algo cambia; agrupa las escrituras. */
  function sincronizar() {
    if (!soportaVinculo()) return;
    clearTimeout(pendiente);
    pendiente = setTimeout(async () => {
      try {
        ultimoIntento = await escribir(false);
        // sin avisos aquí: si falta permiso, el banner de la pantalla de
        // anotar lo muestra en calma y lo resuelve con un toque
      } catch (_) { ultimoIntento = 'error'; }
    }, 1200);
  }

  /* ---------- compartir (la vía del teléfono) ---------- */

  async function compartir() {
    const texto = JSON.stringify(Exportar.sobre(), null, 2);
    // Android solo deja compartir ciertos tipos: .json suele estar vetado,
    // asi que si no pasa, va como .txt (el contenido es identico y la app
    // lo importa igual).
    const candidatos = [
      new File([texto], `gastolibre-${Dominio.hoyISO()}.json`, { type: 'application/json' }),
      new File([texto], `gastolibre-respaldo-${Dominio.hoyISO()}.txt`, { type: 'text/plain' }),
    ];
    const archivo = candidatos.find(f => {
      try { return navigator.canShare && navigator.canShare({ files: [f] }); }
      catch (_) { return false; }
    });
    if (!archivo) return false;
    await navigator.share({ files: [archivo], title: 'Respaldo de GastoLibre' });
    Estado.marcarRespaldo();
    return true;
  }

  return {
    soportaVinculo, soportaCompartir,
    vincular, escribir, leer, desvincular, estadoVinculo, sincronizar, compartir,
    ultimo: () => ultimoIntento,
  };
})();

// Registro explícito: `const` en el ámbito global de un script clásico no crea
// una propiedad de window, y el estado comprueba `window.Archivo` para saber si
// debe espejar cada cambio al archivo vinculado.
window.Archivo = Archivo;
