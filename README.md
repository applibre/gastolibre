# GastoLibre

**Anota lo que gastas en dos toques.** Sin crear cuenta, sin conectar el banco y
sin anuncios. Lo que anotas se queda en tu dispositivo: no hay servidor que lo vea.

**Pruébala aquí → <https://applibre.github.io/gastolibre/>**

Ábrela en el móvil, «Añadir a pantalla de inicio», y a partir de ahí funciona
**sin internet**, como cualquier app.

---

## Por qué existe

Casi todas las apps de gastos fallan por lo mismo: anotar cuesta demasiado, y a
las dos o tres semanas la gente lo deja. Además, las que sincronizan con el banco
no ven el efectivo — que en buena parte de Latinoamérica es la mitad de la vida.

GastoLibre está construida alrededor de esas dos verdades:

| | |
|---|---|
| ⚡ **Dos toques** | La app abre en el teclado. Tecleas el monto, tocas la categoría y ya está. |
| 💳 **Entiende las compras a meses** | Registra una compra a 3, 6, 12 o 24 meses y descuenta la mensualidad de cada mes. Ninguna app neutral hace esto. |
| 📅 **Presupuesto quincenal** | Si te pagan por quincena, el presupuesto se reinicia el 1 y el 16. Todas las demás asumen mes. |
| 🤝 **Sin castigos** | Si dejas de anotar unos días, no hay listas pendientes ni números rojos: te pones al día con un monto aproximado o empiezas fresco. |
| 🔒 **Tus datos son tuyos** | Todo vive en tu dispositivo. Respaldo en un archivo `.json` o `.csv` cuando quieras. |
| ✈️ **Sin internet** | Instálala y úsala en el súper, en el mercado o en el metro. |

## Cómo funciona por dentro

Sin framework, sin dependencias, sin compilación. Son archivos HTML, CSS y
JavaScript que puedes leer de arriba abajo.

```
index.html            la estructura
css/style.css         el sistema visual (tema claro y oscuro)
js/dominio.js         cálculos puros: periodos, "te queda", cuotas, categorías
js/almacen.js         lo único que toca el almacenamiento del navegador
js/estado.js          el estado de la app y las acciones que lo cambian
js/interfaz.js        avisos, hojas inferiores y gráficos en SVG
js/exportar.js        respaldos en JSON y CSV
js/vistas/            una pantalla por archivo
tests/dominio.test.js pruebas de los cálculos
```

La lógica de dinero está separada de la interfaz a propósito: se puede probar sola.

```bash
node --test tests/dominio.test.js
```

Detalles que evitan errores caros: el dinero se guarda en **centavos enteros**
(nunca decimales flotantes), las fechas son **texto local `AAAA-MM-DD`** (nunca
`toISOString`, que corre el día en América), y nada se borra de verdad —
se marca como borrado, para poder deshacer.

## Hazla tuya

1. Pulsa **Fork** arriba a la derecha.
2. Cambia lo que quieras (ver [PERSONALIZAR.md](PERSONALIZAR.md)).
3. En tu copia: **Settings → Pages → Branch: main → Save**.
4. En un par de minutos tendrás tu versión en `https://TU-USUARIO.github.io/gastolibre/`.

## Lo que esta app no hace, a propósito

Sin conexión al banco (es la queja número uno de todas las que lo intentan),
sin cuentas de usuario, sin anuncios, sin inversiones ni criptomonedas, sin
contabilidad por partida doble y sin inteligencia artificial. Cada «no» es una
curva de aprendizaje que no te imponemos.

## Licencia

MIT — haz lo que quieras con ella.
Parte de [applibre](https://github.com/applibre): apps libres, sin cuentas y sin servidores.
