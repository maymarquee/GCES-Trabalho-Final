# Contract: Docker Compose Stack (DEV)

**Feature**: `003-docker-compose-dev` | **Date**: 2026-06-08

---

## Serviços

### `app` — Aplicação mk.js

| Propriedade    | Valor |
|----------------|-------|
| Build context  | `.` (raiz do repositório; usa o `Dockerfile` existente) |
| Porta host     | `${HOST_PORT:-55555}` → `55555` (interna) |
| Volumes        | `./server:/app/server`, `./game:/app/game`, `./nodemon.json:/app/nodemon.json`, `node_modules:/app/server/node_modules` |
| Depends on     | `db` com `condition: service_healthy` |
| Env vars       | `PGHOST=db`, `PGPORT=5432`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` |

### `db` — PostgreSQL

| Propriedade    | Valor |
|----------------|-------|
| Image          | `postgres:16-alpine` |
| Porta host     | `${DB_HOST_PORT:-5432}` → `5432` (interna) |
| Volumes        | `postgres_data:/var/lib/postgresql/data`, `./server/db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro` |
| Env vars       | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` |
| Health check   | `pg_isready -U ${PGUSER:-mkjs}` — interval 5s, timeout 5s, retries 5 |

---

## Volumes Nomeados

| Volume         | Propósito |
|----------------|-----------|
| `postgres_data`| Persiste os dados do Postgres entre `docker compose down`/`up` |
| `node_modules` | Isola `node_modules` Linux do host (Windows/macOS incompatível) |

---

## Variáveis de Ambiente (.env.example)

```dotenv
# Porta da aplicação no host
HOST_PORT=55555

# Porta do Postgres no host (acesso via psql ou pgAdmin em dev)
DB_HOST_PORT=5432

# Credenciais Postgres
PGUSER=mkjs
PGPASSWORD=mkjs
PGDATABASE=mkjs
```

> Copiar `.env.example` → `.env` para personalizar. `.env` não é rastreado pelo Git.

---

## Rotas HTTP adicionadas ao servidor

### `GET /api/matches`

Retorna o histórico de partidas registradas no banco, em ordem cronológica decrescente.

**Response 200 OK**
```json
[
  {
    "id": 42,
    "game_name": "sala1",
    "player1_id": "abc123",
    "player2_id": "def456",
    "winner": 1,
    "created_at": "2026-06-08T15:30:00.000Z"
  }
]
```

**Response 500 Internal Server Error** (falha de banco)
```json
{ "error": "Failed to retrieve matches" }
```

---

## Contrato de Inicialização

1. `docker compose up` inicia `db` primeiro.
2. O serviço `db` passa no health check (`pg_isready`) antes de `app` iniciar.
3. Na primeira subida com volume vazio, o Postgres executa `init.sql` e cria a tabela `matches`.
4. O servidor `app` conecta ao Postgres via `Pool` usando as env vars injetadas.
5. O servidor está pronto quando os logs mostram o endereço de escuta (`55555`).

---

## Ciclo de Vida do Volume de Dados

| Comando                              | Efeito nos dados |
|--------------------------------------|-----------------|
| `docker compose up`                  | Sobe com dados existentes no volume `postgres_data` |
| `docker compose down`                | Para containers, **preserva** volumes |
| `docker compose down -v`             | Para containers e **remove** volumes (reset completo) |
| `docker compose up --build`          | Reconstrói imagem `app` (para novas deps), **preserva** dados |
