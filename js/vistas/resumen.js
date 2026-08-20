/* ===========================================================
   Vista: RESUMEN
   El único sitio donde aparecen los números en rojo y las
   comparaciones. Es el momento de reflexión, separado a
   propósito del momento de anotar.
   =========================================================== */
const Resumen = (() => {
  'use strict';
  const { $, $$, esc } = UI;

  let desplazamiento = 0;   // 0 = periodo actual, -1 = el anterior…

  function refPeriodo(est) {
    let ref = Dominio.hoyISO();
    for (let i = 0; i < Math.abs(desplazamiento); i++) {
      ref = Dominio.sumarDias(Dominio.periodo(est.ajustes, ref).inicio, -1);
    }
    return ref;
  }

  function pintar() {
    const est = Estado.leer();
    const aj = est.ajustes;
    const ref = refPeriodo(est);
    const p = Dominio.periodo(aj, ref);
    const hastaHoy = desplazamiento === 0 ? Dominio.hoyISO() : p.fin;
    const r = Dominio.teQueda({ ...est, ajustes: aj }, hastaHoy);
    const cats = Dominio.porCategoria(est, p.inicio, p.fin);
    const movs = Dominio.enRango(est.movimientos, p.inicio, p.fin)
      .sort((a, b) => a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.creado - a.creado);
    const gastos = movs.filter(m => m.tipo === 'gasto');
    const ingresos = movs.filter(m => m.tipo === 'ingreso');
    const totalGasto = gastos.reduce((a, m) => a + m.monto, 0);
    const totalIng = ingresos.reduce((a, m) => a + m.monto, 0);
    const cuotas = Dominio.cuotasActivas(est, Dominio.hoyISO());
    const avisos = desplazamiento === 0 ? Dominio.avisos(est, Dominio.hoyISO()) : [];
    const con = Dominio.constancia(est, Dominio.hoyISO());

    $('#resumen').innerHTML = `
      <div class="vhead">
        <h1>${esc(p.etiqueta)}</h1>
        <p>${gastos.length} ${gastos.length === 1 ? 'movimiento' : 'movimientos'}${
          desplazamiento === 0 ? ' · en curso' : ''}</p>
      </div>

      <div class="chips" style="margin-top:12px">
        <button class="chip" data-mueve="-1">← Anterior</button>
        ${desplazamiento !== 0 ? '<button class="chip" data-mueve="hoy">Volver a hoy</button>' : ''}
        <button class="chip" data-mueve="1" ${desplazamiento === 0 ? 'disabled style="opacity:.4"' : ''}>Siguiente →</button>
      </div>

      <div class="tejas">
        <div class="teja"><div class="k">Gastado</div>
          <div class="v">${Dominio.money(totalGasto, aj)}</div>
          <div class="d">${aj.presupuesto ? 'de ' + Dominio.money(r.presupuesto, aj) : 'sin presupuesto fijado'}</div></div>
        <div class="teja ${r.excedido ? 'roja' : 'verde'}">
          <div class="k">${r.excedido ? 'Te pasaste' : 'Disponible'}</div>
          <div class="v">${aj.presupuesto ? Dominio.money(Math.abs(r.queda), aj) : '—'}</div>
          <div class="d">${aj.presupuesto
            ? (r.excedido ? 'Ajusta el plan del próximo periodo' : `${r.diasRestantes} ${r.diasRestantes === 1 ? 'día' : 'días'} por delante`)
            : 'Ponlo en Ajustes'}</div></div>
        ${totalIng ? `<div class="teja verde"><div class="k">Ingresos</div>
          <div class="v">${Dominio.money(totalIng, aj)}</div><div class="d">Anotados en el periodo</div></div>` : ''}
        ${con.semanas ? `<div class="teja"><div class="k">Constancia</div>
          <div class="v">${con.semanas}</div>
          <div class="d">${con.semanas === 1 ? 'semana' : 'semanas'} anotando 4+ días</div></div>` : ''}
      </div>

      ${avisos.map(a => `<div class="aviso">
          <span>⚡</span><span>Llevas <b>${a.veces.toFixed(1)}×</b> lo del periodo pasado en
          <b>${esc(a.categoria.icono)} ${esc(a.categoria.nombre)}</b>. No pasa nada: solo para que lo sepas.</span>
        </div>`).join('')}

      ${gastos.length ? `
        <div class="tarjeta">
          <h3>Ritmo del periodo</h3>
          <p class="cap">Cuánto gastaste cada día. La barra llena es hoy.</p>
          ${UI.barrasPorDia(Dominio.porDia(est, p.inicio, p.fin), aj)}
        </div>

        <div class="tarjeta">
          <h3>En qué se va</h3>
          <p class="cap">De mayor a menor.</p>
          ${UI.barrasCategoria(cats, aj)}
        </div>` : `
        <div class="tarjeta"><p class="vacio">Todavía no hay gastos en este periodo.<br>
          Anota uno desde la pestaña Anotar y aquí verás en qué se te va el dinero.</p></div>`}

      ${cuotas.length ? `
        <div class="tarjeta">
          <h3>Compras a meses</h3>
          <p class="cap">Dinero ya comprometido para los próximos meses.</p>
          <div class="filas" style="margin-top:8px">
            ${cuotas.map(c => `
              <button class="fila" data-cuota="${esc(c.id)}">
                <span class="em">💳</span>
                <span class="l">${esc(c.descripcion)}
                  <small>Pagadas ${c.pagadas} de ${c.nCuotas} · próxima ${Dominio.fechaCorta(c.proxima)}</small></span>
                <span class="r">${Dominio.money(c.restante, aj)}<small>por pagar</small></span>
              </button>`).join('')}
          </div>
        </div>` : ''}

      ${movs.length ? `
        <div class="tarjeta" style="padding:15px 15px 6px">
          <h3>Movimientos</h3>
          <p class="cap">Toca uno para editarlo o borrarlo.</p>
          ${listaPorDia(movs, est)}
        </div>` : ''}

      <div class="tarjeta">
        <h3>Revisión de la semana</h3>
        <p class="cap">Cinco minutos para mirar atrás y ajustar. Es donde el registro se convierte en decisiones.</p>
        <div class="botones"><button class="btn principal" data-revisar>Hacer la revisión</button></div>
      </div>
    `;

    $$('[data-mueve]').forEach(b => b.onclick = () => {
      const v = b.dataset.mueve;
      desplazamiento = v === 'hoy' ? 0 : Math.min(0, desplazamiento + (+v));
      pintar();
      window.scrollTo({ top: 0 });
    });
    $$('[data-mov]').forEach(b => b.onclick = () => editarMovimiento(b.dataset.mov));
    $$('[data-cuota]').forEach(b => b.onclick = () => verCuota(b.dataset.cuota));
    $('[data-revisar]').onclick = revisionSemanal;
  }

  function listaPorDia(movs, est) {
    const aj = est.ajustes;
    const dias = [...new Set(movs.map(m => m.fecha))];
    return dias.map(f => {
      const delDia = movs.filter(m => m.fecha === f);
      const total = delDia.reduce((a, m) => a + (m.tipo === 'gasto' ? m.monto : 0), 0);
      return `
        <div class="dia-sep"><span>${Dominio.fechaCorta(f)}</span><span>${Dominio.money(total, aj)}</span></div>
        <div class="filas">${delDia.map(m => {
          const c = est.categorias.find(x => x.id === m.categoriaId);
          return `<button class="fila ${m.estimado ? 'estimado' : ''}" data-mov="${esc(m.id)}">
            <span class="em">${esc(c ? c.icono : '•')}</span>
            <span class="l">${esc(c ? c.nombre : 'Sin categoría')}
              ${m.nota ? `<small>${esc(m.nota)}</small>` : ''}</span>
            <span class="r ${m.tipo === 'ingreso' ? 'ing' : ''}">${m.tipo === 'ingreso' ? '+' : ''}${Dominio.money(m.monto, aj)}</span>
          </button>`;
        }).join('')}</div>`;
    }).join('');
  }

  /* ---------- editar un movimiento ---------- */

  function editarMovimiento(id) {
    const est = Estado.leer();
    const m = est.movimientos.find(x => x.id === id);
    if (!m) return;
    const cats = est.categorias.filter(c => !c.deleted && c.tipo === m.tipo);

    UI.hoja({
      titulo: 'Editar movimiento',
      sub: m.cuotaId ? 'Es una mensualidad de una compra a meses.' : '',
      html: `
        <div class="campo"><label for="e-monto">Monto</label>
          <input id="e-monto" type="number" inputmode="decimal" step="0.01" min="0" value="${(m.monto / 100).toFixed(2)}"></div>
        <div class="campo"><label for="e-cat">Categoría</label>
          <select id="e-cat">${cats.map(c =>
            `<option value="${esc(c.id)}" ${c.id === m.categoriaId ? 'selected' : ''}>${esc(c.icono)} ${esc(c.nombre)}</option>`).join('')}</select></div>
        <div class="campo"><label for="e-fecha">Fecha</label>
          <input id="e-fecha" type="date" value="${esc(m.fecha)}"></div>
        <div class="campo"><label for="e-nota">Nota</label>
          <input id="e-nota" type="text" maxlength="80" value="${esc(m.nota || '')}" placeholder="Opcional"></div>
        <div class="botones">
          <button class="btn peligro" data-borrar>Borrar</button>
          <button class="btn principal" data-guardar>Guardar</button>
        </div>`,
      listo(c) {
        $('[data-guardar]', c).onclick = () => {
          Estado.editar(id, {
            monto: Dominio.aCentavos($('#e-monto', c).value),
            categoriaId: $('#e-cat', c).value,
            fecha: $('#e-fecha', c).value || m.fecha,
            nota: $('#e-nota', c).value.trim(),
          });
          UI.cerrarHoja(); pintar(); UI.tosti('Guardado', 'buena');
        };
        $('[data-borrar]', c).onclick = async () => {
          UI.cerrarHoja();
          const ok = await UI.confirmar({
            titulo: '¿Borrar este movimiento?',
            sub: 'Podrás deshacerlo desde el aviso que aparece abajo.',
            aceptar: 'Borrar', peligro: true,
          });
          if (!ok) return;
          Estado.borrar(id);
          pintar();
          UI.tosti('Borrado', '', { texto: 'Deshacer', hacer: () => { Estado.restaurar(id); pintar(); } });
        };
      },
    });
  }

  function verCuota(id) {
    const est = Estado.leer();
    const c = Dominio.cuotasActivas(est, Dominio.hoyISO()).find(x => x.id === id);
    if (!c) return;
    const movs = Dominio.vivos(est.movimientos).filter(m => m.cuotaId === id).sort((a, b) => a.fecha < b.fecha ? -1 : 1);
    UI.hoja({
      titulo: c.descripcion,
      sub: `${Dominio.money(c.total, est.ajustes)} en ${c.nCuotas} meses`,
      html: `<div class="filas">${movs.map(m => `
          <div class="fila">
            <span class="em">${m.fecha <= Dominio.hoyISO() ? '✅' : '📅'}</span>
            <span class="l">${Dominio.fechaCorta(m.fecha)}
              <small>${m.fecha <= Dominio.hoyISO() ? 'Pagada' : 'Pendiente'}</small></span>
            <span class="r">${Dominio.money(m.monto, est.ajustes)}</span>
          </div>`).join('')}</div>
        <div class="botones" style="margin-top:14px">
          <button class="btn peligro" data-cancelar>Cancelar las pendientes</button>
        </div>`,
      listo(el) {
        $('[data-cancelar]', el).onclick = async () => {
          UI.cerrarHoja();
          const ok = await UI.confirmar({
            titulo: '¿Cancelar las mensualidades pendientes?',
            sub: 'Las ya pagadas se quedan en tu historial. Esto no se puede deshacer.',
            aceptar: 'Cancelar pendientes', peligro: true,
          });
          if (!ok) return;
          Estado.cancelarCuotas(id);
          pintar(); UI.tosti('Compra cancelada');
        };
      },
    });
  }

  /* ---------- revisión semanal ---------- */

  function revisionSemanal() {
    const est = Estado.leer();
    const aj = est.ajustes;
    const hoy = Dominio.hoyISO();
    const desde = Dominio.sumarDias(hoy, -6);
    const cats = Dominio.porCategoria(est, desde, hoy);
    const total = cats.reduce((a, c) => a + c.monto, 0);
    const previaDesde = Dominio.sumarDias(hoy, -13), previaHasta = Dominio.sumarDias(hoy, -7);
    const previo = Dominio.porCategoria(est, previaDesde, previaHasta).reduce((a, c) => a + c.monto, 0);
    const dif = previo ? (total - previo) / previo : 0;
    const con = Dominio.constancia(est, hoy);

    UI.hoja({
      titulo: 'Tu semana',
      sub: `${Dominio.fechaCorta(desde)} — ${Dominio.fechaCorta(hoy)}`,
      html: `
        <div class="tejas" style="margin-top:0">
          <div class="teja"><div class="k">Gastaste</div>
            <div class="v">${Dominio.money(total, aj)}</div>
            <div class="d">${previo ? (dif >= 0 ? '+' : '') + Math.round(dif * 100) + '% vs. la semana pasada' : 'primera semana registrada'}</div></div>
          <div class="teja verde"><div class="k">Constancia</div>
            <div class="v">${con.semanas}</div>
            <div class="d">${con.semanas === 1 ? 'semana seguida' : 'semanas seguidas'} anotando</div></div>
        </div>
        ${cats.length ? `<h3 style="margin:18px 0 8px;font-size:13.5px">Dónde se fue</h3>
          ${UI.barrasCategoria(cats, aj, 5)}` : '<p class="vacio">No anotaste gastos esta semana.</p>'}
        <div class="aviso verde" style="margin-top:16px">
          <span>🎯</span><span>${consejo(est, cats, total)}</span>
        </div>
        <div class="botones" style="margin-top:16px">
          <button class="btn principal" data-listo>Listo por hoy</button>
        </div>`,
      listo(c) {
        $('[data-listo]', c).onclick = () => { Estado.marcarRevision(); UI.cerrarHoja(); UI.tosti('Revisión hecha 👌', 'buena'); };
      },
    });
  }

  /** Una frase útil, nunca un regaño. */
  function consejo(est, cats, total) {
    const aj = est.ajustes;
    if (!total) return 'Semana sin gastos anotados. Si hubo y no los anotaste, no pasa nada: sigue desde hoy.';
    const r = Dominio.teQueda(est, Dominio.hoyISO());
    if (aj.presupuesto && r.excedido) {
      return `Este periodo te pasaste por <b>${Dominio.money(-r.queda, aj)}</b>. Para el siguiente, o subes el presupuesto para que sea realista, o eliges <b>una</b> categoría donde recortar. Una sola.`;
    }
    if (cats[0] && cats[0].parte > 0.4) {
      return `<b>${esc(cats[0].nombre)}</b> se llevó el ${Math.round(cats[0].parte * 100)}% de la semana. Si quieres mover la aguja, es ahí donde más rinde el esfuerzo.`;
    }
    if (aj.presupuesto && r.porDia) {
      return `Vas bien: te quedan <b>${Dominio.money(r.porDia, aj)}</b> al día hasta que termine el periodo.`;
    }
    return 'Tu gasto está repartido, sin ninguna categoría dominante. Sigue anotando: en tres semanas los patrones se ven solos.';
  }

  const iniciar = () => Estado.escuchar(() => { if (App.pantalla() === 'resumen') pintar(); });

  return { iniciar, pintar, revisionSemanal };
})();
