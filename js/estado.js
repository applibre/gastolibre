/* ===========================================================
   GastoLibre · estado
   Una sola fuente de verdad. Se cambia con cambiar(fn):
   modifica → guarda → avisa a quien esté escuchando.
   Las vistas no tocan el almacén ni se llaman entre ellas.
   =========================================================== */
const Estado = (() => {
  'use strict';

  const oyentes = new Set();
  let datos = Almacen.cargar();

  const leer = () => datos;
  const escuchar = (fn) => { oyentes.add(fn); return () => oyentes.delete(fn); };
  const avisar = () => oyentes.forEach(fn => fn(datos));

  let pendiente = null;
  function cambiar(fn) {
    fn(datos);
    clearTimeout(pendiente);
    pendiente = setTimeout(() => {
      Almacen.guardar(datos, Dominio.hoyISO());
      if (window.Archivo) window.Archivo.sincronizar();   // espeja al archivo vinculado
    }, 200);
    avisar();
  }

  /** Guarda ya mismo, sin esperar (al cerrar la app o antes de exportar). */
  const guardarYa = () => { clearTimeout(pendiente); Almacen.guardar(datos, Dominio.hoyISO()); };

  const id = () => (crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'id' + Date.now() + Math.random().toString(36).slice(2);

  /* ---------- acciones sobre movimientos ---------- */

  function anotar({ monto, tipo = 'gasto', categoriaId, cuentaId, fecha, nota = '', estimado = false }) {
    const mov = {
      id: id(), tipo, monto,
      fecha: fecha || Dominio.hoyISO(),
      categoriaId, cuentaId: cuentaId || (datos.cuentas[0] && datos.cuentas[0].id),
      nota, estimado,
      cuotaId: null, recurrenteId: null,
      creado: Date.now(), actualizado: Date.now(), deleted: false,
    };
    cambiar(d => d.movimientos.push(mov));
    return mov;
  }

  const editar = (idMov, campos) => cambiar(d => {
    const m = d.movimientos.find(x => x.id === idMov);
    if (m) Object.assign(m, campos, { actualizado: Date.now() });
  });

  /** Borrado suave: se puede deshacer y permite fusionar respaldos. */
  const borrar = (idMov) => cambiar(d => {
    const m = d.movimientos.find(x => x.id === idMov);
    if (m) { m.deleted = true; m.actualizado = Date.now(); }
  });

  const restaurar = (idMov) => cambiar(d => {
    const m = d.movimientos.find(x => x.id === idMov);
    if (m) { m.deleted = false; m.actualizado = Date.now(); }
  });

  /* ---------- compras a cuotas ---------- */

  function anotarCuotas({ total, nCuotas, descripcion, categoriaId, cuentaId, primeraFecha }) {
    const cuota = {
      id: id(), total, nCuotas, descripcion: descripcion || 'Compra a cuotas',
      categoriaId, cuentaId: cuentaId || 'tarjeta',
      primeraFecha: primeraFecha || Dominio.hoyISO(),
      creado: Date.now(), deleted: false,
    };
    const movs = Dominio.movimientosDeCuota(cuota)
      .map(m => ({ ...m, actualizado: Date.now() }));
    cambiar(d => { d.cuotas.push(cuota); d.movimientos.push(...movs); });
    return cuota;
  }

  /** Cancelar una compra a cuotas borra también las mensualidades pendientes. */
  const cancelarCuotas = (idCuota, desde) => cambiar(d => {
    const c = d.cuotas.find(x => x.id === idCuota);
    if (c) c.deleted = true;
    d.movimientos.forEach(m => {
      if (m.cuotaId === idCuota && m.fecha > (desde || Dominio.hoyISO())) {
        m.deleted = true; m.actualizado = Date.now();
      }
    });
  });

  /* ---------- gastos que se repiten ---------- */

  function agregarRecurrente({ monto, descripcion, categoriaId, cuentaId, cada = 'mes', proxima }) {
    const r = {
      id: id(), monto, descripcion, categoriaId,
      cuentaId: cuentaId || (datos.cuentas[0] && datos.cuentas[0].id),
      cada, proxima: proxima || Dominio.hoyISO(), tipo: 'gasto',
      creado: Date.now(), deleted: false,
    };
    cambiar(d => d.recurrentes.push(r));
    aplicarRecurrentes();
    return r;
  }

  const quitarRecurrente = (idRec) => cambiar(d => {
    const r = d.recurrentes.find(x => x.id === idRec);
    if (r) r.deleted = true;
  });

  /** Crea los movimientos de los recurrentes que ya vencieron. */
  function aplicarRecurrentes() {
    const nuevos = Dominio.recurrentesPendientes(datos, Dominio.hoyISO());
    if (!nuevos.length) return 0;
    cambiar(d => d.movimientos.push(...nuevos.map(m => ({ ...m, actualizado: Date.now() }))));
    return nuevos.length;
  }

  /* ---------- huecos: volver después de días sin anotar ---------- */

  /** "Gasté como $X en estos días": un solo movimiento estimado. */
  function ponerseAlDia(monto, desde, hasta) {
    if (monto > 0) {
      anotar({
        monto, tipo: 'gasto', categoriaId: 'otros',
        fecha: hasta, nota: `Estimado del ${Dominio.fechaCorta(desde)} al ${Dominio.fechaCorta(hasta)}`,
        estimado: true,
      });
    }
    cambiar(d => d.huecos.push({ desde, hasta, tipo: 'estimado', creado: Date.now() }));
  }

  /** Borrón y cuenta nueva: el hueco se ignora, sin números rojos. */
  const empezarFresco = (desde, hasta) =>
    cambiar(d => d.huecos.push({ desde, hasta, tipo: 'fresco', creado: Date.now() }));

  /* ---------- categorías, cuentas y ajustes ---------- */

  const guardarAjustes = (campos) => cambiar(d => Object.assign(d.ajustes, campos));

  function agregarCategoria({ nombre, icono, color, tipo = 'gasto' }) {
    const c = {
      id: id(), nombre, icono: icono || '•', color: color || '#64748b', tipo,
      orden: datos.categorias.length, deleted: false,
    };
    cambiar(d => d.categorias.push(c));
    return c;
  }

  const editarCategoria = (idCat, campos) => cambiar(d => {
    const c = d.categorias.find(x => x.id === idCat);
    if (c) Object.assign(c, campos);
  });

  /** Al ocultar una categoría los movimientos viejos se quedan como están. */
  const ocultarCategoria = (idCat) => cambiar(d => {
    const c = d.categorias.find(x => x.id === idCat);
    if (c) c.deleted = true;
  });

  const marcarRevision = () => cambiar(d => { d.meta.ultimaRevision = Dominio.hoyISO(); });
  const marcarRespaldo = () => cambiar(d => { d.meta.ultimoRespaldo = Dominio.hoyISO(); });

  /** Reemplaza todo (importar un respaldo). */
  function reemplazar(nuevo) {
    datos = Almacen.sanear(nuevo);
    if (nuevo.ajustes) datos.ajustes = { ...Almacen.ajustesPorDefecto(), ...nuevo.ajustes };
    Almacen.guardar(datos, Dominio.hoyISO());
    avisar();
  }

  function reiniciar() {
    Almacen.borrarTodo();
    datos = Almacen.cargar();
    avisar();
  }

  /* ---------- arranque ---------- */
  if (!datos.meta.creado) cambiar(d => { d.meta.creado = Dominio.hoyISO(); });
  aplicarRecurrentes();
  window.addEventListener('pagehide', guardarYa);
  document.addEventListener('visibilitychange', () => { if (document.hidden) guardarYa(); });

  return {
    leer, escuchar, cambiar, guardarYa, id,
    anotar, editar, borrar, restaurar,
    anotarCuotas, cancelarCuotas,
    agregarRecurrente, quitarRecurrente, aplicarRecurrentes,
    ponerseAlDia, empezarFresco,
    guardarAjustes, agregarCategoria, editarCategoria, ocultarCategoria,
    marcarRevision, marcarRespaldo, reemplazar, reiniciar,
  };
})();
