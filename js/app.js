/* ===========================================================
   GastoLibre · arranque
   Une las piezas: tema, navegación, vuelta después de un hueco
   y el aviso de respaldo. Nada de lógica de negocio aquí.
   =========================================================== */
const App = (() => {
  'use strict';
  const { $, $$ } = UI;

  let actual = 'anotar';

  /* ---------- navegación ---------- */

  function ir(p) {
    actual = p;
    $$('.pantalla').forEach(s => s.classList.toggle('viva', s.id === 'p-' + p));
    $$('.nav button').forEach(b => b.classList.toggle('on', b.dataset.p === p));
    if (p === 'anotar') Anotar.pintar();
    if (p === 'resumen') Resumen.pintar();
    if (p === 'ajustes') Ajustes.pintar();
    if (location.hash !== '#' + p) history.replaceState(null, '', '#' + p);
    window.scrollTo({ top: 0 });
  }

  const pantalla = () => actual;

  /* ---------- tema ---------- */

  function aplicarTema() {
    const t = Estado.leer().ajustes.tema || 'auto';
    const raiz = document.documentElement;
    if (t === 'auto') raiz.removeAttribute('data-tema');
    else raiz.setAttribute('data-tema', t);
    const oscuro = t === 'oscuro' ||
      (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', oscuro ? '#0a0e12' : '#f4f7fa');
  }

  /* ---------- volver después de días sin anotar ----------
     Nunca se muestra una lista de días pendientes: eso es lo que
     hace que la gente abandone. Dos botones y a seguir. */

  function revisarHueco() {
    const est = Estado.leer();
    if (!Dominio.vivos(est.movimientos).length) return;
    const con = Dominio.constancia(est, Dominio.hoyISO());
    if (!con.ultimo || con.diasSinAnotar < 3) return;

    const yaTratado = (est.huecos || []).some(h => h.hasta >= con.ultimo);
    if (yaTratado) return;

    const desde = Dominio.sumarDias(con.ultimo, 1);
    const hasta = Dominio.hoyISO();

    UI.hoja({
      titulo: `Pasaron ${con.diasSinAnotar} días`,
      sub: 'No hay nada que recuperar ni ninguna lista esperándote. Elige y seguimos.',
      html: `
        <div class="campo">
          <label for="h-monto">Si quieres, pon más o menos cuánto gastaste</label>
          <input id="h-monto" type="number" inputmode="decimal" min="0" step="1" placeholder="Ej.: 600">
          <span class="ayuda">Se anota como un solo gasto estimado, para que tus números no queden cojos.</span>
        </div>
        <div class="botones">
          <button class="btn fantasma" data-fresco>Empezar fresco</button>
          <button class="btn principal" data-aldia>Ponerme al día</button>
        </div>`,
      listo(c) {
        $('[data-aldia]', c).onclick = () => {
          Estado.ponerseAlDia(Dominio.aCentavos($('#h-monto', c).value), desde, hasta);
          UI.cerrarHoja(); Anotar.pintar(); UI.tosti('Al día. Sigue desde hoy 👌', 'buena');
        };
        $('[data-fresco]', c).onclick = () => {
          Estado.empezarFresco(desde, hasta);
          UI.cerrarHoja(); Anotar.pintar(); UI.tosti('Empezamos de nuevo desde hoy', 'buena');
        };
      },
    });
  }

  /* ---------- recordatorio de respaldo ---------- */

  function revisarRespaldo() {
    if (Exportar.diasSinRespaldo() >= 45) {
      setTimeout(() => UI.tosti('Hace mes y medio que no guardas respaldo', '',
        { texto: 'Descargar', hacer: () => { Exportar.json(); UI.tosti('Respaldo descargado', 'buena'); } }), 1800);
    }
  }

  /* ---------- importar un archivo ---------- */

  function prepararImportacion() {
    $('#importar-archivo').onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const lector = new FileReader();
      lector.onload = () => {
        try {
          const r = Exportar.importar(lector.result);
          reiniciarInterfaz();
          UI.tosti(`Restaurados ${r.movimientos} movimientos`, 'buena');
        } catch (err) {
          UI.tosti(err.message || 'No se pudo leer el archivo', 'mala');
        }
      };
      lector.onerror = () => UI.tosti('No se pudo abrir el archivo', 'mala');
      lector.readAsText(f);
      e.target.value = '';
    };
  }

  /** Repinta todo tras un cambio grande (importar, borrar, terminar bienvenida). */
  function reiniciarInterfaz() {
    aplicarTema();
    ir(actual);
  }

  /* ---------- arranque ---------- */

  function iniciar() {
    Almacen.escuchar((msg, tono) => UI.tosti(msg, tono === 'error' ? 'mala' : ''));

    aplicarTema();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicarTema);

    Anotar.iniciar();
    Resumen.iniciar();
    Ajustes.iniciar();
    prepararImportacion();

    $$('.nav button').forEach(b => b.onclick = () => ir(b.dataset.p));
    window.addEventListener('hashchange', () => {
      const p = location.hash.slice(1);
      if (['anotar', 'resumen', 'ajustes'].includes(p) && p !== actual) ir(p);
    });

    const inicial = location.hash.slice(1);
    ir(['anotar', 'resumen', 'ajustes'].includes(inicial) ? inicial : 'anotar');

    if (!Estado.leer().ajustes.listo) {
      Bienvenida.iniciar();
    } else {
      Almacen.persistir();
      if (window.Archivo) window.Archivo.prepararReactivacion();
      revisarHueco();
      revisarRespaldo();
    }
  }

  return { iniciar, ir, pantalla, aplicarTema, reiniciarInterfaz };
})();

window.App = App;   // los módulos comprueban window.App antes de usarlo
document.addEventListener('DOMContentLoaded', App.iniciar);
