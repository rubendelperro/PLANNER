# PLANNER — Guía rápida

[![Lint](https://github.com/rubendelperro/PLANNER/actions/workflows/lint.yml/badge.svg)](https://github.com/rubendelperro/PLANNER/actions/workflows/lint.yml)
[![Cypress E2E](https://github.com/rubendelperro/PLANNER/actions/workflows/cypress-e2e.yml/badge.svg)](https://github.com/rubendelperro/PLANNER/actions/workflows/cypress-e2e.yml)

Resumen corto: este repositorio usa Prettier para formateo, ESLint para linting, Husky + lint-staged para hooks locales (Prettier en pre-commit) y Cypress para E2E. Hay un workflow de CI que ejecuta ESLint en PRs.

## Requisitos

- Node.js (v16+ recomendable, se probó con v22)
- npm

## Instalación

En PowerShell (o usa `cmd /c` si tienes políticas restrictivas):

```powershell
cd "C:\Users\nomeg\Documents\RUBEN\PLANNER\1.0"
npm ci
```

## Comandos útiles

- Formatear todo (Prettier):

```powershell
npm run format
```

- Lint (comprobar):

```powershell
npm run lint
```

- Lint + auto-fix y formatear (aplica cambios):

```powershell
npm run lint:fix
```

- Cypress (abrir UI):

```powershell
npm run cypress:open
```

- Cypress (headless, CI):

```powershell
npm run cypress:run
```

## Hooks y flujo local

- `pre-commit` está configurado con Husky para ejecutar `lint-staged`. Actualmente `lint-staged` aplica sólo Prettier a `*.js` para evitar fallos en entornos Windows con `npx` en `sh`.
- ESLint está instalado y configurado (`eslint.config.cjs`). Para aplicar ESLint automáticamente en commits necesitarás que `npx` sea resoluble desde el shell que ejecuta Husky (o cambiar el hook para llamar a `npm run lint:fix`).

Si quieres habilitar ESLint en pre-commit (opción más estricta), una forma robusta es:

1. Actualizar `lint-staged` en `package.json` para ejecutar el script npm en lugar de `npx`:

```json
"lint-staged": {
  "*.js": "npm run lint:fix --silent"
}
```

2. Asegurarte de que `.husky/pre-commit` ejecuta `npx` o `npm` desde una ruta válida (en Windows puede ser necesario usar `npm.cmd` o `cmd /c`).

## CI

Hay un workflow `.github/workflows/lint.yml` que ejecuta `npm run lint` en pushes y PRs contra `main`.

## Recomendaciones antes de codificar

- Activa `Format on Save` en tu editor (VSCode) para aplicar Prettier al guardar.
- Ejecuta `npm run lint:fix` y revisa los cambios antes del primer commit de una nueva funcionalidad.
- Añade tests Cypress adicionales para las rutas y comportamientos importantes.

## ¿Problemas con PowerShell y npm?

Si PowerShell bloquea la ejecución de scripts, usa `cmd /c "npm ..."` o permite scripts para el usuario:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

Si quieres, comito este README y lo subo al remoto ahora (lo haré automáticamente si me confirmas). También puedo crear un `README.es.md` o añadir secciones de contribución/estilo.
