# Implementation Plan: CI — Testes Unitários

**Branch**: `005-ci-unit-tests` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-ci-unit-tests/spec.md`

## Summary

Adicionar estágio `test` ao pipeline GitLab CI já existente, incluindo o job `test:unit` que executa `npm test` (Jest). Criar testes unitários para `GameCollection` e `Game` em `server/test/games.unit.test.js`, com mock sockets para isolamento. Demonstrar obrigatoriamente o ciclo RED → GREEN com dois commits sequenciais: o primeiro adiciona testes que chamam `Game.prototype.getPlayerCount` (inexistente → CI falha); o segundo implementa o método em `games.js` (CI passa).

## Technical Context

**Language/Version**: Node.js 18 LTS; CommonJS.

**CI Platform**: GitLab CI — arquivo `.gitlab-ci.yml` na raiz.
**CI Image**: `node:18-alpine` (herdado do `default` já configurado).

**Test Tool**: Jest v29 (já instalado como devDependency em `server/package.json`).
**Novas dependências**: Nenhuma — Jest e socket.io-client já estão instalados.

**Novo método em `games.js`**:
- `Game.prototype.getPlayerCount()` → `number` (retorna `this._players.length`)

**Novo arquivo de teste**:
- `server/test/games.unit.test.js` — testa `GameCollection` (CRUD) e `Game` (addPlayer + getPlayerCount) com mock sockets isolados.

## Constitution Check

| Princípio | Status | Justificativa |
|-----------|--------|---------------|
| I — Incremental & Atomic Delivery | ✅ PASS | Commits separados: specs → CI stage → RED test → GREEN fix → docs. |
| II — Environment Parity via Containers | ✅ PASS | CI usa `node:18-alpine`; mesma versão Node do Dockerfile. |
| III — Test- & Quality-Gated Changes | ✅ PASS | O ciclo RED→GREEN é a demonstração central desta fase. |
| IV — Security by Default | ✅ PASS | Sem credenciais no pipeline; testes isolados, sem dependências externas. |
| V — Documentation as a Deliverable | ✅ PASS | ComoRodar.md atualizado com seção de testes unitários. |

## Project Structure

### Documentation (this feature)

```text
specs/005-ci-unit-tests/
├── plan.md              # Este arquivo
├── spec.md              # Especificação completa
├── research.md          # Decisões: Jest, mock sockets, posição do estágio
├── data-model.md        # Entidades testadas e estrutura do pipeline
├── quickstart.md        # Como executar os testes localmente e no GitLab
├── contracts/
│   └── ci-test-pipeline.md  # Contrato: job test:unit, garantias, interface
└── checklists/
    └── requirements.md  # Checklist de qualidade
```

### Source Code Changes

```text
/
├── .gitlab-ci.yml                    # ATUALIZADO: adicionar stage test e job test:unit
├── server/
│   ├── games.js                      # ATUALIZADO: adicionar Game.prototype.getPlayerCount
│   └── test/
│       └── games.unit.test.js        # NOVO: testes unitários para GameCollection e Game
└── ComoRodar.md                      # ATUALIZADO: seção CI — Testes Unitários
```

## Commit Map

| Commit | Arquivo(s) | Mensagem | Estado CI |
|--------|-----------|----------|-----------|
| 1 | `specs/005-ci-unit-tests/` | `docs: add specs and planning docs for ci-unit-tests phase` | — |
| 2 | `.gitlab-ci.yml` | `ci: add test stage to gitlab-ci.yml` | verde (testes existentes passam) |
| 3 | `server/test/games.unit.test.js` | `test: add failing unit tests for Game.getPlayerCount` | **VERMELHO** |
| 4 | `server/games.js` | `feat(games): implement Game.getPlayerCount` | **VERDE** |
| 5 | `ComoRodar.md` | `docs: update ComoRodar.md with unit tests section` | verde |
