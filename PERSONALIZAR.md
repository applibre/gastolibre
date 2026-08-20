# Personalizar GastoLibre

Todo lo que normalmente querrás cambiar está en tres archivos.

## 1. Categorías, cuentas y valores iniciales → `js/almacen.js`

Arriba del todo verás las listas `CATEGORIAS` y `CUENTAS`. Añade, quita o
renombra lo que necesites:

```js
{ id: 'mascotas', nombre: 'Mascotas', icono: '🐾', color: '#f472b6', tipo: 'gasto' },
```

`id` debe ser único y no llevar espacios. `tipo` es `'gasto'` o `'ingreso'`.
En `ajustesPorDefecto()` puedes cambiar la moneda y el periodo con que arranca
la app para gente nueva.

> Los usuarios también pueden crear y editar categorías desde Ajustes; esto solo
> cambia con qué empiezan.

## 2. Colores y tipografía → `css/style.css`

Las primeras 60 líneas son todo el sistema visual. El acento vive en `--ok`:

```css
:root {
  --ok: #3ecf8e;        /* el color de la app */
  --bg: #0a0e12;        /* fondo oscuro */
}
```

Cambia `--ok` y toda la app cambia con él. Si tocas los colores, ajusta también
el `theme_color` de `manifest.json` y el `<meta name="theme-color">` de
`index.html` para que la barra del móvil combine.

## 3. Nombre e identidad → `manifest.json` e `index.html`

- `manifest.json`: `name`, `short_name`, `description`, `id`.
- `index.html`: el `<title>`, el `<meta name="description">` y el nombre en la
  pantalla de bienvenida (busca `Gasto<i>Libre</i>`).
- Iconos: reemplaza los `.png`. Necesitas dos versiones — la normal y la
  *maskable*, que debe llevar el dibujo dentro del 80% central porque Android
  recorta los bordes.

## Reglas de dinero → `js/dominio.js`

Aquí están los cálculos. Si quieres cambiar cómo se reparte una compra a meses,
qué cuenta como periodo o cuándo salta un aviso, es este archivo. **Después de
tocarlo, ejecuta las pruebas:**

```bash
node --test tests/dominio.test.js
```

## Publicar tu versión

En tu fork: **Settings → Pages → Source: Deploy from a branch → main → / (root)**.
Un par de minutos después estará en `https://TU-USUARIO.github.io/gastolibre/`.

Si cambias archivos, sube el número de `CACHE` en `sw.js` (`gastolibre-v1` →
`v2`) para que la gente que ya la tiene instalada reciba la actualización.
