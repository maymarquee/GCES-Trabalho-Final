# Requirements Checklist: CI — Testes de Fuzzing

**Branch**: `006-ci-fuzzing` | **Date**: 2026-06-09

## Spec Quality

- [x] Todas as user stories têm critérios de aceitação mensuráveis
- [x] Edge cases cobrem: objetos circulares, strings longas, chaves de prototype, timeout de Jest
- [x] Requisitos funcionais (FR-001 a FR-008) são verificáveis objetivamente
- [x] Success criteria (SC-001 a SC-005) são mensuráveis sem ambiguidade

## Implementation Readiness

- [x] Jest já instalado (`server/package.json` → `devDependencies.jest`)
- [x] Script `npm run test:fuzz` a ser adicionado no commit 2
- [x] fast-check a ser adicionado como devDependency no commit 2
- [x] Override Jest no `.eslintrc.json` já configurado — fuzz tests em `test/` não causam erros de lint
- [x] Artifact `server/node_modules/` já produzido pelo job `build` existente

## Red/Green Cycle

- [ ] Commit RED: fuzz tests com asserções que expõem o bug de coerção de tipo → CI `test:fuzz` falha
- [ ] Commit GREEN: validação em `createGame` adicionada → CI `test:fuzz` passa
- [ ] Histórico de commits evidencia a sequência red → green no GitLab

## Fuzz Tests Cobertos

- [ ] `createGame` com `fc.anything()` nunca lança exceção (300 runs)
- [ ] `getGame` com `fc.anything()` nunca lança exceção (300 runs)
- [ ] `removeGame` com `fc.anything()` nunca lança exceção (300 runs)
- [ ] `createGame` com non-string retorna false (property, 200 runs) — RED → GREEN
- [ ] `createGame(null)` não bloqueia `createGame('null')` — RED → GREEN
- [ ] Round-trip: `createGame(s)` true implica `getGame(s)` definido (200 runs)
- [ ] `addPlayer` com mock socket nunca lança exceção (100 runs)

## Testes de Regressão

- [x] `games.unit.test.js` continua passando após adição do fuzz test e da validação
- [x] `matchmaking.test.js` continua passando após adição do fuzz test e da validação
- [x] `db.test.js` continua passando após adição do fuzz test e da validação
- [x] Lint back-end não quebra com o novo arquivo de fuzz test
