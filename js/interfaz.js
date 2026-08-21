/* ===========================================================
   GastoLibre · piezas de interfaz compartidas
   Avisos flotantes, hoja inferior, vibración y atajos de DOM.
   =========================================================== */
const UI = (() => {
  'use strict';

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  const esc = (s) => String(s == null ? '' : s)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- aviso flotante (con opción de deshacer) ---------- */
  let tiempoTosti = null;
  function tosti(mensaje, tono = '', accion = null) {
    const t = $('#tosti');
    t.innerHTML = esc(mensaje);
    if (accion) {
      const b = document.createElement('button');
      b.textContent = accion.texto;
      b.onclick = () => { accion.hacer(); ocultarTosti(); };
      t.appendChild(b);
    }
    t.className = 'tosti viva ' + tono;
    clearTimeout(tiempoTosti);
    tiempoTosti = setTimeout(ocultarTosti, accion ? 5000 : 2400);
  }
  const ocultarTosti = () => { $('#tosti').className = 'tosti'; };

  /* ---------- hoja inferior ---------- */
  let alCerrarHoja = null;

  function hoja({ titulo, sub = '', html, listo }) {
    $('#hoja-titulo').textContent = titulo;
    const s = $('#hoja-sub');
    s.textContent = sub;
    s.classList.toggle('oculto', !sub);
    $('#hoja-cuerpo').innerHTML = html;
    $('#hoja').classList.add('viva');
    $('#velo').classList.add('viva');
    document.body.style.overflow = 'hidden';
    if (listo) listo($('#hoja-cuerpo'));
  }

  function cerrarHoja() {
    $('#hoja').classList.remove('viva');
    $('#velo').classList.remove('viva');
    document.body.style.overflow = '';
    // el teclado del sistema pudo encoger la ventana: volver a medir
    if (window.App && App.medirAlto) setTimeout(App.medirAlto, 120);
    if (alCerrarHoja) { const f = alCerrarHoja; alCerrarHoja = null; f(); }
  }

  const alCerrar = (fn) => { alCerrarHoja = fn; };

  /* ---------- confirmación (sin alert del navegador) ---------- */
  function confirmar({ titulo, sub, aceptar = 'Sí, continuar', peligro = false }) {
    return new Promise(resolve => {
      let decidido = false;
      hoja({
        titulo, sub,
        html: `<div class="botones">
                 <button class="btn fantasma" data-no>Cancelar</button>
                 <button class="btn ${peligro ? 'peligro' : 'principal'}" data-si>${esc(aceptar)}</button>
               </div>`,
        listo(c) {
          $('[data-si]', c).onclick = () => { decidido = true; cerrarHoja(); resolve(true); };
          $('[data-no]', c).onclick = () => { decidido = true; cerrarHoja(); resolve(false); };
        },
      });
      alCerrar(() => { if (!decidido) resolve(false); });
    });
  }

  /* ---------- vibración suave (donde exista; iOS no la tiene) ---------- */
  const vibrar = (ms = 12) => {
    try { if (Estado.leer().ajustes.vibrar !== false && navigator.vibrate) navigator.vibrate(ms); } catch (_) {}
  };

  /* ---------- gráficos en SVG, sin librerías ---------- */

  /** Barras del gasto de cada día del periodo. */
  function barrasPorDia(serie, ajustes) {
    const W = 320, H = 96, pad = 4;
    const max = Math.max(...serie.map(d => d.total), 1);
    const paso = (W - pad * 2) / serie.length;
    const ancho = Math.max(2, Math.min(14, paso - 2));
    const hoy = Dominio.hoyISO();
    const barras = serie.map((d, i) => {
      const h = d.total ? Math.max(2, d.total / max * (H - 22)) : 0;
      const x = pad + i * paso + (paso - ancho) / 2;
      const esHoy = d.fecha === hoy;
      return h ? `<rect x="${x.toFixed(1)}" y="${(H - 16 - h).toFixed(1)}" width="${ancho.toFixed(1)}"
        height="${h.toFixed(1)}" rx="2.5" fill="${esHoy ? 'var(--ok)' : 'var(--ok-dim)'}"
        stroke="${esHoy ? 'none' : 'var(--ok-line)'}" stroke-width="1"><title>${Dominio.fechaCorta(d.fecha)}: ${Dominio.money(d.total, ajustes)}</title></rect>` : '';
    }).join('');
    const etiquetas = serie.map((d, i) => {
      const dia = +d.fecha.slice(-2);
      if (serie.length > 16 && dia % 5 !== 0 && dia !== 1) return '';
      return `<text x="${(pad + i * paso + paso / 2).toFixed(1)}" y="${H - 3}" text-anchor="middle"
        font-size="8" fill="var(--tx3)">${dia}</text>`;
    }).join('');
    return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img"
      aria-label="Gasto de cada día del periodo">
      <line x1="${pad}" y1="${H - 16}" x2="${W - pad}" y2="${H - 16}" stroke="var(--line)" stroke-width="1"/>
      ${barras}${etiquetas}</svg>`;
  }

  /** Barras horizontales por categoría. */
  function barrasCategoria(cats, ajustes, limite = 8) {
    if (!cats.length) return '';
    const max = cats[0].monto || 1;
    return `<div class="catbar">${cats.slice(0, limite).map(c => `
      <div class="item">
        <div class="top">
          <b>${esc(c.icono)} ${esc(c.nombre)}</b>
          <span>${Dominio.money(c.monto, ajustes)}
            <span class="pista2">${Math.round(c.parte * 100)}%</span></span>
        </div>
        <div class="via"><i style="width:${(c.monto / max * 100).toFixed(1)}%;background:${esc(c.color)}"></i></div>
      </div>`).join('')}</div>`;
  }

  /* ---------- cierres globales ---------- */
  $('#velo').addEventListener('click', cerrarHoja);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarHoja(); });

  return { $, $$, esc, tosti, ocultarTosti, hoja, cerrarHoja, alCerrar, confirmar, vibrar, barrasPorDia, barrasCategoria };
})();
