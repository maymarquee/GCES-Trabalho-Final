# Implementation Plan: Docker Compose DEV com Persistência em Postgres

**Branch**: `003-docker-compose-dev` | **Date**: 2026-06-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-docker-compose-dev/spec.md`

## Summary

Estender o ambiente de desenvolvimento containerizado (Fase 1) com um `docker-compose.yml`
que sobe a aplicação mk.js e um serviço PostgreSQL 16-Alpine com um único comando.
O servidor Node.js recebe o módulo `server/db.js` (node-postgres Pool) e grava um
registro na tabela `matches` a cada partida finalizada em `games.js`. Uma rota
`GET /api/matches` expõe o histórico. Hot-reload via nodemon é preservado. Dados
sobrevivem a `docker compose down` via volume nomeado `postgres_data`.

## Technical Context

**Language/Version**: Node.js 18 LTS (já declarado em `server/package.json`).

**Primary Dependencies (produção)**: `express@^4.21`, `socket.io@^4.8`.
**Nova dependência adicionada**: `pg@^8` (node-postgres) — driver oficial PostgreSQL.
**DevDependency**: `nodemon@^3` (já presente).

**Storage**: PostgreSQL 16-Alpine via Docker Compose. Schema: tabela `matches`
com `id`, `game_name`, `player1_id`, `player2_id`, `winner`, `created_at`.
Ver [data-model.md](./data-model.md) para schema SQL completo.

**Testing**: Jest (já configurado). Novo módulo `server/db.js` receberá testes
unitários com mock de `pg.Pool`. Testes existentes de `games.js` são atualizados
para injetar um `db` stub (null).

**Target Platform**: Docker Compose stack (Linux containers). Docker Desktop Windows/macOS
com bind mounts usando `legacyWatch` no nodemon (já configurado via `nodemon.json`).

**Project Type**: Web service + arquivos estáticos (relay Socket.io + front-end
HTML/CSS/JS servido pelo Express).

**Performance Goals**: Inserção de partida em ≤ 5 s após término (SC-003).
Query de histórico em < 500 ms para uso típico em dev.

**Constraints**: Único comando para subir o stack completo; hot-reload preservado;
credenciais apenas via env vars, sem hardcode; `depends_on: service_healthy`
garante que app não inicia antes do Postgres aceitar conexões.

**Scale/Scope**: Ambiente local de desenvolvimento para um único desenvolvedor;
sem requisitos de escalabilidade nesta fase.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Justificativa |
|-----------|--------|---------------|
| I — Incremental & Atomic Delivery | ✅ PASS | Um commit por artefato: pg dependency, db.js, init.sql, docker-compose.yml, games.js/server.js, env, docs. Commits espaçados no tempo. |
| II — Environment Parity via Containers | ✅ PASS | É o objetivo direto: docker-compose.yml com hot-reload + Postgres como serviço declarado. |
| III — Test- & Quality-Gated Changes | ✅ PASS | Novo módulo db.js terá testes Jest com mock de Pool; games.js atualizado com stub de db. CI ainda não existe (Fase 3), mas testes rodam localmente com `npm test`. |
| IV — Security by Default | ✅ PASS | Credenciais via env vars (.env não rastreado); imagem oficial postgres:16-alpine; sem portas desnecessárias. |
| V — Documentation as a Deliverable | ✅ PASS | ComoRodar.md atualizado no mesmo commit ou imediatamente adjacente às mudanças funcionais. |

Sem violações — prosseguir para Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/003-docker-compose-dev/
├── plan.md              # Este arquivo
├── research.md          # Decisões: pg, init.sql, endGame hook, health check
├── data-model.md        # Entidade: Match; Config de ambiente
├── quickstart.md        # 5 cenários de validação end-to-end
├── contracts/
│   └── compose-stack.md # Serviços, volumes, env vars, rota GET /api/matches
└── tasks.md             # Gerado por /speckit-tasks
```

### Source Code (repository root)

```text
/                               # raiz do repositório
├── docker-compose.yml          # NOVO: orquestra app + db com hot-reload e healthcheck
├── .env.example                # ATUALIZADO: acrescenta PGUSER, PGPASSWORD, PGDATABASE, DB_HOST_PORT
├── ComoRodar.md                # ATUALIZADO: seção "Docker Compose DEV"
└── server/
    ├── package.json            # ATUALIZADO: add pg@^8 em dependencies
    ├── package-lock.json       # ATUALIZADO: após npm install
    ├── server.js               # ATUALIZADO: inicializa db, passa para GameCollection, add rota GET /api/matches
    ├── games.js                # ATUALIZADO: Game/GameCollection aceitam db, chama db.saveMatch em endGame
    ├── db.js                   # NOVO: Pool pg, saveMatch(), getMatches()
    └── db/
        └── init.sql            # NOVO: CREATE TABLE IF NOT EXISTS matches (...)
```

**Structure Decision**: `docker-compose.yml` na raiz para ter visibilidade de
`Dockerfile`, `server/` e `game/`. `server/db.js` mantém a camada de persistência
no mesmo pacote do servidor. `server/db/init.sql` coloca o schema SQL próximo ao
código que o usa, montado no container Postgres via volume bind read-only.

## Complexity Tracking

> Sem violações de constituição a justificar.
