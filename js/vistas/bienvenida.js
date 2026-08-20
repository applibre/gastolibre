/* ===========================================================
   Vista: BIENVENIDA
   Tres preguntas y a usarla. Sin nombre, sin correo, sin
   registro: cuanto antes anote su primer gasto, mejor.
   =========================================================== */
const Bienvenida = (() => {
  'use strict';
  const { $, $$, esc } = UI;

  let paso = 0;
  const borrador = { presupuesto: 0, periodo: 'mes', moneda: null, locale: null };

  const monedaDelDispositivo = () => {
    const idioma = (navigator.language || 'es-MX');
    const porPais = {
      MX: ['MXN', 'es-MX'], CO: ['COP', 'es-CO'], AR: ['ARS', 'es-AR'], CL: ['CLP', 'es-CL'],
      PE: ['PEN', 'es-PE'], ES: ['EUR', 'es-ES'], US: ['USD', 'es-US'], BR: ['BRL', 'pt-BR'],
      UY: ['UYU', 'es-UY'], BO: ['BOB', 'es-BO'], CR: ['CRC', 'es-CR'], GT: ['GTQ', 'es-GT'],
      DO: ['DOP', 'es-DO'], PY: ['PYG', 'es-PY'], VE: ['VES', 'es-VE'], EC: ['USD', 'es-EC'],
    };
    const pais = (idioma.split('-')[1] || 'MX').toUpperCase();
    return porPais[pais] || ['MXN', 'es-MX'];
  };

  const PASOS = [
    {
      titulo: 'Anota lo que gastas en dos toques',
      dice: 'Sin crear cuenta, sin conectar tu banco y sin anuncios. Lo que anotes se queda en este teléfono: nadie más lo ve, ni siquiera nosotros.',
      cuerpo: () => `
        <div class="filas" style="margin-bottom:20px">
          <div class="fila"><span class="em">⚡</span><span class="l">Rápido de verdad<small>Tecleas el monto, tocas la categoría y ya está</small></span></div>
          <div class="fila"><span class="em">💳</span><span class="l">Entiende las compras a meses<small>Reparte una compra grande y te avisa de lo comprometido</small></span></div>
          <div class="fila"><span class="em">✈️</span><span class="l">Funciona sin internet<small>Instálala y úsala en cualquier lado</small></span></div>
        </div>`,
      valida: () => true,
    },
    {
      titulo: '¿Cuánto piensas gastar?',
      dice: 'Con esto calculamos cuánto te queda disponible. Si aún no lo sabes, sáltalo y lo pones después.',
      cuerpo: () => `
        <div class="campo">
          <label for="w-pres">Presupuesto del periodo</label>
          <input id="w-pres" type="number" inputmode="decimal" min="0" step="1" placeholder="Ej.: 8000"
                 value="${borrador.presupuesto ? borrador.presupuesto / 100 : ''}">
        </div>
        <div class="campo">
          <label>¿Cada cuánto vuelve a empezar?</label>
          <div class="chips">
            <button class="chip ${borrador.periodo === 'mes' ? 'on' : ''}" data-per="mes">Cada mes</button>
            <button class="chip ${borrador.periodo === 'quincena' ? 'on' : ''}" data-per="quincena">Cada quincena</button>
          </div>
          <span class="ayuda">Si te pagan por quincena, elige quincena: el presupuesto se reinicia el 1 y el 16.</span>
        </div>`,
      listo(el) {
        $$('[data-per]', el).forEach(b => b.onclick = () => {
          borrador.periodo = b.dataset.per;
          $$('[data-per]', el).forEach(x => x.classList.toggle('on', x === b));
        });
      },
      valida(el) {
        borrador.presupuesto = Dominio.aCentavos($('#w-pres', el).value);
        return true;
      },
    },
    {
      titulo: 'Tu moneda',
      dice: 'Solo para mostrar los montos como los lees tú.',
      cuerpo: () => {
        const [c, l] = borrador.moneda ? [borrador.moneda, borrador.locale] : monedaDelDispositivo();
        borrador.moneda = c; borrador.locale = l;
        const lista = [
          ['MXN', 'es-MX', 'Peso mexicano'], ['COP', 'es-CO', 'Peso colombiano'],
          ['ARS', 'es-AR', 'Peso argentino'], ['CLP', 'es-CL', 'Peso chileno'],
          ['PEN', 'es-PE', 'Sol peruano'], ['EUR', 'es-ES', 'Euro'],
          ['USD', 'es-US', 'Dólar'], ['BRL', 'pt-BR', 'Real brasileño'],
          ['UYU', 'es-UY', 'Peso uruguayo'], ['BOB', 'es-BO', 'Boliviano'],
          ['CRC', 'es-CR', 'Colón costarricense'], ['GTQ', 'es-GT', 'Quetzal'],
          ['DOP', 'es-DO', 'Peso dominicano'], ['PYG', 'es-PY', 'Guaraní'], ['VES', 'es-VE', 'Bolívar'],
        ];
        return `<div class="campo">
          <label for="w-mon">Moneda</label>
          <select id="w-mon">${lista.map(([cc, ll, nn]) =>
            `<option value="${cc}|${ll}" ${cc === c ? 'selected' : ''}>${nn} (${cc})</option>`).join('')}</select>
          <span class="ayuda">La detectamos por tu dispositivo; cámbiala si no acertamos.</span>
        </div>
        <div class="aviso verde" style="margin-top:18px">
          <span>🔒</span><span>Recuerda: <b>tus datos no salen de aquí</b>. Cuando quieras,
          descarga un respaldo desde Ajustes y guárdalo donde tú decidas.</span>
        </div>`;
      },
      valida(el) {
        const [moneda, locale] = $('#w-mon', el).value.split('|');
        borrador.moneda = moneda; borrador.locale = locale;
        return true;
      },
    },
  ];

  function pintar() {
    const p = PASOS[paso];
    $('#b-paso').textContent = `Paso ${paso + 1} de ${PASOS.length}`;
    $('#b-titulo').textContent = p.titulo;
    $('#b-dice').textContent = p.dice;
    $('#b-cuerpo').innerHTML = p.cuerpo();
    $('#b-atras').classList.toggle('oculto', paso === 0);
    $('#b-sigue').textContent = paso === PASOS.length - 1 ? 'Empezar a anotar' : 'Continuar';
    if (p.listo) p.listo($('#b-cuerpo'));
  }

  function siguiente() {
    const p = PASOS[paso];
    if (p.valida && !p.valida($('#b-cuerpo'))) return;
    if (paso < PASOS.length - 1) { paso++; pintar(); return; }
    Estado.guardarAjustes({
      presupuesto: borrador.presupuesto,
      periodo: borrador.periodo,
      moneda: borrador.moneda,
      locale: borrador.locale,
      listo: true,
    });
    Almacen.persistir();
    $('#bienvenida').classList.add('oculto');
    App.reiniciarInterfaz();
    UI.tosti('Listo. Teclea un monto y toca una categoría 👇', 'buena');
  }

  function iniciar() {
    $('#b-sigue').onclick = siguiente;
    $('#b-atras').onclick = () => { if (paso > 0) { paso--; pintar(); } };
    $('#bienvenida').classList.remove('oculto');
    pintar();
  }

  return { iniciar };
})();
