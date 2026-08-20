/* Pruebas de la lógica pura. Se ejecutan con:  node --test tests/
   Sin dependencias, sin navegador. Si algo aquí falla, el dinero está mal. */
const test = require('node:test');
const assert = require('node:assert');
const D = require('../js/dominio.js');

const ajustes = { moneda: 'MXN', locale: 'es-MX', periodo: 'mes', presupuesto: 1000000 };

const estadoBase = (movs = [], extra = {}) => ({
  ajustes: { ...ajustes, ...(extra.ajustes || {}) },
  categorias: [
    { id: 'c1', nombre: 'Súper', icono: '🛒', color: '#3ecf8e', orden: 1, tipo: 'gasto' },
    { id: 'c2', nombre: 'Transporte', icono: '🚌', color: '#57c7ff', orden: 2, tipo: 'gasto' },
  ],
  cuentas: [{ id: 'a1', nombre: 'Efectivo', tipo: 'efectivo', orden: 1 }],
  movimientos: movs,
  cuotas: extra.cuotas || [],
  recurrentes: extra.recurrentes || [],
});

const mov = (fecha, monto, tipo = 'gasto', categoriaId = 'c1', extra = {}) =>
  ({ id: fecha + monto + Math.random(), fecha, monto, tipo, categoriaId, cuentaId: 'a1', deleted: false, ...extra });

test('aCentavos convierte con coma o punto y aguanta basura', () => {
  assert.strictEqual(D.aCentavos('12.50'), 1250);
  assert.strictEqual(D.aCentavos('12,50'), 1250);
  assert.strictEqual(D.aCentavos('85'), 8500);
  assert.strictEqual(D.aCentavos(''), 0);
  assert.strictEqual(D.aCentavos('abc'), 0);
});

test('las fechas no se corren de día (sin toISOString)', () => {
  assert.strictEqual(D.sumarDias('2026-08-31', 1), '2026-09-01');
  assert.strictEqual(D.sumarDias('2026-01-01', -1), '2025-12-31');
  assert.strictEqual(D.diasEntre('2026-08-01', '2026-08-31'), 30);
  // cambio de horario de verano: sigue siendo un día
  assert.strictEqual(D.diasEntre('2026-03-28', '2026-03-29'), 1);
});

test('sumarMeses respeta el fin de mes', () => {
  assert.strictEqual(D.sumarMeses('2026-01-31', 1), '2026-02-28');
  assert.strictEqual(D.sumarMeses('2026-01-15', 12), '2027-01-15');
  assert.strictEqual(D.sumarMeses('2026-12-15', 1), '2027-01-15');
});

test('periodo mensual y quincenal', () => {
  const mes = D.periodo({ periodo: 'mes' }, '2026-08-20');
  assert.strictEqual(mes.inicio, '2026-08-01');
  assert.strictEqual(mes.fin, '2026-08-31');

  const q1 = D.periodo({ periodo: 'quincena' }, '2026-08-07');
  assert.strictEqual(q1.inicio, '2026-08-01');
  assert.strictEqual(q1.fin, '2026-08-15');

  const q2 = D.periodo({ periodo: 'quincena' }, '2026-08-20');
  assert.strictEqual(q2.inicio, '2026-08-16');
  assert.strictEqual(q2.fin, '2026-08-31');

  // febrero de año bisiesto
  const feb = D.periodo({ periodo: 'quincena' }, '2028-02-20');
  assert.strictEqual(feb.fin, '2028-02-29');
});

test('INVARIANTE: presupuesto − gastado === queda', () => {
  const est = estadoBase([
    mov('2026-08-05', 25000),
    mov('2026-08-12', 15000),
    mov('2026-07-30', 90000),          // mes anterior: no cuenta
    mov('2026-08-14', 50000, 'gasto', 'c1', { deleted: true }), // borrado: no cuenta
  ]);
  const r = D.teQueda(est, '2026-08-20');
  assert.strictEqual(r.gastado, 40000);
  assert.strictEqual(r.queda, r.presupuesto - r.gastado);
  assert.strictEqual(r.queda, 960000);
  assert.strictEqual(r.excedido, false);
});

test('teQueda marca excedido y no da porDia negativo', () => {
  const est = estadoBase([mov('2026-08-05', 1200000)]);
  const r = D.teQueda(est, '2026-08-20');
  assert.strictEqual(r.excedido, true);
  assert.strictEqual(r.queda, -200000);
  assert.strictEqual(r.porDia, 0);
});

test('teQueda con ingresos sumados al presupuesto', () => {
  const est = estadoBase(
    [mov('2026-08-03', 500000, 'ingreso'), mov('2026-08-04', 100000)],
    { ajustes: { sumarIngresos: true } });
  const r = D.teQueda(est, '2026-08-20');
  assert.strictEqual(r.presupuesto, 1500000);
  assert.strictEqual(r.queda, 1400000);
});

test('días restantes incluyen el día de hoy', () => {
  const r = D.teQueda(estadoBase([]), '2026-08-31');
  assert.strictEqual(r.diasRestantes, 1);
  const r2 = D.teQueda(estadoBase([]), '2026-08-30');
  assert.strictEqual(r2.diasRestantes, 2);
});

test('porCategoria ordena y calcula proporciones', () => {
  const est = estadoBase([
    mov('2026-08-05', 30000, 'gasto', 'c1'),
    mov('2026-08-06', 70000, 'gasto', 'c2'),
    mov('2026-08-07', 40000, 'ingreso', 'c1'),   // los ingresos no entran
  ]);
  const r = D.porCategoria(est, '2026-08-01', '2026-08-31');
  assert.strictEqual(r.length, 2);
  assert.strictEqual(r[0].id, 'c2');
  assert.strictEqual(r[0].monto, 70000);
  assert.strictEqual(Math.round(r[0].parte * 100), 70);
  assert.strictEqual(r[1].nombre, 'Súper');
});

test('las cuotas reparten sin perder ni un centavo', () => {
  const partes = D.repartirCuotas(100000, 3);
  assert.strictEqual(partes.length, 3);
  assert.strictEqual(partes.reduce((a, b) => a + b, 0), 100000);
  assert.strictEqual(partes[0], 33334);   // el sobrante va a la primera
  assert.strictEqual(partes[1], 33333);
});

test('una compra a 12 meses genera 12 movimientos mensuales', () => {
  const cuota = {
    id: 'q1', descripcion: 'Refri', total: 1200000, nCuotas: 12,
    primeraFecha: '2026-08-20', categoriaId: 'c1', cuentaId: 'a1',
  };
  const movs = D.movimientosDeCuota(cuota);
  assert.strictEqual(movs.length, 12);
  assert.strictEqual(movs[0].fecha, '2026-08-20');
  assert.strictEqual(movs[11].fecha, '2027-07-20');
  assert.strictEqual(movs.reduce((a, m) => a + m.monto, 0), 1200000);
  assert.ok(movs[0].nota.includes('cuota 1 de 12'));
});

test('cuotasActivas informa lo que falta por pagar', () => {
  const cuota = { id: 'q1', descripcion: 'Refri', total: 120000, nCuotas: 12, primeraFecha: '2026-08-20', categoriaId: 'c1', cuentaId: 'a1' };
  const est = estadoBase(D.movimientosDeCuota(cuota), { cuotas: [cuota] });
  const activas = D.cuotasActivas(est, '2026-10-01');
  assert.strictEqual(activas.length, 1);
  assert.strictEqual(activas[0].pagadas, 2);           // agosto y septiembre
  assert.strictEqual(activas[0].restante, 100000);
  assert.strictEqual(activas[0].proxima, '2026-10-20');
});

test('cuota terminada desaparece de las activas', () => {
  const cuota = { id: 'q1', descripcion: 'Tele', total: 60000, nCuotas: 3, primeraFecha: '2026-01-10', categoriaId: 'c1', cuentaId: 'a1' };
  const est = estadoBase(D.movimientosDeCuota(cuota), { cuotas: [cuota] });
  assert.strictEqual(D.cuotasActivas(est, '2026-08-20').length, 0);
});

test('los recurrentes se generan al día, sin duplicar', () => {
  const rec = { id: 'r1', descripcion: 'Renta', monto: 500000, cada: 'mes', proxima: '2026-06-01', categoriaId: 'c1', cuentaId: 'a1' };
  const est = estadoBase([], { recurrentes: [rec] });
  const nuevos = D.recurrentesPendientes(est, '2026-08-20');
  assert.strictEqual(nuevos.length, 3);                // junio, julio, agosto
  assert.strictEqual(rec.proxima, '2026-09-01');       // deja apuntado el siguiente
  assert.strictEqual(D.recurrentesPendientes(est, '2026-08-20').length, 0);
});

test('constancia cuenta semanas de 4+ días, no días seguidos', () => {
  // 4 días en la semana que termina el 20/08, con un hueco: sigue contando
  const est = estadoBase([
    mov('2026-08-20', 1000), mov('2026-08-19', 1000),
    mov('2026-08-17', 1000), mov('2026-08-16', 1000),
  ]);
  const c = D.constancia(est, '2026-08-20');
  assert.strictEqual(c.semanas, 1);
  assert.strictEqual(c.diasSinAnotar, 0);
});

test('constancia detecta cuántos días llevas sin anotar', () => {
  const est = estadoBase([mov('2026-08-16', 1000)]);
  const c = D.constancia(est, '2026-08-20');
  assert.strictEqual(c.diasSinAnotar, 4);
  assert.strictEqual(c.semanas, 0);                    // no llegó a 4 días
});

test('avisos detecta una categoría disparada contra el periodo anterior', () => {
  const est = estadoBase([
    mov('2026-07-10', 50000, 'gasto', 'c2'),
    mov('2026-08-10', 150000, 'gasto', 'c2'),
  ]);
  const av = D.avisos(est, '2026-08-20');
  assert.strictEqual(av.length, 1);
  assert.strictEqual(av[0].categoria.id, 'c2');
  assert.strictEqual(Math.round(av[0].veces), 3);
});

test('money nunca produce NaN', () => {
  assert.ok(!D.money(0, ajustes).includes('NaN'));
  assert.ok(!D.money(123456, ajustes).includes('NaN'));
  assert.ok(!D.moneyExacto(-5000, ajustes).includes('NaN'));
});
