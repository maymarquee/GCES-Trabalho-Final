# Data Model: CI — Testes Unitários

**Branch**: `005-ci-unit-tests` | **Date**: 2026-06-09

## Estrutura do Pipeline (atualizada)

```
stages: [build, lint, test]

build
  └─ artifacts: server/node_modules/ (expire_in: 1h)

lint
  ├─ lint:back  (needs: build)
  └─ lint:front (needs: build)

test
  └─ test:unit  (needs: build)
```

## Entidades Testadas

### `GameCollection`

| Método | Comportamento esperado | Teste |
|--------|------------------------|-------|
| `createGame(id)` | Retorna `true` e cria jogo se id não existe | `creates new game → true` |
| `createGame(id)` | Retorna `false` se id já existe | `duplicate name → false` |
| `getGame(id)` | Retorna instância de `Game` após `createGame` | `returns game after creation` |
| `getGame(id)` | Retorna `undefined` se jogo não existe | `returns undefined for unknown` |
| `removeGame(id)` | Remove jogo e retorna `true` | `removes existing game → true` |
| `removeGame(id)` | Retorna `false` se jogo não existe | `unknown game → false` |

### `Game`

| Método | Comportamento esperado | Teste |
|--------|------------------------|-------|
| `addPlayer(socket)` | Aceita até 2 jogadores; retorna `true` | `accepts two players` |
| `addPlayer(socket)` | Rejeita 3º jogador; retorna `false` | `rejects third player` |
| `getPlayerCount()` | Retorna `0` para jogo recém-criado | `count is 0 initially` (RED → GREEN) |
| `getPlayerCount()` | Retorna `1` após 1 jogador adicionado | `count is 1 after one player` (RED → GREEN) |
| `getPlayerCount()` | Retorna `2` após 2 jogadores adicionados | `count is 2 after two players` (RED → GREEN) |

## Mock Socket

Objeto mínimo que satisfaz a interface esperada por `Game._addHandlers`:

```javascript
function makeSocket(id) {
  return {
    id: id || ('socket-' + Math.random().toString(36).slice(2)),
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn()
  };
}
```

## Arquivos Modificados/Criados

| Arquivo | Ação | Fase |
|---------|------|------|
| `.gitlab-ci.yml` | Adicionar estágio `test` e job `test:unit` | Commit 2 |
| `server/test/games.unit.test.js` | Criar com testes incluindo `getPlayerCount` (RED) | Commit 3 |
| `server/games.js` | Adicionar `Game.prototype.getPlayerCount` (GREEN) | Commit 4 |
| `ComoRodar.md` | Adicionar seção "CI — Testes Unitários" | Commit 5 |
| `specs/005-ci-unit-tests/` | Criar documentação da fase | Commit 1 |
