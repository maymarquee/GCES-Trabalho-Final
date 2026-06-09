# Tasks: Docker Compose DEV com Persistência em Postgres

**Input**: Design documents from `/specs/003-docker-compose-dev/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Organization**: Tarefas agrupadas por User Story para entrega incremental independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story correspondente (US1, US2, US3, US4)

---

## Phase 1: Setup (Dependências e Estrutura Compartilhada)

**Purpose**: Preparar dependências e estrutura de diretórios que todos os artefatos precisam.

- [x] T001 Adicionar `pg@^8` em `dependencies` de `server/package.json` e rodar `npm install` dentro de `server/` para atualizar `server/package-lock.json`
- [x] T002 [P] Criar diretório `server/db/` (container para init.sql e futuros scripts de banco)

---

## Phase 2: Foundational (Pré-requisitos que bloqueiam todas as US)

**Purpose**: Módulo de banco de dados e schema SQL que todas as User Stories dependem.

**⚠️ CRITICAL**: Nenhuma User Story pode ser validada antes deste artefato estar completo.

- [x] T003 Criar `server/db/init.sql` com `CREATE TABLE IF NOT EXISTS matches (id SERIAL PRIMARY KEY, game_name VARCHAR(100) NOT NULL, player1_id VARCHAR(100) NOT NULL, player2_id VARCHAR(100) NOT NULL, winner SMALLINT CHECK (winner IN (1, 2)), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())` — schema conforme `specs/003-docker-compose-dev/data-model.md`
- [x] T004 Criar `server/db.js` com: `const { Pool } = require('pg')`, pool instanciado com env vars (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`), função `async saveMatch(gameName, player1Id, player2Id, winner)` que executa INSERT na tabela matches, função `async getMatches()` que retorna todos os registros em ordem DESC por `created_at`, e `module.exports = { saveMatch, getMatches, pool }`
- [x] T005 [P] Atualizar `.env.example` na raiz: acrescentar variáveis `DB_HOST_PORT=5432`, `PGUSER=mkjs`, `PGPASSWORD=mkjs`, `PGDATABASE=mkjs` mantendo `HOST_PORT=55555` já existente

**Checkpoint**: `server/db.js` e `server/db/init.sql` criados; `npm test` continua passando (db.js não altera lógica existente).

---

## Phase 3: User Story 1 — Ambiente completo com único comando (Priority: P1) 🎯 MVP

**Goal**: `docker compose up` sobe aplicação + Postgres; jogo acessível em `http://localhost:55555`.

**Independent Test**: Executar `docker compose up`, aguardar logs de ready, abrir `http://localhost:55555` no navegador e verificar que o jogo carrega; jogar uma partida em rede entre duas abas.

### Implementação para User Story 1

- [x] T006 [US1] Criar `docker-compose.yml` na raiz com serviço `app`: `build: .`, `ports: ["${HOST_PORT:-55555}:55555"]`, `volumes: [./server:/app/server, ./game:/app/game, ./nodemon.json:/app/nodemon.json, node_modules:/app/server/node_modules]`, `environment: [PGHOST=db, PGPORT=5432, PGUSER=${PGUSER:-mkjs}, PGPASSWORD=${PGPASSWORD:-mkjs}, PGDATABASE=${PGDATABASE:-mkjs}]`, `depends_on: {db: {condition: service_healthy}}`
- [x] T007 [US1] Adicionar serviço `db` ao `docker-compose.yml`: `image: postgres:16-alpine`, `ports: ["${DB_HOST_PORT:-5432}:5432"]`, `environment: [POSTGRES_USER=${PGUSER:-mkjs}, POSTGRES_PASSWORD=${PGPASSWORD:-mkjs}, POSTGRES_DB=${PGDATABASE:-mkjs}]`, `volumes: [postgres_data:/var/lib/postgresql/data, ./server/db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro]`, `healthcheck: {test: ["CMD-SHELL", "pg_isready -U ${PGUSER:-mkjs}"], interval: 5s, timeout: 5s, retries: 5}`
- [x] T008 [US1] Adicionar seção `volumes` de nível superior ao `docker-compose.yml` declarando `postgres_data: {}` e `node_modules: {}`

**Checkpoint**: `docker compose up` → logs mostram `Server listening on port 55555`; `http://localhost:55555` carrega o jogo; partida em rede funciona entre duas abas (US1 validada).

---

## Phase 4: User Story 2 — Registro automático de partidas no banco (Priority: P2)

**Goal**: Ao término de uma partida, um registro é inserido automaticamente na tabela `matches` do Postgres.

**Independent Test**: Completar uma partida em rede (US1 em execução), depois executar `curl http://localhost:55555/api/matches` ou `docker compose exec db psql -U mkjs -d mkjs -c "SELECT * FROM matches;"` e verificar que um registro foi inserido com os dados corretos.

### Testes para User Story 2

- [x] T009 [P] [US2] Criar `server/test/db.test.js` com testes Jest para `server/db.js`: mockar `pg` com `jest.mock('pg')`, verificar que `saveMatch` chama `pool.query` com os parâmetros corretos (INSERT com 4 argumentos), verificar que `getMatches` chama `pool.query` com SELECT e retorna `result.rows`

### Implementação para User Story 2

- [x] T010 [US2] Atualizar `server/games.js`: modificar construtor `Game(id, gameCollection, db)` para aceitar terceiro parâmetro `db`; no método `endGame`, antes de limpar `this._players`, capturar `player1Id = this._players[0].id`, `player2Id = this._players[1].id`, `winner = +!playerOut + 1`, e chamar `this._db && this._db.saveMatch(this._id, player1Id, player2Id, winner).catch(err => console.error('[db] save match failed:', err.message))` — db é opcional (null safe) para não quebrar testes existentes
- [x] T011 [US2] Atualizar `server/games.js`: modificar construtor `GameCollection(db)` para aceitar parâmetro `db` opcional, armazená-lo em `this._db = db || null`, e passá-lo para `new Game(id, this, this._db)` em `createGame`
- [x] T012 [US2] Atualizar `server/server.js`: adicionar `var db = require('./db')` no topo, alterar `new GameCollection()` para `new GameCollection(db)`

**Checkpoint**: Jogar uma partida via `docker compose up` → `GET /api/matches` ou psql mostra o registro inserido (US2 validada). `npm test` continua passando (testes existentes usam `new GameCollection()` sem db).

---

## Phase 5: User Story 3 — Hot-reload preservado no ambiente composto (Priority: P3)

**Goal**: Alterações em `server/` reiniciam o servidor automaticamente no ambiente Compose; alterações em `game/` ficam disponíveis ao recarregar a página.

**Independent Test**: Com `docker compose up` em execução, editar `server/server.js` (ex: adicionar `console.log('hot-reload ok')`), salvar e observar nos logs que o nodemon reinicia em ≤ 3 s sem nenhum comando extra.

### Implementação para User Story 3

- [x] T013 [US3] Verificar que o `docker-compose.yml` criado em T006 monta `./nodemon.json:/app/nodemon.json` como volume (garante que a config de `legacyWatch` do nodemon está presente no container Compose, tal como na fase anterior)

> US3 não requer novos arquivos — o hot-reload é garantido pelos volumes bind-mount de `server/` e `game/` já declarados em T006 e pelo `nodemon.json` existente. Esta fase é uma tarefa de verificação explícita.

**Checkpoint**: Editar `server/server.js` com o ambiente Compose rodando → nodemon exibe `restarting due to changes` em ≤ 3 s nos logs (US3 validada).

---

## Phase 6: User Story 4 — Rota de histórico de partidas (Priority: P4)

**Goal**: `GET /api/matches` retorna JSON com a lista de partidas registradas no banco.

**Independent Test**: Com o ambiente em execução e ao menos uma partida registrada, executar `curl http://localhost:55555/api/matches` e verificar que a resposta é um array JSON com os campos `id`, `game_name`, `player1_id`, `player2_id`, `winner`, `created_at`.

### Implementação para User Story 4

- [x] T014 [US4] Adicionar rota `app.get('/api/matches', async function(req, res) { try { var matches = await db.getMatches(); res.json(matches); } catch (err) { console.error('[api] getMatches failed:', err.message); res.status(500).json({ error: 'Failed to retrieve matches' }); } })` em `server/server.js` — antes de `server.listen()`

**Checkpoint**: `curl http://localhost:55555/api/matches` retorna `[]` (banco vazio) ou lista de registros após partidas; resposta Content-Type é `application/json` (US4 validada).

---

## Phase 7: Polish & Validação Final

**Purpose**: Documentação atualizada e todos os cenários do quickstart validados.

- [x] T015 [P] Atualizar `ComoRodar.md`: adicionar seção "Docker Compose DEV" com os comandos `docker compose up`, `docker compose down`, `docker compose down -v` (reset), `docker compose up --build` (rebuild após novas deps), e `curl http://localhost:55555/api/matches` para consultar histórico
- [x] T016 [P] Executar os 5 cenários de validação de `specs/003-docker-compose-dev/quickstart.md` e registrar resultados
- [x] T017 Revisar consistência entre `docker-compose.yml`, `.env.example` e `ComoRodar.md` (portas, variáveis, comandos)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sem dependências — pode começar imediatamente
- **Phase 2 (Foundational)**: T003 depende de T002; T004 depende de T001; T005 é independente [P]
- **Phase 3 (US1)**: Depende de T003 e T004 (init.sql e db.js devem existir antes do Compose)
- **Phase 4 (US2)**: Depende de T004 (db.js) e T006-T008 (compose rodando para testar end-to-end)
- **Phase 5 (US3)**: Depende de T006-T008 (compose rodando)
- **Phase 6 (US4)**: Depende de T004 (db.js) e T012 (server.js já importa db)
- **Phase 7 (Polish)**: Depende de todas as fases anteriores

### User Story Dependencies

- **US1 (P1)**: Pode iniciar após Phase 2 (Foundational)
- **US2 (P2)**: Pode iniciar após US1 (precisa do Compose para teste end-to-end)
- **US3 (P3)**: Pode iniciar após US1 (precisa do Compose)
- **US4 (P4)**: Pode iniciar em paralelo com US2 (T014 depende apenas de T012)

### Parallel Opportunities

- T002 e T005 podem rodar em paralelo com T001 (arquivos diferentes)
- T003 (init.sql) e T004 (db.js) podem rodar em paralelo após seus pré-requisitos
- T009 (test db.js) pode rodar em paralelo com T010-T012 (arquivo diferente)
- T015, T016 e T017 podem rodar em paralelo na fase de polish

---

## Commit Map (Guia de Atomicidade)

| Commit | Tarefas | Mensagem sugerida |
|--------|---------|-------------------|
| 1 | T001 | `chore(server): add pg dependency for Postgres connection` |
| 2 | T002, T003 | `feat(server): add db init SQL schema for matches table` |
| 3 | T004 | `feat(server): add db module with Pool, saveMatch and getMatches` |
| 4 | T009 | `test(server): add unit tests for db module with pg mock` |
| 5 | T010, T011 | `feat(server): wire db into GameCollection to record match ends` |
| 6 | T012 | `feat(server): initialize db in server.js and pass to GameCollection` |
| 7 | T014 | `feat(server): add GET /api/matches route for match history` |
| 8 | T005, T006, T007, T008 | `feat: add docker-compose.yml with Postgres service and healthcheck` |
| 9 | T013 | `chore: verify nodemon.json volume mount in docker-compose` |
| 10 | T015 | `docs: update ComoRodar.md with Docker Compose DEV section` |
| 11 | T016, T017 | `chore: validate quickstart scenarios and docs consistency` |

---

## Implementation Strategy

### MVP (User Story 1 — Jogo acessível via Compose)

1. Completar Phase 1: Setup (T001, T002)
2. Completar Phase 2: Foundational (T003, T004, T005) — **crítico**
3. Completar Phase 3: US1 (T006, T007, T008)
4. **VALIDAR**: `docker compose up` → jogo no navegador → partida em rede funciona
5. Avançar para Phase 4 (persistência) e Phase 6 (rota de histórico)

### Incremental Delivery

1. Setup + Foundational → dependências e módulo de banco prontos
2. US1 → ambiente Compose funcional (MVP desta fase!)
3. US2 → persistência automática de partidas
4. US3 → confirmação de hot-reload (validação, sem código novo)
5. US4 → rota de consulta do histórico
6. Polish → documentação e validação final

---

## Notes

- `games.js` recebe `db` como parâmetro opcional — `new GameCollection()` sem argumentos continua funcionando, garantindo compatibilidade com `server/test/matchmaking.test.js` existente sem alteração
- O volume `node_modules` nomeado no Compose sobrepõe o bind-mount de `server/` em `/app/server/node_modules` — mesma estratégia da fase anterior, agora declarada no Compose
- `init.sql` usa `CREATE TABLE IF NOT EXISTS` — o script é idempotente; só cria a tabela se o volume for novo (primeiro `docker compose up`)
- `legacyWatch: true` no `nodemon.json` já existente garante hot-reload via polling em Docker Desktop (Windows/macOS)
- Erros de banco em `saveMatch` são capturados e logados sem derrubar o servidor — a jogabilidade não depende da persistência
