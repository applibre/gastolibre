/* ===========================================================
   GastoLibre · dominio
   Funciones puras: reciben datos, devuelven datos.
   Sin DOM, sin almacenamiento, sin efectos. Es la capa que se
   puede probar sola (ver tests/dominio.test.js).
   =========================================================== */
const Dominio = (() => {
  'use strict';

  /* ---------- dinero ----------
     Todo se guarda en centavos enteros. Nunca flotantes: 0.1 + 0.2
     no es 0.3 y en una app de dinero eso se acumula. */

  /** "12.50" o "12,50" → 1250 centavos */
  const aCentavos = (txt) => {
    const n = parseFloat(String(txt).replace(',', '.'));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  };

  /** 125050 → "$1,250.50" con el formato del país elegido */
  const money = (centavos, ajustes = {}) => {
    const loc = ajustes.locale || 'es-MX';
    const cur = ajustes.moneda || 'MXN';
    try {
      return new Intl.NumberFormat(loc, {
        style: 'currency', currency: cur,
        minimumFractionDigits: 0, maximumFractionDigits: 0,
      }).format(Math.round(centavos / 100));
    } catch (_) {
      return '$' + Math.round(centavos / 100).toLocaleString('es');
    }
  };

  /** igual que money() pero siempre con decimales */
  const moneyExacto = (centavos, ajustes = {}) => {
    const loc = ajustes.locale || 'es-MX';
    const cur = ajustes.moneda || 'MXN';
    try {
      return new Intl.NumberFormat(loc, { style: 'currency', currency: cur }).format(centavos / 100);
    } catch (_) {
      return '$' + (centavos / 100).toFixed(2);
    }
  };

  /* ---------- fechas ----------
     Siempre strings 'YYYY-MM-DD' en hora local. Nunca toISOString()
     sobre una fecha local: en husos al oeste de Greenwich corre el día. */

  const hoyISO = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const partes = (iso) => iso.split('-').map(Number);
  const ultimoDiaMes = (y, m) => new Date(y, m, 0).getDate();
  const armar = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  /** días entre dos fechas ISO (b − a), inmune a horarios de verano */
  const diasEntre = (a, b) => {
    const [y1, m1, d1] = partes(a), [y2, m2, d2] = partes(b);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
  };

  /** suma días a una fecha ISO */
  const sumarDias = (iso, n) => {
    const [y, m, d] = partes(iso);
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return armar(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  };

  /** suma meses conservando el día (30 de enero + 1 mes = 28/29 de febrero) */
  const sumarMeses = (iso, n) => {
    const [y, m, d] = partes(iso);
    const total = (m - 1) + n;
    const ny = y + Math.floor(total / 12);
    const nm = (total % 12 + 12) % 12 + 1;
    return armar(ny, nm, Math.min(d, ultimoDiaMes(ny, nm)));
  };

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MESES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  const fechaCorta = (iso) => { const [, m, d] = partes(iso); return `${d} ${MESES_C[m - 1]}`; };
  const fechaLarga = (iso) => { const [y, m, d] = partes(iso); return `${d} de ${MESES[m - 1]} de ${y}`; };

  /* ---------- periodo de presupuesto ----------
     Mensual o quincenal (1-15 / 16-fin), que es como se cobra en
     buena parte de Latinoamérica y ninguna app grande contempla. */

  function periodo(ajustes, ref) {
    const [y, m, d] = partes(ref);
    const fin = ultimoDiaMes(y, m);
    if (ajustes.periodo === 'quincena') {
      return d <= 15
        ? { inicio: armar(y, m, 1), fin: armar(y, m, 15), etiqueta: `1–15 ${MESES_C[m - 1]}` }
        : { inicio: armar(y, m, 16), fin: armar(y, m, fin), etiqueta: `16–${fin} ${MESES_C[m - 1]}` };
    }
    return { inicio: armar(y, m, 1), fin: armar(y, m, fin), etiqueta: `${MESES[m - 1]} ${y}` };
  }

  const periodoAnterior = (ajustes, ref) => {
    const p = periodo(ajustes, ref);
    return periodo(ajustes, sumarDias(p.inicio, -1));
  };

  /* ---------- consultas sobre movimientos ---------- */

  const vivos = (movs) => movs.filter(m => !m.deleted);
  const enRango = (movs, desde, hasta) =>
    vivos(movs).filter(m => m.fecha >= desde && m.fecha <= hasta);
  const suma = (movs, tipo) =>
    movs.reduce((a, m) => a + (m.tipo === tipo ? m.monto : 0), 0);

  /** El número héroe de la app: cuánto puedes gastar todavía. */
  function teQueda(estado, ref) {
    const aj = estado.ajustes;
    const p = periodo(aj, ref);
    const delPeriodo = enRango(estado.movimientos, p.inicio, p.fin);
    const gastado = suma(delPeriodo, 'gasto');
    const ingresos = suma(delPeriodo, 'ingreso');
    const enCuotas = delPeriodo.reduce((a, m) => a + (m.tipo === 'gasto' && m.cuotaId ? m.monto : 0), 0);
    const presupuesto = (aj.presupuesto || 0) + (aj.sumarIngresos ? ingresos : 0);
    const queda = presupuesto - gastado;
    const diasRestantes = Math.max(1, diasEntre(ref, p.fin) + 1);
    return {
      periodo: p, presupuesto, gastado, ingresos, enCuotas, queda,
      diasRestantes,
      porDia: Math.max(0, Math.floor(queda / diasRestantes)),
      usado: presupuesto > 0 ? Math.min(1, gastado / presupuesto) : 0,
      excedido: queda < 0,
    };
  }

  /** Totales por categoría, de mayor a menor. */
  function porCategoria(estado, desde, hasta) {
    const mapa = new Map();
    enRango(estado.movimientos, desde, hasta)
      .filter(m => m.tipo === 'gasto')
      .forEach(m => mapa.set(m.categoriaId, (mapa.get(m.categoriaId) || 0) + m.monto));
    const total = [...mapa.values()].reduce((a, b) => a + b, 0);
    return [...mapa.entries()]
      .map(([id, monto]) => {
        const c = estado.categorias.find(x => x.id === id);
        return {
          id, monto, nombre: c ? c.nombre : 'Sin categoría', icono: c ? c.icono : '•',
          color: c ? c.color : '#64748b',
          parte: total ? monto / total : 0,
        };
      })
      .sort((a, b) => b.monto - a.monto);
  }

  /** Categorías ordenadas por uso reciente: las de siempre, primero. */
  function categoriasFrecuentes(estado, ref, limite = 8) {
    const desde = sumarDias(ref, -60);
    const uso = new Map();
    enRango(estado.movimientos, desde, ref)
      .filter(m => m.tipo === 'gasto')
      .forEach(m => uso.set(m.categoriaId, (uso.get(m.categoriaId) || 0) + 1));
    const gasto = estado.categorias.filter(c => !c.deleted && c.tipo === 'gasto');
    return gasto
      .slice()
      .sort((a, b) => (uso.get(b.id) || 0) - (uso.get(a.id) || 0) || a.orden - b.orden)
      .slice(0, limite);
  }

  /** Gasto por día del periodo, para la gráfica. */
  function porDia(estado, desde, hasta) {
    const dias = diasEntre(desde, hasta) + 1;
    const serie = [];
    for (let i = 0; i < dias; i++) {
      const f = sumarDias(desde, i);
      const total = enRango(estado.movimientos, f, f)
        .reduce((a, m) => a + (m.tipo === 'gasto' ? m.monto : 0), 0);
      serie.push({ fecha: f, total });
    }
    return serie;
  }

  /* ---------- compras a cuotas (meses sin intereses) ---------- */

  /** Reparte el total en N mensualidades; el redondeo sobrante va a la primera. */
  function repartirCuotas(total, n) {
    const base = Math.floor(total / n);
    const resto = total - base * n;
    return Array.from({ length: n }, (_, i) => base + (i === 0 ? resto : 0));
  }

  /** Genera los movimientos de una compra a cuotas (uno por mes). */
  function movimientosDeCuota(cuota) {
    return repartirCuotas(cuota.total, cuota.nCuotas).map((monto, i) => ({
      id: `${cuota.id}-${i}`,
      tipo: 'gasto',
      monto,
      fecha: sumarMeses(cuota.primeraFecha, i),
      categoriaId: cuota.categoriaId,
      cuentaId: cuota.cuentaId,
      nota: `${cuota.descripcion} · cuota ${i + 1} de ${cuota.nCuotas}`,
      cuotaId: cuota.id,
      estimado: false,
      creado: Date.now(),
      deleted: false,
    }));
  }

  /** Cuotas que aún no terminan de pagarse, con lo que falta. */
  function cuotasActivas(estado, ref) {
    return (estado.cuotas || [])
      .filter(c => !c.deleted)
      .map(c => {
        const movs = vivos(estado.movimientos).filter(m => m.cuotaId === c.id);
        const pendientes = movs.filter(m => m.fecha > ref);
        return {
          ...c,
          pagadas: movs.length - pendientes.length,
          restante: pendientes.reduce((a, m) => a + m.monto, 0),
          proxima: pendientes.length ? pendientes.sort((a, b) => a.fecha < b.fecha ? -1 : 1)[0].fecha : null,
        };
      })
      .filter(c => c.restante > 0);
  }

  /* ---------- gastos recurrentes ---------- */

  /** Devuelve los movimientos que tocaba crear hasta hoy (sin duplicar). */
  function recurrentesPendientes(estado, ref) {
    const nuevos = [];
    (estado.recurrentes || []).filter(r => !r.deleted).forEach(r => {
      let f = r.proxima;
      let guarda = 0;
      while (f <= ref && guarda++ < 60) {
        nuevos.push({
          id: `${r.id}-${f}`,
          tipo: r.tipo || 'gasto',
          monto: r.monto,
          fecha: f,
          categoriaId: r.categoriaId,
          cuentaId: r.cuentaId,
          nota: r.descripcion,
          recurrenteId: r.id,
          estimado: false,
          creado: Date.now(),
          deleted: false,
        });
        f = r.cada === 'semana' ? sumarDias(f, 7) : sumarMeses(f, 1);
      }
      if (nuevos.length) r.proxima = f;
    });
    return nuevos;
  }

  /* ---------- constancia (sin castigar) ----------
     Contamos semanas con 4 o más días anotados, nunca días seguidos:
     una racha de días consecutivos convierte un descuido en fracaso. */

  function constancia(estado, ref) {
    const dias = new Set(vivos(estado.movimientos).map(m => m.fecha));
    let semanas = 0, cursor = ref;
    for (let s = 0; s < 52; s++) {
      let conteo = 0;
      for (let d = 0; d < 7; d++) if (dias.has(sumarDias(cursor, -d))) conteo++;
      if (conteo >= 4) { semanas++; cursor = sumarDias(cursor, -7); } else break;
    }
    const ultimo = [...dias].sort().pop() || null;
    return { semanas, ultimo, diasSinAnotar: ultimo ? diasEntre(ultimo, ref) : null };
  }

  /** Aviso calculado en el propio teléfono: ¿esta categoría se disparó? */
  function avisos(estado, ref) {
    const p = periodo(estado.ajustes, ref);
    const prev = periodoAnterior(estado.ajustes, ref);
    const ahora = porCategoria(estado, p.inicio, ref);
    const antes = porCategoria(estado, prev.inicio, prev.fin);
    const salida = [];
    ahora.slice(0, 6).forEach(c => {
      const a = antes.find(x => x.id === c.id);
      if (a && a.monto > 0 && c.monto > a.monto * 1.8 && c.monto > 20000) {
        salida.push({ tipo: 'alza', categoria: c, veces: c.monto / a.monto });
      }
    });
    return salida;
  }

  return {
    aCentavos, money, moneyExacto,
    hoyISO, diasEntre, sumarDias, sumarMeses, fechaCorta, fechaLarga, ultimoDiaMes,
    periodo, periodoAnterior,
    vivos, enRango, teQueda, porCategoria, categoriasFrecuentes, porDia,
    repartirCuotas, movimientosDeCuota, cuotasActivas,
    recurrentesPendientes, constancia, avisos,
    MESES, MESES_C,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Dominio;
