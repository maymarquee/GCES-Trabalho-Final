# Requirements Checklist: CI — Testes Unitários

**Branch**: `005-ci-unit-tests` | **Date**: 2026-06-09

## Spec Quality

- [x] Todas as user stories têm critérios de aceitação mensuráveis
- [x] Edge cases cobrem: porta efêmera, mock de banco, artifact TTL, novos arquivos de teste
- [x] Requisitos funcionais (FR-001 a FR-007) são verificáveis objetivamente
- [x] Success criteria (SC-001 a SC-005) são mensuráveis sem ambiguidade

## Implementation Readiness

- [x] Jest já instalado (`server/package.json` → `devDependencies.jest`)
- [x] Script `npm test` já configurado (`"test": "jest"`)
- [x] Override Jest no `.eslintrc.json` já configurado (fase anterior)
- [x] Mock socket não precisa de nova dependência
- [x] Artifact `server/node_modules/` já produzido pelo job `build` existente

## Red/Green Cycle (obrigatório pelo rubric)

- [ ] Commit RED: teste `getPlayerCount` adicionado sem implementação → CI falha
- [ ] Commit GREEN: `Game.prototype.getPlayerCount` implementado → CI passa
- [ ] Histórico de commits evidencia a sequência red → green no GitLab

## Testes de Regressão

- [x] `matchmaking.test.js` continua passando após adição do novo teste
- [x] `db.test.js` continua passando após adição do novo teste
- [x] Lint back-end não quebra com o novo arquivo de teste (override jest já existe)
