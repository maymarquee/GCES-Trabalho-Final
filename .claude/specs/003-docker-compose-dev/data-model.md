# Data Model: Docker Compose DEV com Persistência em Postgres

**Feature**: `003-docker-compose-dev` | **Date**: 2026-06-08

---

## Entidade: Match (Partida)

Representa uma partida de rede finalizada entre dois jogadores.

### Campos

| Campo       | Tipo            | Restrições                     | Descrição |
|-------------|-----------------|-------------------------------|-----------|
| `id`        | `SERIAL`        | PRIMARY KEY                   | Identificador auto-incremental da partida |
| `game_name` | `VARCHAR(100)`  | NOT NULL                      | Nome da sala/partida (mesmo usado nos eventos `create-game`/`join-game`) |
| `player1_id`| `VARCHAR(100)`  | NOT NULL                      | Identificador do jogador que criou a partida (socket ID) |
| `player2_id`| `VARCHAR(100)`  | NOT NULL                      | Identificador do jogador que entrou na partida (socket ID) |
| `winner`    | `SMALLINT`      | CHECK (winner IN (1, 2)), NULL| Qual jogador venceu: 1 = player1, 2 = player2. NULL se indeterminado |
| `created_at`| `TIMESTAMPTZ`   | DEFAULT NOW(), NOT NULL       | Data e hora (com fuso) em que o registro foi inserido |

### Regras de Validação

- `game_name`, `player1_id` e `player2_id` são obrigatórios (NOT NULL, NOT EMPTY).
- `winner` pode ser NULL nos casos em que ambos desconectam simultaneamente ou o resultado não é determinável pelo servidor.
- `created_at` é definido pelo banco na inserção; o servidor não envia este valor.

### Transições de Estado

A entidade é write-once: uma partida é inserida uma única vez ao término da sessão no relay. Não há atualização posterior de registros existentes.

---

## Entidade: Configuração do Ambiente (Environment Config)

Representa o conjunto de variáveis de ambiente que configuram os serviços do Compose. Não é uma entidade persistida; existe como contrato de configuração entre o host e os containers.

| Variável       | Padrão       | Usado em          | Descrição |
|----------------|--------------|-------------------|-----------|
| `HOST_PORT`    | `55555`      | `docker-compose.yml` (app) | Porta publicada no host para o serviço da aplicação |
| `PGHOST`       | `db`         | `server/db.js`    | Hostname do servidor Postgres (nome do serviço Compose) |
| `PGPORT`       | `5432`       | `server/db.js`    | Porta do servidor Postgres |
| `PGUSER`       | `mkjs`       | Postgres + app    | Usuário do banco de dados |
| `PGPASSWORD`   | `mkjs`       | Postgres + app    | Senha do banco de dados |
| `PGDATABASE`   | `mkjs`       | Postgres + app    | Nome do banco de dados |
| `DB_HOST_PORT` | `5432`       | `docker-compose.yml` (db) | Porta do Postgres publicada no host (para acesso externo em dev) |

> **Nota de segurança**: Os valores padrão são exclusivos para o ambiente de desenvolvimento local. Em produção (Fase 8+), todas essas variáveis devem ser injetadas via secrets/vault, nunca via `.env` commitado.

---

## Schema SQL

```sql
-- server/db/init.sql
-- Executado automaticamente pelo Postgres na primeira inicialização do volume.

CREATE TABLE IF NOT EXISTS matches (
  id         SERIAL PRIMARY KEY,
  game_name  VARCHAR(100) NOT NULL,
  player1_id VARCHAR(100) NOT NULL,
  player2_id VARCHAR(100) NOT NULL,
  winner     SMALLINT     CHECK (winner IN (1, 2)),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```
