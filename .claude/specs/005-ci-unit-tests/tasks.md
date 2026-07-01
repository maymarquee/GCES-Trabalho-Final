# Tasks: CI — Testes Unitários

**Input**: Design documents from `/specs/005-ci-unit-tests/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Organization**: Tarefas agrupadas por fase de entrega incremental.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story correspondente (US1, US2, US3, US4)

---

## Phase 1: Documentação e Specs

**Purpose**: Criar os artefatos de especificação antes de qualquer código.

- [x] T001 Criar `specs/005-ci-unit-tests/` com spec.md, plan.md, tasks.md, research.md, data-model.md, quickstart.md, contracts/ci-test-pipeline.md, checklists/requirements.md

**Checkpoint**: Diretório `specs/005-ci-unit-tests/` criado com todos os arquivos de documentação.

---

## Phase 2: CI Pipeline — Estágio test

**Purpose**: Adicionar o estágio `test` ao `.gitlab-ci.yml`.

- [ ] T002 [US1] Atualizar `.gitlab-ci.yml`: adicionar `test` à lista `stages`; adicionar job `test:unit` com `stage: test`, `needs: [{job: build, artifacts: true}]`, `script: [cd server && npm test]`

**Checkpoint**: `.gitlab-ci.yml` válido com 4 jobs; push para GitLab mostra pipeline com `test:unit` passando (testes existentes passam).

---

## Phase 3: Teste Falhando (RED)

**Purpose**: Adicionar testes unitários incluindo `getPlayerCount` que falha no CI porque o método não existe.

- [ ] T003 [US2, US3] Criar `server/test/games.unit.test.js` com: testes de CRUD do `GameCollection` (createGame, getGame, removeGame), testes de `Game.addPlayer` com mock sockets, e testes de `Game.getPlayerCount` que falham porque o método não existe

**Checkpoint**: Push para GitLab → job `test:unit` falha com `TypeError: game.getPlayerCount is not a function`; os outros jobs (build, lint) continuam passando.

---

## Phase 4: Correção (GREEN)

**Purpose**: Implementar `Game.prototype.getPlayerCount` para fazer os testes passarem.

- [ ] T004 [US2] Atualizar `server/games.js`: adicionar `Game.prototype.getPlayerCount = function () { return this._players.length; }` logo após `Game.prototype.addPlayer`

**Checkpoint**: Push para GitLab → todos os jobs passam incluindo `test:unit`; log do Jest mostra todos os testes em verde.

---

## Phase 5: Documentação Final

**Purpose**: Atualizar ComoRodar.md com a seção de testes unitários.

- [ ] T005 [P] [US4] Atualizar `ComoRodar.md`: adicionar seção "CI — Testes Unitários" documentando `npm test`, execução de arquivo específico, e onde ver os resultados no GitLab

**Checkpoint**: `ComoRodar.md` atualizado com instruções de execução local dos testes.

---

## Dependencies & Execution Order

- **Phase 1**: Sem dependências — pode começar imediatamente
- **Phase 2**: Sem dependências de código — apenas `.gitlab-ci.yml`
- **Phase 3**: Depende de T002 (estágio test deve existir para ver o CI falhar)
- **Phase 4**: Depende de T003 (deve existir o teste para ver o CI passar)
- **Phase 5**: Pode rodar em paralelo com T003/T004

---

## Commit Map

| Commit | Tarefas | Mensagem | CI esperado |
|--------|---------|----------|-------------|
| 1 | T001 | `docs: add specs and planning docs for ci-unit-tests phase` | — |
| 2 | T002 | `ci: add test stage to gitlab-ci.yml` | verde |
| 3 | T003 | `test: add failing unit tests for Game.getPlayerCount` | **vermelho** |
| 4 | T004 | `feat(games): implement Game.getPlayerCount` | **verde** |
| 5 | T005 | `docs: update ComoRodar.md with unit tests section` | verde |
