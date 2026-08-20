/* ===========================================================
   Vista: AJUSTES
   Presupuesto, periodo, categorías, gastos fijos y respaldos.
   =========================================================== */
const Ajustes = (() => {
  'use strict';
  const { $, $$, esc } = UI;

  const MONEDAS = [
    { c: 'MXN', l: 'es-MX', n: 'Peso mexicano' },
    { c: 'COP', l: 'es-CO', n: 'Peso colombiano' },
    { c: 'ARS', l: 'es-AR', n: 'Peso argentino' },
    { c: 'CLP', l: 'es-CL', n: 'Peso chileno' },
    { c: 'PEN', l: 'es-PE', n: 'Sol peruano' },
    { c: 'EUR', l: 'es-ES', n: 'Euro' },
    { c: 'USD', l: 'es-US', n: 'Dólar' },
    { c: 'BRL', l: 'pt-BR', n: 'Real brasileño' },
    { c: 'UYU', l: 'es-UY', n: 'Peso uruguayo' },
    { c: 'BOB', l: 'es-BO', n: 'Boliviano' },
    { c: 'CRC', l: 'es-CR', n: 'Colón costarricense' },
    { c: 'GTQ', l: 'es-GT', n: 'Quetzal' },
    { c: 'DOP', l: 'es-DO', n: 'Peso dominicano' },
    { c: 'PYG', l: 'es-PY', n: 'Guaraní' },
    { c: 'VES', l: 'es-VE', n: 'Bolívar' },
  ];

  function pintar() {
    const est = Estado.leer();
    const aj = est.ajustes;
    const nMovs = Dominio.vivos(est.movimientos).length;
    const kb = Math.max(1, Math.round(Almacen.tamano() / 1024));
    const sinRespaldo = Exportar.diasSinRespaldo();
    const recurrentes = (est.recurrentes || []).filter(r => !r.deleted);

    $('#ajustes').innerHTML = `
      <div class="vhead"><h1>Ajustes</h1><p>Todo se guarda en este dispositivo.</p></div>

      ${sinRespaldo >= 30 && nMovs ? `<div class="aviso">
        <span>💾</span><span>Llevas <b>${sinRespaldo} días</b> sin descargar un respaldo.
        Si pierdes el teléfono, pierdes el registro. Tarda dos segundos.</span></div>` : ''}

      <div class="tarjeta">
        <h3>Tu presupuesto</h3>
        <p class="cap">Cuánto piensas gastar en cada periodo. De ahí sale el «te queda».</p>
        <div class="campo">
          <label for="a-pres">Monto del periodo</label>
          <input id="a-pres" type="number" inputmode="decimal" min="0" step="1"
                 value="${aj.presupuesto ? (aj.presupuesto / 100) : ''}" placeholder="Ej.: 8000">
        </div>
        <div class="campo">
          <label>Cada cuánto empieza de nuevo</label>
          <div class="chips">
            <button class="chip ${aj.periodo === 'mes' ? 'on' : ''}" data-per="mes">Cada mes</button>
            <button class="chip ${aj.periodo === 'quincena' ? 'on' : ''}" data-per="quincena">Cada quincena</button>
          </div>
          <span class="ayuda">La quincena va del 1 al 15 y del 16 a fin de mes, como se cobra en buena parte de Latinoamérica.</span>
        </div>
      </div>

      <div class="filas">
        <div class="fila"><span class="em">📅</span>
          <span class="l">Repartir por días<small>Muestra cuánto te toca gastar hoy</small></span>
          <span class="sw ${aj.modoDiario ? 'on' : ''}" data-sw="modoDiario" role="switch"
                aria-checked="${!!aj.modoDiario}" tabindex="0"></span></div>
        <div class="fila"><span class="em">➕</span>
          <span class="l">Sumar ingresos al presupuesto<small>Lo que ingreses se añade a lo disponible</small></span>
          <span class="sw ${aj.sumarIngresos ? 'on' : ''}" data-sw="sumarIngresos" role="switch"
                aria-checked="${!!aj.sumarIngresos}" tabindex="0"></span></div>
        <div class="fila"><span class="em">📳</span>
          <span class="l">Vibración<small>Al teclear y al guardar</small></span>
          <span class="sw ${aj.vibrar !== false ? 'on' : ''}" data-sw="vibrar" role="switch"
                aria-checked="${aj.vibrar !== false}" tabindex="0"></span></div>
      </div>

      <div class="tarjeta">
        <h3>Moneda y aspecto</h3>
        <div class="campo">
          <label for="a-mon">Moneda</label>
          <select id="a-mon">${MONEDAS.map(m =>
            `<option value="${m.c}|${m.l}" ${aj.moneda === m.c ? 'selected' : ''}>${esc(m.n)} (${m.c})</option>`).join('')}</select>
        </div>
        <div class="campo">
          <label>Tema</label>
          <div class="chips">
            ${[['auto', 'Automático'], ['oscuro', 'Oscuro'], ['claro', 'Claro']].map(([v, t]) =>
              `<button class="chip ${(aj.tema || 'auto') === v ? 'on' : ''}" data-tema="${v}">${t}</button>`).join('')}
          </div>
        </div>
      </div>

      <div class="tarjeta">
        <h3>Gastos fijos</h3>
        <p class="cap">Renta, suscripciones, colegiaturas… se anotan solos cuando toca.</p>
        ${recurrentes.length ? `<div class="filas" style="margin-top:4px">${recurrentes.map(r => {
          const c = est.categorias.find(x => x.id === r.categoriaId);
          return `<button class="fila" data-rec="${esc(r.id)}">
            <span class="em">${esc(c ? c.icono : '🔁')}</span>
            <span class="l">${esc(r.descripcion)}<small>Cada ${r.cada === 'semana' ? 'semana' : 'mes'} · próximo ${Dominio.fechaCorta(r.proxima)}</small></span>
            <span class="r">${Dominio.money(r.monto, aj)}</span></button>`;
        }).join('')}</div>` : '<p class="vacio" style="padding:14px">Sin gastos fijos todavía.</p>'}
        <div class="botones" style="margin-top:12px"><button class="btn" data-nuevo-rec>+ Añadir gasto fijo</button></div>
      </div>

      <div class="tarjeta">
        <h3>Categorías</h3>
        <p class="cap">Toca una para cambiarle el nombre o el icono.</p>
        <div class="cats" style="margin-top:8px">
          ${est.categorias.filter(c => !c.deleted).map(c => `
            <button class="cat" data-cat="${esc(c.id)}">
              <span class="em">${esc(c.icono)}</span><span class="nm">${esc(c.nombre)}</span>
            </button>`).join('')}
          <button class="cat" data-nueva-cat><span class="em">＋</span><span class="nm">Nueva</span></button>
        </div>
      </div>

      <div class="tarjeta" id="t-archivo">
        <h3>Archivo del dispositivo</h3>
        <p class="cap">Cargando…</p>
      </div>

      <div class="tarjeta">
        <h3>Tus datos</h3>
        <p class="cap">${nMovs} ${nMovs === 1 ? 'movimiento guardado' : 'movimientos guardados'} · ${kb} KB en este dispositivo${
          est.meta.ultimoRespaldo ? ` · último respaldo el ${Dominio.fechaCorta(est.meta.ultimoRespaldo)}` : ''}</p>
        <div class="opciones">
          <button class="opcion" data-json><span class="ic">⬇️</span>
            <span>Descargar respaldo<small>Archivo .json con todo. Guárdalo donde quieras.</small></span></button>
          <button class="opcion" data-csv><span class="ic">📊</span>
            <span>Exportar a CSV<small>Para abrirlo en Excel o Google Sheets</small></span></button>
          <button class="opcion" data-import><span class="ic">⬆️</span>
            <span>Restaurar un respaldo<small>Reemplaza lo que hay en este dispositivo</small></span></button>
          <button class="opcion peligro" data-borrar><span class="ic">🗑️</span>
            <span>Borrar todo<small>Empezar de cero. No se puede deshacer.</small></span></button>
        </div>
      </div>

      <div class="tarjeta">
        <h3>Sobre GastoLibre</h3>
        <p class="cap">Gratis y de código abierto. Sin cuentas, sin anuncios, sin servidores:
          tus gastos nunca salen de este dispositivo. Puedes ver el código, copiarlo y
          publicar tu propia versión.</p>
        <div class="opciones">
          <a class="opcion" href="https://github.com/applibre/gastolibre" target="_blank" rel="noopener">
            <span class="ic">💚</span><span>Ver el código en GitHub<small>applibre/gastolibre</small></span></a>
        </div>
      </div>
    `;

    enlazar(est);
    pintarArchivo();
  }

  function enlazar(est) {
    const pres = $('#a-pres');
    pres.onchange = () => {
      Estado.guardarAjustes({ presupuesto: Dominio.aCentavos(pres.value) });
      UI.tosti('Presupuesto guardado', 'buena');
    };

    $$('[data-per]').forEach(b => b.onclick = () => {
      Estado.guardarAjustes({ periodo: b.dataset.per });
      pintar();
    });

    $$('[data-sw]').forEach(sw => {
      const alternar = () => {
        const k = sw.dataset.sw;
        const valor = k === 'vibrar' ? !(est.ajustes.vibrar !== false) : !est.ajustes[k];
        Estado.guardarAjustes({ [k]: valor });
        pintar();
      };
      sw.onclick = alternar;
      sw.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar(); } };
    });

    $('#a-mon').onchange = e => {
      const [moneda, locale] = e.target.value.split('|');
      Estado.guardarAjustes({ moneda, locale });
      UI.tosti('Moneda actualizada', 'buena');
    };

    $$('[data-tema]').forEach(b => b.onclick = () => {
      Estado.guardarAjustes({ tema: b.dataset.tema });
      App.aplicarTema();
      pintar();
    });

    $$('[data-cat]').forEach(b => b.onclick = () => editarCategoria(b.dataset.cat));
    $('[data-nueva-cat]').onclick = () => editarCategoria(null);
    $$('[data-rec]').forEach(b => b.onclick = () => editarRecurrente(b.dataset.rec));
    $('[data-nuevo-rec]').onclick = () => editarRecurrente(null);

    $('[data-json]').onclick = () => { Exportar.json(); UI.tosti('Respaldo descargado', 'buena'); setTimeout(pintar, 400); };
    $('[data-csv]').onclick = () => { const n = Exportar.csv(); UI.tosti(`${n} movimientos exportados`, 'buena'); };
    $('[data-import]').onclick = () => $('#importar-archivo').click();
    $('[data-borrar]').onclick = borrarTodo;
  }

  /* ---------- archivo vinculado del dispositivo ---------- */

  async function pintarArchivo() {
    const caja = document.getElementById('t-archivo');
    if (!caja) return;
    const v = await Archivo.estadoVinculo();
    const puedeCompartir = Archivo.soportaCompartir();

    if (v.soportado && v.vinculado) {
      caja.innerHTML = `
        <h3>Archivo del dispositivo</h3>
        <p class="cap">Cada cambio se escribe también en <b>${esc(v.nombre)}</b>.
          Ese archivo es tuyo: vive fuera del navegador y sobrevive aunque borres los datos del sitio.</p>
        <div class="aviso verde" style="margin-top:0">
          <span>${v.permiso ? '🔗' : '⚠️'}</span>
          <span>${v.permiso
            ? 'Vinculado y guardando solo.'
            : 'El navegador pide permiso otra vez para poder escribir.'}</span>
        </div>
        <div class="opciones" style="margin-top:10px">
          ${!v.permiso ? `<button class="opcion" data-reconectar><span class="ic">🔓</span>
            <span>Dar permiso otra vez<small>Sin esto no puede guardar en el archivo</small></span></button>` : ''}
          <button class="opcion" data-cargar><span class="ic">📂</span>
            <span>Cargar desde el archivo<small>Trae a la app lo que haya guardado ahí</small></span></button>
          <button class="opcion" data-desvincular><span class="ic">🔌</span>
            <span>Desvincular<small>La app seguirá guardando en el navegador</small></span></button>
        </div>`;
    } else if (v.soportado) {
      caja.innerHTML = `
        <h3>Archivo del dispositivo</h3>
        <p class="cap">Puedes elegir un archivo de tu equipo y la app escribirá en él cada cambio,
          automáticamente. Así tus datos dejan de depender del navegador.</p>
        <div class="opciones">
          <button class="opcion" data-vincular><span class="ic">🔗</span>
            <span>Vincular un archivo<small>Elige dónde guardarlo (por ejemplo, tu carpeta de Drive)</small></span></button>
        </div>`;
    } else {
      caja.innerHTML = `
        <h3>Guardar fuera del navegador</h3>
        <p class="cap">Los navegadores de móvil todavía no permiten que una app web escriba sola
          en un archivo del teléfono. Mientras tanto, esto es lo que sí protege tus datos:</p>
        <div class="opciones">
          ${puedeCompartir ? `<button class="opcion" data-compartir><span class="ic">📤</span>
            <span>Enviar respaldo a…<small>Drive, WhatsApp, correo: donde tú quieras guardarlo</small></span></button>` : ''}
          <button class="opcion" data-descargar><span class="ic">⬇️</span>
            <span>Guardar en Descargas<small>Queda como archivo en el teléfono, aunque borres la app</small></span></button>
        </div>
        <div class="aviso" style="margin-top:12px">
          <span>📲</span><span><b>Instálala en la pantalla de inicio.</b> Es lo que más protege
          el registro: una app instalada conserva sus datos aunque pasen semanas sin abrirla.</span>
        </div>`;
    }

    const al = (sel, fn) => { const b = caja.querySelector(sel); if (b) b.onclick = fn; };

    al('[data-vincular]', async () => {
      try {
        const nombre = await Archivo.vincular();
        UI.tosti(`Vinculado a ${nombre}`, 'buena');
        pintar();
      } catch (e) {
        if (e && e.name !== 'AbortError') UI.tosti('No se pudo vincular el archivo', 'mala');
      }
    });

    al('[data-reconectar]', async () => {
      const r = await Archivo.escribir(true);
      UI.tosti(r === 'ok' ? 'Archivo reconectado' : 'No se dio el permiso', r === 'ok' ? 'buena' : 'mala');
      pintar();
    });

    al('[data-cargar]', async () => {
      const ok = await UI.confirmar({
        titulo: '¿Cargar desde el archivo?',
        sub: 'Lo que hay ahora en la app se reemplaza por el contenido del archivo.',
        aceptar: 'Cargar', peligro: true,
      });
      if (!ok) return;
      try {
        const r = await Archivo.leer();
        App.reiniciarInterfaz();
        UI.tosti(`Cargados ${r.movimientos} movimientos`, 'buena');
      } catch (e) { UI.tosti(e.message || 'No se pudo leer el archivo', 'mala'); }
    });

    al('[data-desvincular]', async () => {
      await Archivo.desvincular();
      UI.tosti('Archivo desvinculado');
      pintar();
    });

    al('[data-compartir]', async () => {
      try {
        const ok = await Archivo.compartir();
        if (ok) { UI.tosti('Respaldo enviado', 'buena'); setTimeout(pintar, 500); }
      } catch (e) {
        if (e && e.name !== 'AbortError') UI.tosti('No se pudo compartir', 'mala');
      }
    });

    al('[data-descargar]', () => { Exportar.json(); UI.tosti('Guardado en Descargas', 'buena'); setTimeout(pintar, 400); });
  }

  /* ---------- categorías ---------- */

  function editarCategoria(id) {
    const est = Estado.leer();
    const c = id ? est.categorias.find(x => x.id === id) : null;
    const iconos = ['🛒', '🍽️', '🚌', '🧾', '🏠', '💊', '🍫', '🎬', '👕', '🛋️', '📚', '⛽', '🐾', '🎁', '✈️', '💇', '📱', '🍺', '👶', '🔧', '💵', '✨', '⋯'];

    UI.hoja({
      titulo: c ? 'Editar categoría' : 'Nueva categoría',
      html: `
        <div class="campo"><label for="c-nom">Nombre</label>
          <input id="c-nom" type="text" maxlength="24" value="${esc(c ? c.nombre : '')}" placeholder="Ej.: Mascotas"></div>
        <div class="campo"><label>Icono</label>
          <div class="cats" id="c-iconos" style="grid-template-columns:repeat(6,1fr);max-height:26dvh">
            ${iconos.map(i => `<button class="cat ${c && c.icono === i ? 'listo' : ''}" data-i="${i}">
              <span class="em">${i}</span></button>`).join('')}
          </div></div>
        ${!c ? `<div class="campo"><label>Tipo</label>
          <div class="chips">
            <button class="chip on" data-tipo="gasto">Gasto</button>
            <button class="chip" data-tipo="ingreso">Ingreso</button>
          </div></div>` : ''}
        <div class="botones">
          ${c ? '<button class="btn peligro" data-ocultar>Ocultar</button>' : ''}
          <button class="btn principal" data-ok>${c ? 'Guardar' : 'Crear'}</button>
        </div>`,
      listo(el) {
        let icono = c ? c.icono : '⋯';
        let tipo = c ? c.tipo : 'gasto';
        $$('[data-i]', el).forEach(b => b.onclick = () => {
          icono = b.dataset.i;
          $$('[data-i]', el).forEach(x => x.classList.toggle('listo', x === b));
        });
        $$('[data-tipo]', el).forEach(b => b.onclick = () => {
          tipo = b.dataset.tipo;
          $$('[data-tipo]', el).forEach(x => x.classList.toggle('on', x === b));
        });
        $('[data-ok]', el).onclick = () => {
          const nombre = $('#c-nom', el).value.trim();
          if (!nombre) return UI.tosti('Ponle un nombre');
          if (c) Estado.editarCategoria(c.id, { nombre, icono });
          else Estado.agregarCategoria({ nombre, icono, tipo, color: '#3ecf8e' });
          UI.cerrarHoja(); pintar(); UI.tosti('Guardada', 'buena');
        };
        const oc = $('[data-ocultar]', el);
        if (oc) oc.onclick = async () => {
          UI.cerrarHoja();
          const ok = await UI.confirmar({
            titulo: `¿Ocultar «${c.nombre}»?`,
            sub: 'Dejará de aparecer al anotar. Los gastos que ya tienes con esa categoría se quedan como están.',
            aceptar: 'Ocultar', peligro: true,
          });
          if (!ok) return;
          Estado.ocultarCategoria(c.id); pintar(); UI.tosti('Categoría oculta');
        };
      },
    });
  }

  /* ---------- gastos fijos ---------- */

  function editarRecurrente(id) {
    const est = Estado.leer();
    const r = id ? est.recurrentes.find(x => x.id === id) : null;
    const cats = est.categorias.filter(c => !c.deleted && c.tipo === 'gasto');

    UI.hoja({
      titulo: r ? 'Gasto fijo' : 'Nuevo gasto fijo',
      sub: r ? '' : 'Se anotará solo cada vez que toque, al abrir la app.',
      html: `
        <div class="campo"><label for="r-desc">Concepto</label>
          <input id="r-desc" type="text" maxlength="40" value="${esc(r ? r.descripcion : '')}" placeholder="Ej.: Renta"></div>
        <div class="campo"><label for="r-monto">Monto</label>
          <input id="r-monto" type="number" inputmode="decimal" min="0" step="0.01"
                 value="${r ? (r.monto / 100).toFixed(2) : ''}" placeholder="0.00"></div>
        <div class="campo"><label for="r-cat">Categoría</label>
          <select id="r-cat">${cats.map(c =>
            `<option value="${esc(c.id)}" ${r && r.categoriaId === c.id ? 'selected' : ''}>${esc(c.icono)} ${esc(c.nombre)}</option>`).join('')}</select></div>
        <div class="campo doble">
          <div><label for="r-cada">Se repite</label>
            <select id="r-cada">
              <option value="mes" ${r && r.cada === 'mes' ? 'selected' : ''}>Cada mes</option>
              <option value="semana" ${r && r.cada === 'semana' ? 'selected' : ''}>Cada semana</option>
            </select></div>
          <div><label for="r-prox">Próximo</label>
            <input id="r-prox" type="date" value="${esc(r ? r.proxima : Dominio.hoyISO())}"></div>
        </div>
        <div class="botones">
          ${r ? '<button class="btn peligro" data-quitar>Quitar</button>' : ''}
          <button class="btn principal" data-ok>${r ? 'Guardar' : 'Crear'}</button>
        </div>`,
      listo(el) {
        $('[data-ok]', el).onclick = () => {
          const descripcion = $('#r-desc', el).value.trim();
          const monto = Dominio.aCentavos($('#r-monto', el).value);
          if (!descripcion || !monto) return UI.tosti('Falta el concepto o el monto');
          const campos = {
            descripcion, monto,
            categoriaId: $('#r-cat', el).value,
            cada: $('#r-cada', el).value,
            proxima: $('#r-prox', el).value || Dominio.hoyISO(),
          };
          if (r) Estado.cambiar(d => Object.assign(d.recurrentes.find(x => x.id === r.id), campos));
          else Estado.agregarRecurrente(campos);
          Estado.aplicarRecurrentes();
          UI.cerrarHoja(); pintar(); UI.tosti('Guardado', 'buena');
        };
        const q = $('[data-quitar]', el);
        if (q) q.onclick = () => { Estado.quitarRecurrente(r.id); UI.cerrarHoja(); pintar(); UI.tosti('Quitado'); };
      },
    });
  }

  /* ---------- borrar todo ---------- */

  async function borrarTodo() {
    const ok = await UI.confirmar({
      titulo: '¿Borrar todos tus datos?',
      sub: 'Se irán los movimientos, las categorías y los ajustes de este dispositivo. Descarga antes un respaldo si quieres conservarlos.',
      aceptar: 'Sí, borrar todo', peligro: true,
    });
    if (!ok) return;
    const seguro = await UI.confirmar({
      titulo: 'Última confirmación',
      sub: 'Esto no se puede deshacer.',
      aceptar: 'Borrar definitivamente', peligro: true,
    });
    if (!seguro) return;
    Estado.reiniciar();
    UI.tosti('Todo borrado');
    App.reiniciarInterfaz();
  }

  const iniciar = () => Estado.escuchar(() => { if (App.pantalla() === 'ajustes') pintar(); });

  return { iniciar, pintar };
})();
