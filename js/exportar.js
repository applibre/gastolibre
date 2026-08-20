/* ===========================================================
   GastoLibre · respaldos
   Tus datos son un archivo tuyo. JSON para no perder nada,
   CSV para abrirlo en cualquier hoja de cálculo.
   =========================================================== */
const Exportar = (() => {
  'use strict';

  const APP = 'gastolibre';

  const bajar = (texto, nombre, tipo) => {
    const blob = new Blob([texto], { type: tipo + ';charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  /* ---------- JSON: respaldo completo y fiel ---------- */

  /** El envoltorio estándar de un respaldo: lo usan la descarga,
      el archivo vinculado y la hoja de compartir. */
  function sobre() {
    Estado.guardarYa();
    return {
      app: APP,
      version: Almacen.VERSION,
      exportado: new Date().toISOString(),
      datos: Estado.leer(),
    };
  }

  function json() {
    bajar(JSON.stringify(sobre(), null, 2), `gastolibre-${Dominio.hoyISO()}.json`, 'application/json');
    Estado.marcarRespaldo();
    return true;
  }

  /** Comprueba que el archivo sea nuestro antes de tocar nada. */
  function importar(texto) {
    let envoltorio;
    try { envoltorio = JSON.parse(texto); } catch (_) { throw new Error('El archivo no es un JSON válido.'); }
    const datos = (envoltorio && envoltorio.app === APP && envoltorio.datos) ? envoltorio.datos : envoltorio;
    if (!datos || !Array.isArray(datos.movimientos)) {
      throw new Error('Ese archivo no parece un respaldo de GastoLibre.');
    }
    Estado.reemplazar(datos);
    return {
      movimientos: datos.movimientos.filter(m => !m.deleted).length,
      fecha: envoltorio && envoltorio.exportado ? envoltorio.exportado.slice(0, 10) : null,
    };
  }

  /* ---------- CSV: para la hoja de cálculo ---------- */

  /** Una celda que empieza por = + - @ la ejecutaría Excel como fórmula. */
  const seguro = (v) => {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",;\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  function csv() {
    const est = Estado.leer();
    const cat = id => (est.categorias.find(c => c.id === id) || {}).nombre || '';
    const cta = id => (est.cuentas.find(c => c.id === id) || {}).nombre || '';
    const filas = [['Fecha', 'Tipo', 'Categoria', 'Cuenta', 'Monto', 'Nota', 'Estimado', 'Cuotas']];

    Dominio.vivos(est.movimientos)
      .slice()
      .sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0)
      .forEach(m => filas.push([
        m.fecha,
        m.tipo,
        cat(m.categoriaId),
        cta(m.cuentaId),
        // negativo para gastos: la convención que entienden las hojas de cálculo
        ((m.tipo === 'gasto' ? -m.monto : m.monto) / 100).toFixed(2),
        m.nota || '',
        m.estimado ? 'si' : '',
        m.cuotaId ? 'si' : '',
      ]));

    // BOM para que Excel reconozca los acentos
    const texto = '﻿' + filas.map(f => f.map(seguro).join(',')).join('\r\n');
    bajar(texto, `gastolibre-${Dominio.hoyISO()}.csv`, 'text/csv');
    return filas.length - 1;
  }

  /** ¿Hace mucho que no guarda una copia? */
  function diasSinRespaldo() {
    const est = Estado.leer();
    const ultimo = est.meta.ultimoRespaldo;
    if (!Dominio.vivos(est.movimientos).length) return 0;
    if (!ultimo) return Dominio.diasEntre(est.meta.creado || Dominio.hoyISO(), Dominio.hoyISO());
    return Dominio.diasEntre(ultimo, Dominio.hoyISO());
  }

  return { sobre, json, csv, importar, diasSinRespaldo };
})();
