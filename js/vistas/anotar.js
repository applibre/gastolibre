/* ===========================================================
   Vista: ANOTAR
   La pantalla que se abre al entrar. Todo el diseño persigue
   una sola cifra: tres segundos desde abrir hasta gasto guardado.
   Aquí NUNCA aparece un número rojo ni un reproche: si anotar
   duele, se deja de anotar.
   =========================================================== */
const Anotar = (() => {
  'use strict';
  const { $, $$, esc } = UI;

  let buffer = '';                 // lo que se va tecleando
  let tipo = 'gasto';
  let nota = '';
  let fecha = null;                // null = hoy
  let cuotasPend = null;           // {nCuotas} si se marcó "÷ cuotas"

  const montoCentavos = () => Dominio.aCentavos(buffer || '0');

  /* ---------- pintar ---------- */

  function pintar() {
    const est = Estado.leer();
    pintarQueda(est);
    pintarCifra(est);
    pintarCategorias(est);
  }

  function pintarQueda(est) {
    const aj = est.ajustes;
    const r = Dominio.teQueda(est, Dominio.hoyISO());
    const caja = $('#queda');

    if (!aj.presupuesto) {
      $('#queda-k').textContent = 'Gastado este periodo';
      $('#queda-v').textContent = Dominio.money(r.gastado, aj);
      $('#queda-sub').textContent = 'Pon un presupuesto en Ajustes para ver cuánto te queda';
      $('#queda-barra').style.width = '0%';
      caja.classList.remove('mal');
      return;
    }

    caja.classList.toggle('mal', r.excedido);
    $('#queda-k').textContent = r.excedido ? 'Te pasaste por' : 'Te queda';
    $('#queda-v').textContent = Dominio.money(Math.abs(r.queda), aj);
    $('#queda-sub').textContent = aj.modoDiario && !r.excedido
      ? `${Dominio.money(r.porDia, aj)} por día · ${r.diasRestantes} ${r.diasRestantes === 1 ? 'día' : 'días'}`
      : `${r.periodo.etiqueta} · quedan ${r.diasRestantes} ${r.diasRestantes === 1 ? 'día' : 'días'}`;
    $('#queda-barra').style.width = Math.min(100, r.usado * 100) + '%';
  }

  function pintarCifra(est) {
    const c = $('#cifra');
    const val = montoCentavos();
    c.textContent = (tipo === 'ingreso' ? '+ ' : '') + Dominio.moneyExacto(val, est.ajustes);
    c.classList.toggle('cero', !val);
    c.classList.toggle('ingreso', tipo === 'ingreso' && val > 0);

    $('#p-cuotas').classList.toggle('on', !!cuotasPend);
    $('#p-cuotas').textContent = cuotasPend ? `÷ ${cuotasPend.nCuotas} cuotas` : '÷ Cuotas';
    $('#p-cuotas').classList.toggle('oculto', tipo === 'ingreso');
    $('#p-nota').classList.toggle('on', !!nota);
    $('#p-nota').textContent = nota ? '✎ ' + (nota.length > 14 ? nota.slice(0, 14) + '…' : nota) : '+ Nota';
    $('#p-fecha').classList.toggle('on', !!fecha);
    $('#p-fecha').textContent = fecha ? Dominio.fechaCorta(fecha) : 'Hoy';
  }

  function pintarCategorias(est) {
    const caja = $('#cats');
    const lista = tipo === 'ingreso'
      ? est.categorias.filter(c => !c.deleted && c.tipo === 'ingreso')
      : Dominio.categoriasFrecuentes(est, Dominio.hoyISO(), 7);

    const botones = lista.map(c => `
      <button class="cat" data-cat="${esc(c.id)}" aria-label="${esc(c.nombre)}">
        <span class="em" aria-hidden="true">${esc(c.icono)}</span>
        <span class="nm">${esc(c.nombre)}</span>
      </button>`).join('');

    caja.innerHTML = botones + `
      <button class="cat" data-mas aria-label="Ver todas las categorías">
        <span class="em" aria-hidden="true">⋯</span><span class="nm">Todas</span>
      </button>`;

    $$('[data-cat]', caja).forEach(b => b.onclick = () => guardar(b.dataset.cat, b));
    $('[data-mas]', caja).onclick = todasLasCategorias;
  }

  /* ---------- teclado ---------- */

  function construirTeclado() {
    const t = $('#teclado');
    const tecla = (txt, val, clase = '') =>
      `<button class="tec ${clase}" data-k="${val}" aria-label="${esc(txt)}">${txt}</button>`;
    t.innerHTML =
      tecla('1', '1') + tecla('2', '2') + tecla('3', '3') +
      `<button class="tec ok" data-k="ok" aria-label="Guardar en la última categoría">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5.2 5.2L20 7"/></svg>
       </button>` +
      tecla('4', '4') + tecla('5', '5') + tecla('6', '6') +
      tecla('7', '7') + tecla('8', '8') + tecla('9', '9') +
      tecla('⌫', 'del', 'aux') + tecla('0', '0') + tecla(',', ',', 'aux') +
      tecla('C', 'clear', 'aux');

    $$('[data-k]', t).forEach(b => b.onclick = () => teclear(b.dataset.k));
  }

  function teclear(k) {
    if (k === 'del') buffer = buffer.slice(0, -1);
    else if (k === 'clear') { buffer = ''; nota = ''; cuotasPend = null; fecha = null; }
    else if (k === 'ok') return guardarRapido();
    else if (k === ',') { if (!buffer.includes(',')) buffer = (buffer || '0') + ','; }
    else {
      const dec = buffer.split(',')[1];
      if (dec && dec.length >= 2) return;                 // dos decimales bastan
      if (buffer.replace(/[^0-9]/g, '').length >= 9) return;
      buffer += k;
    }
    UI.vibrar(6);
    pintarCifra(Estado.leer());
  }

  /** El check guarda en la última categoría usada: el camino más corto. */
  function guardarRapido() {
    const est = Estado.leer();
    const ult = Dominio.vivos(est.movimientos)
      .filter(m => m.tipo === tipo)
      .sort((a, b) => b.creado - a.creado)[0];
    const lista = tipo === 'ingreso'
      ? est.categorias.filter(c => !c.deleted && c.tipo === 'ingreso')
      : Dominio.categoriasFrecuentes(est, Dominio.hoyISO(), 1);
    const cat = (ult && ult.categoriaId) || (lista[0] && lista[0].id);
    if (!cat) return UI.tosti('Elige una categoría');
    guardar(cat);
  }

  /* ---------- guardar ---------- */

  function guardar(categoriaId, boton) {
    const monto = montoCentavos();
    if (!monto) {
      UI.tosti('Escribe primero el monto');
      $('#cifra').animate(
        [{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }],
        { duration: 180 });
      return;
    }

    const est = Estado.leer();
    const cat = est.categorias.find(c => c.id === categoriaId);

    if (cuotasPend && tipo === 'gasto') {
      Estado.anotarCuotas({
        total: monto, nCuotas: cuotasPend.nCuotas,
        descripcion: nota || (cat ? cat.nombre : 'Compra'),
        categoriaId, cuentaId: 'tarjeta', primeraFecha: fecha || Dominio.hoyISO(),
      });
      const porMes = Math.round(monto / cuotasPend.nCuotas);
      UI.tosti(`Anotado · ${Dominio.money(porMes, est.ajustes)} al mes por ${cuotasPend.nCuotas} meses`, 'buena');
    } else {
      const mov = Estado.anotar({ monto, tipo, categoriaId, fecha, nota });
      UI.tosti(tipo === 'ingreso' ? 'Ingreso anotado' : 'Anotado', 'buena',
        { texto: 'Deshacer', hacer: () => { Estado.borrar(mov.id); UI.tosti('Deshecho'); } });
    }

    if (boton) {
      boton.classList.add('listo');
      setTimeout(() => boton.classList.remove('listo'), 420);
    }
    UI.vibrar(18);
    buffer = ''; nota = ''; cuotasPend = null; fecha = null;
    pintar();
  }

  /* ---------- hojas auxiliares ---------- */

  function todasLasCategorias() {
    const est = Estado.leer();
    const lista = est.categorias.filter(c => !c.deleted && c.tipo === tipo);
    UI.hoja({
      titulo: 'Elige categoría',
      sub: montoCentavos() ? Dominio.moneyExacto(montoCentavos(), est.ajustes) : 'Escribe el monto primero',
      html: `<div class="cats" style="max-height:52dvh">${lista.map(c => `
        <button class="cat" data-c="${esc(c.id)}">
          <span class="em">${esc(c.icono)}</span><span class="nm">${esc(c.nombre)}</span>
        </button>`).join('')}</div>`,
      listo(c) {
        $$('[data-c]', c).forEach(b => b.onclick = () => { UI.cerrarHoja(); guardar(b.dataset.c); });
      },
    });
  }

  function pedirCuotas() {
    const est = Estado.leer();
    const monto = montoCentavos();
    const opciones = [3, 6, 9, 12, 18, 24];
    UI.hoja({
      titulo: 'Compra a meses',
      sub: 'Se reparte en mensualidades y cada mes descuenta lo suyo. Así ves lo que ya está comprometido.',
      html: `<div class="chips">${opciones.map(n =>
        `<button class="chip ${cuotasPend && cuotasPend.nCuotas === n ? 'on' : ''}" data-n="${n}">${n} meses</button>`).join('')}
        </div>
        <p class="cap" id="q-vista" style="margin:14px 0 0;font-size:13px;color:var(--tx2)"></p>
        <div class="botones" style="margin-top:16px">
          ${cuotasPend ? '<button class="btn fantasma" data-quitar>Quitar cuotas</button>' : ''}
          <button class="btn principal" data-listo>Listo</button>
        </div>`,
      listo(c) {
        const vista = $('#q-vista', c);
        const refrescar = () => {
          vista.textContent = cuotasPend && monto
            ? `${Dominio.money(Math.round(monto / cuotasPend.nCuotas), est.ajustes)} al mes durante ${cuotasPend.nCuotas} meses.`
            : monto ? 'Elige en cuántos meses.' : 'Escribe el monto total de la compra y vuelve aquí.';
        };
        refrescar();
        $$('[data-n]', c).forEach(b => b.onclick = () => {
          cuotasPend = { nCuotas: +b.dataset.n };
          $$('[data-n]', c).forEach(x => x.classList.toggle('on', x === b));
          refrescar();
        });
        const q = $('[data-quitar]', c);
        if (q) q.onclick = () => { cuotasPend = null; UI.cerrarHoja(); pintarCifra(Estado.leer()); };
        $('[data-listo]', c).onclick = () => { UI.cerrarHoja(); pintarCifra(Estado.leer()); };
      },
    });
  }

  function pedirNota() {
    UI.hoja({
      titulo: 'Nota',
      sub: 'Para acordarte de qué fue. Opcional, siempre.',
      html: `<div class="campo">
               <input id="n-txt" type="text" maxlength="80" placeholder="Ej.: cena con Ana" value="${esc(nota)}">
             </div>
             <div class="botones"><button class="btn principal" data-ok>Guardar nota</button></div>`,
      listo(c) {
        const inp = $('#n-txt', c);
        setTimeout(() => inp.focus(), 120);
        const ok = () => { nota = inp.value.trim(); UI.cerrarHoja(); pintarCifra(Estado.leer()); };
        $('[data-ok]', c).onclick = ok;
        inp.onkeydown = e => { if (e.key === 'Enter') ok(); };
      },
    });
  }

  function pedirFecha() {
    UI.hoja({
      titulo: 'Fecha del gasto',
      sub: 'Por defecto es hoy.',
      html: `<div class="campo">
               <input id="f-txt" type="date" value="${fecha || Dominio.hoyISO()}" max="${Dominio.hoyISO()}">
             </div>
             <div class="botones">
               <button class="btn fantasma" data-hoy>Volver a hoy</button>
               <button class="btn principal" data-ok>Usar esta fecha</button>
             </div>`,
      listo(c) {
        $('[data-ok]', c).onclick = () => {
          const v = $('#f-txt', c).value;
          fecha = (v && v !== Dominio.hoyISO()) ? v : null;
          UI.cerrarHoja(); pintarCifra(Estado.leer());
        };
        $('[data-hoy]', c).onclick = () => { fecha = null; UI.cerrarHoja(); pintarCifra(Estado.leer()); };
      },
    });
  }

  /* ---------- arranque ---------- */

  function iniciar() {
    construirTeclado();

    $('#t-gasto').onclick = () => cambiarTipo('gasto');
    $('#t-ingreso').onclick = () => cambiarTipo('ingreso');
    $('#p-cuotas').onclick = pedirCuotas;
    $('#p-nota').onclick = pedirNota;
    $('#p-fecha').onclick = pedirFecha;
    $('#queda').onclick = () => App.ir('resumen');

    // teclado físico, para quien la use en la computadora
    document.addEventListener('keydown', e => {
      if (App.pantalla() !== 'anotar' || $('#hoja').classList.contains('viva')) return;
      if (e.target.matches('input, textarea')) return;
      if (/^[0-9]$/.test(e.key)) teclear(e.key);
      else if (e.key === 'Backspace') teclear('del');
      else if (e.key === 'Enter') teclear('ok');
      else if (e.key === ',' || e.key === '.') teclear(',');
      else if (e.key === 'Escape') teclear('clear');
    });

    Estado.escuchar(() => { if (App.pantalla() === 'anotar') pintar(); });
  }

  function cambiarTipo(t) {
    tipo = t;
    cuotasPend = null;
    $('#t-gasto').classList.toggle('on', t === 'gasto');
    $('#t-gasto').setAttribute('aria-pressed', t === 'gasto');
    $('#t-ingreso').classList.toggle('on', t === 'ingreso');
    $('#t-ingreso').setAttribute('aria-pressed', t === 'ingreso');
    pintar();
  }

  return { iniciar, pintar };
})();
