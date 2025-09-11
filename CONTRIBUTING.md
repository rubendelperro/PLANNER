# Contribuir al proyecto PLANNER

Este documento describe el flujo recomendado para commits, linting y ejecución de tests en este repositorio (instrucciones y comandos listos para pegar en PowerShell).

Resumen rápido
- Formatear con Prettier.
- Ejecutar ESLint y aplicar `--fix` cuando sea posible.
- Ejecutar tests (Cypress) headless para CI; hacer una verificación headed para validación visual si procede.
- No commitear artefactos generados (ver `.gitignore`).

Convenciones de commit
- Formato: `<tipo>: <breve-descripción>`
  - Tipos recomendados: `feat`, `fix`, `chore`, `docs`, `test`, `ci`.
  - Ejemplo: `feat: add Cypress test for profile management CRUD`

Flujo local obligatorio antes de commitear
1. Formatear archivos modificados con Prettier.
2. Ejecutar ESLint con `--fix` en los archivos modificados.
3. Ejecutar Cypress headless y revisar el JSON de mochawesome.
4. Commit y push. No usar `--no-verify` salvo excepción documentada.

Comandos (PowerShell — UNA SOLA LÍNEA cada uno)

- Formatear + intentar fixes automáticos (archivos relevantes):
  Set-Location 'C:\Users\nomeg\Documents\RUBEN\PLANNER\1.0'; npx prettier --write cypress/e2e/profile_management.cy.js cypress/e2e/recipe_creation.cy.js cypress.config.cjs package.json package-lock.json cypress/support/e2e.js; npx eslint --ext .js cypress/e2e/profile_management.cy.js cypress/e2e/recipe_creation.cy.js cypress.config.cjs --fix

- Comprobar ESLint (mostrar errores restantes):
  Set-Location 'C:\Users\nomeg\Documents\RUBEN\PLANNER\1.0'; npx eslint --ext .js cypress/e2e/profile_management.cy.js cypress/e2e/recipe_creation.cy.js cypress.config.cjs --format stylish

- Capturar debug de ESLint si cuelga (genera `eslint-debug.txt`):
  Set-Location 'C:\Users\nomeg\Documents\RUBEN\PLANNER\1.0'; npx eslint --ext .js cypress/e2e/profile_management.cy.js cypress/e2e/recipe_creation.cy.js cypress.config.cjs --debug *> eslint-debug.txt; notepad eslint-debug.txt

- Ejecutar test headless y generar mochawesome JSON:
  Set-Location 'C:\Users\nomeg\Documents\RUBEN\PLANNER\1.0'; npx cypress run --spec "cypress/e2e/profile_management.cy.js" --browser electron --headless --reporter mochawesome --reporter-options "reportDir=cypress/results,reportFilename=profile_management_report,overwrite=true,html=false,json=true"

- Ejecutar test headed (visual):
  Set-Location 'C:\Users\nomeg\Documents\RUBEN\PLANNER\1.0'; npx cypress run --spec "cypress/e2e/profile_management.cy.js" --browser electron --headed --reporter mochawesome --reporter-options "reportDir=cypress/results,reportFilename=profile_management_report_headed,overwrite=true,html=false,json=true"

- Ejecutar test headless (Planner Flow) y generar mochawesome JSON:
  Set-Location 'C:\Users\nomeg\Documents\RUBEN\PLANNER\1.0'; npx cypress run --spec "cypress/e2e/planner_flow.cy.js" --browser electron --headless --reporter mochawesome --reporter-options "reportDir=cypress/results,reportFilename=planner_flow_report,overwrite=true,html=false,json=true"

- Ejecutar test headed (Planner Flow — visual):
  Set-Location 'C:\Users\nomeg\Documents\RUBEN\PLANNER\1.0'; npx cypress run --spec "cypress/e2e/planner_flow.cy.js" --browser electron --headed --reporter mochawesome --reporter-options "reportDir=cypress/results,reportFilename=planner_flow_report_headed,overwrite=true,html=false,json=true"

- Commit (después de verificar lint+tests):
  Set-Location 'C:\Users\nomeg\Documents\RUBEN\PLANNER\1.0'; git add -A; git commit -m "feat: descripción corta"

- Commit excepcional (usar SOLO si documentado y temporal):
  Set-Location 'C:\Users\nomeg\Documents\RUBEN\PLANNER\1.0'; git add -A; git commit -m "feat: descripción corta (temporarily bypass hooks)" --no-verify

- Añadir reglas a `.gitignore` y eliminar artefactos del index (si ya se commitearon):
  Set-Location 'C:\Users\nomeg\Documents\RUBEN\PLANNER\1.0'; Add-Content .gitignore "cypress/results/","mochawesome-report/","node_modules/",".eslintcache"; git rm -r --cached cypress/results mochawesome-report node_modules .eslintcache 2>$null; git add .gitignore; git commit -m "chore: ignore generated test artifacts"; git push origin main

Qué hacer si ESLint se cuelga
- Ejecuta el comando de debug anterior; guarda `eslint-debug.txt` y adjúntalo a la PR o compártelo en el canal de revisión.
- Si no se puede resolver en 10–15 min, documenta el diagnóstico en la PR y, si es imprescindible hacer el commit, usa `--no-verify` temporalmente. Incluye en la PR la explicación y el debug.

Plantilla mínima para PR (copiar en la descripción)
- Título: `feat: <breve descripción>`
- Descripción breve: 1–2 líneas.
- Archivos clave añadidos/modificados:
  - `cypress/e2e/profile_management.cy.js`
  - `cypress/e2e/recipe_creation.cy.js`
- Comandos ejecutados localmente:
  - Prettier + ESLint: `LASTEXITCODE = <valor>`
  - Cypress headless: `cypress/results/<archivo>.json`
- Validación headed (visual): yes/no
- Notas: si se usó `--no-verify`, explicar por qué y adjuntar `eslint-debug.txt` si existe.

Reglas operativas (resumen)
- No commitear artefactos generados.
- Formatear → Lint → Tests antes de commitear.
- Documentar y justificar cualquier bypass de hooks.

Si quieres que añada más reglas (por ejemplo, plantilla de PR automática o checks CI), confirma y lo añado aquí.
