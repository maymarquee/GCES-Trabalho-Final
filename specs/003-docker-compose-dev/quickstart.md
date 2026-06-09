# Quickstart: Docker Compose DEV — Validação End-to-End

**Feature**: `003-docker-compose-dev` | **Date**: 2026-06-08

---

## Pré-requisitos

- Docker Desktop (ou Docker Engine + Compose v2) instalado e em execução.
- Repositório clonado. Nenhum outro pré-requisito de runtime no host.

---

## Setup Inicial

```bash
# 1. Copiar .env.example para .env (opcional; valores padrão já funcionam)
cp .env.example .env

# 2. Subir o ambiente
docker compose up
```

Aguardar até ver nos logs algo como:
```
app  | [nodemon] starting `node server/server.js`
app  | Server listening on port 55555
```

---

## Cenário 1 — Ambiente sobe e jogo está acessível (SC-001)

1. Com `docker compose up` em execução, abrir `http://localhost:55555` no navegador.
2. **Esperado**: Página do jogo mk.js carrega sem erros.
3. Abrir uma segunda aba, iniciar partida em rede com o mesmo nome em ambas as abas.
4. **Esperado**: Jogo começa normalmente, igual ao comportamento sem Docker.

---

## Cenário 2 — Persistência de partidas (SC-003 e FR-004)

1. Com o ambiente em execução, jogar uma partida em rede completa (dois jogadores/abas, aguardar desconexão ou deixar uma aba fechar).
2. Consultar o histórico:
   ```bash
   curl http://localhost:55555/api/matches
   ```
3. **Esperado**: Resposta JSON com ao menos um registro contendo `game_name`, `player1_id`, `player2_id`, `winner`, `created_at`.
4. Alternativamente, acessar o banco diretamente:
   ```bash
   docker compose exec db psql -U mkjs -d mkjs -c "SELECT * FROM matches;"
   ```

---

## Cenário 3 — Dados sobrevivem ao restart (SC-004)

1. Após inserir ao menos uma partida (Cenário 2), executar:
   ```bash
   docker compose down
   docker compose up
   ```
2. Consultar novamente:
   ```bash
   curl http://localhost:55555/api/matches
   ```
3. **Esperado**: Partidas registradas antes do `down` continuam presentes.

---

## Cenário 4 — Hot-reload preservado (SC-005)

1. Com `docker compose up` rodando, editar `server/server.js` (ex: adicionar `console.log('hot-reload test')`).
2. Salvar o arquivo.
3. Observar os logs do terminal.
4. **Esperado**: nodemon detecta a mudança em ≤ 3 s e reinicia o servidor sem nenhum comando adicional.

---

## Cenário 5 — Reset completo do banco

```bash
docker compose down -v   # Remove volumes (dados apagados)
docker compose up        # Recria tabelas via init.sql
```

**Esperado**: `GET /api/matches` retorna array vazio `[]`.

---

## Referências

- Schema da tabela: [data-model.md](./data-model.md)
- Contrato do Compose stack: [contracts/compose-stack.md](./contracts/compose-stack.md)
- Documentação de uso: `ComoRodar.md` (seção "Docker Compose DEV")
