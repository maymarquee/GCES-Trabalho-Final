# Research: Docker Compose DEV com Persistência em Postgres

**Feature**: `003-docker-compose-dev` | **Date**: 2026-06-08

---

## Decisão 1 — Driver de conexão ao PostgreSQL

**Decision**: `pg` (node-postgres) v8.x
**Rationale**: Driver oficial, amplamente adotado, sem ORM overhead. Fornece `Pool` para reutilização de conexões. Suficiente para o volume mínimo desta fase (inserções e consultas simples). A interface é Promise-based nativa, compatível com Node.js 18.
**Alternatives considered**:
- `Sequelize`/`TypeORM`: ORM muito mais pesado do que o necessário para 1 tabela e 2 queries.
- `knex`: Query builder útil para migrations, mas adiciona complexidade desnecessária para esta fase. Migrations formais ficam para uma fase futura.
- `postgres` (porsager): API mais moderna, mas `pg` é o padrão estabelecido no ecossistema Node.

---

## Decisão 2 — Inicialização do schema (migrations vs. init script)

**Decision**: Script SQL em `server/db/init.sql` montado em `/docker-entrypoint-initdb.d/` do container Postgres.
**Rationale**: O Postgres Alpine executa automaticamente todos os arquivos `.sql` em `/docker-entrypoint-initdb.d/` na primeira inicialização do volume. Nenhum tooling extra necessário. Uso de `CREATE TABLE IF NOT EXISTS` torna o script idempotente.
**Alternatives considered**:
- `db-migrate`/`node-pg-migrate`: Adequado para projetos de longa duração com schema em evolução; overkill para uma tabela nesta fase.
- `Flyway`/`Liquibase`: JVM-based, conflita com o ethos Node.js do projeto.
- Init inline no server.js: Mistura responsabilidades; o script SQL é mais limpo e pode ser versionado independentemente.

---

## Decisão 3 — Quando e como registrar uma partida

**Decision**: Registrar ao `endGame()` em `games.js`, usando os socket IDs das duas conexões como identificadores de jogador.
**Rationale**: O servidor é um relay puro — não recebe nomes de jogador do cliente. O evento `endGame` é o único ponto no ciclo de vida da partida onde ambos os jogadores estão conhecidos e o resultado (quem desconectou = perdedor) está determinado. Socket IDs são únicos por sessão e suficientes como identificadores de rastreamento.
**Alternatives considered**:
- Adicionar campo `playerName` no payload de `create-game`/`join-game`: Requereria mudança no `mk.js` do lado cliente — fora do escopo desta fase.
- Registrar apenas ao criar a partida: Não saberíamos o resultado nem quando a partida realmente terminaria.
- Gravar `gameName` (sala) como identificador: Já gravamos como `game_name`, junto com os socket IDs para rastreabilidade individual.

---

## Decisão 4 — Tratamento de erros de banco sem derrubar o servidor

**Decision**: Erros de banco em `saveMatch` são capturados com `.catch()` e logados no stderr; o servidor continua funcionando normalmente para a partida em curso.
**Rationale**: A persistência é um efeito colateral do jogo, não um requisito para a jogabilidade. Derrubar o processo por falha de banco seria uma regressão inaceitável no comportamento do servidor (vide SC-002 do spec).
**Alternatives considered**:
- Propagar o erro e encerrar o processo: Inaceitável — quebra o jogo inteiro por falha de log.
- Retry com backoff: Desnecessário para esta fase; a operação de inserção é idempotente em falha total (não insere nada), aceitável para um histórico best-effort.

---

## Decisão 5 — Imagem Postgres no Compose

**Decision**: `postgres:16-alpine`
**Rationale**: Alpine minimiza o tamanho da imagem de desenvolvimento. PostgreSQL 16 é a versão estável mais recente com suporte ativo. A imagem Alpine tem o entrypoint que executa `init.sql` automaticamente.
**Alternatives considered**:
- `postgres:latest`: Tag mutável — pode quebrar ambiente ao trocar versão major sem aviso.
- `postgres:16`: Versão completa (Debian-based); ~300 MB vs ~80 MB Alpine — overhead desnecessário em dev.

---

## Decisão 6 — Health check e dependência de serviço no Compose

**Decision**: `healthcheck` via `pg_isready -U mkjs` + `depends_on: db: condition: service_healthy` no serviço `app`.
**Rationale**: Sem health check, o `app` pode tentar conectar antes do Postgres aceitar conexões, causando falha na inicialização. `pg_isready` é o mecanismo oficial e já está disponível na imagem Alpine.
**Alternatives considered**:
- `wait-for-it.sh` / `dockerize`: Scripts externos adicionando complexidade; `service_healthy` resolve o problema de forma nativa.
- Retry no código Node.js: Aceitável como fallback, mas não substitui a dependência declarada no Compose — ambos podem coexistir.

---

## Decisão 7 — Volume para `node_modules` no Compose

**Decision**: Volume Docker nomeado `node_modules` montado em `/app/server/node_modules`, sobrepondo o bind-mount de `server/`.
**Rationale**: Padrão estabelecido: garante que o `node_modules` dentro do container (compilado para Linux) não seja sobrescrito pelo do host (Windows/macOS). Mesma decisão já tomada na fase anterior com o Dockerfile isolado; mantida no Compose para consistência.
**Alternatives considered**:
- Sem volume anônimo: `node_modules` do host (Windows) aparece dentro do container Linux → binários incompatíveis, crashes imediatos.
- Usar `.dockerignore` + COPY em vez de volumes: Perde o hot-reload do back-end, contradizendo FR-006.
