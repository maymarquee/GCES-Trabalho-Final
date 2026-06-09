# Data Model: CI — Testes de Fuzzing

**Branch**: `006-ci-fuzzing` | **Date**: 2026-06-09

## Estrutura do Pipeline (atualizada)

```
stages: [build, lint, test]

build
  └─ artifacts: server/node_modules/ (expire_in: 1h)

lint
  ├─ lint:back  (needs: build)
  └─ lint:front (needs: build)

test
  ├─ test:unit  (needs: build)   ← existente
  └─ test:fuzz  (needs: build)   ← NOVO
```

## Propriedades Testadas

### `GameCollection` — testes de resiliência (nunca lançam exceção)

| Método | Input gerado por | Runs | Expectativa |
|--------|-----------------|------|-------------|
| `createGame(id)` | `fc.anything()` | 300 | `not.toThrow()` |
| `getGame(id)` | `fc.anything()` | 300 | `not.toThrow()` |
| `removeGame(id)` | `fc.anything()` | 300 | `not.toThrow()` |

### `GameCollection.createGame` — testes de correção (RED → GREEN)

| Cenário | Input | Expectativa antes do fix | Expectativa após fix |
|---------|-------|--------------------------|---------------------|
| Rejeita null | `null` | `true` (BUG) | `false` ✓ |
| Rejeita undefined | `undefined` | `true` (BUG) | `false` ✓ |
| Rejeita integer | `fc.integer()` | `true` (BUG) | `false` ✓ |
| Rejeita float | `fc.float()` | `true` (BUG) | `false` ✓ |
| Rejeita boolean | `fc.boolean()` | `true` (BUG) | `false` ✓ |
| Rejeita array | `fc.array(fc.string())` | `true` (BUG) | `false` ✓ |
| Rejeita objeto | `fc.object()` | `true` (BUG) | `false` ✓ |
| Não bloqueia "null" | `null` então `"null"` | 2ª call → `false` (BUG) | 2ª call → `true` ✓ |
| Aceita string válida | `fc.string({minLength:1})` | `true` ✓ | `true` ✓ |

### `Game` — testes de resiliência via fuzz

| Método | Input | Runs | Expectativa |
|--------|-------|------|-------------|
| `addPlayer(socket)` | mock socket + nome de jogo gerado por `fc.string({minLength:1})` | 100 | `not.toThrow()` |

## Arbitraries do fast-check utilizados

| Arbitrary | Valores gerados |
|-----------|----------------|
| `fc.string()` | Strings Unicode arbitrárias, incluindo `""` |
| `fc.string({ minLength: 1 })` | Strings não-vazias |
| `fc.string({ minLength: 1000, maxLength: 10000 })` | Strings longas |
| `fc.constant(null)` | Literal `null` |
| `fc.constant(undefined)` | Literal `undefined` |
| `fc.constant('')` | String vazia |
| `fc.constant('__proto__')` | Chave perigosa |
| `fc.constant('constructor')` | Chave perigosa |
| `fc.integer()` | Inteiros positivos, negativos e zero |
| `fc.float()` | Floats incluindo `NaN`, `Infinity`, `-Infinity` |
| `fc.boolean()` | `true`, `false` |
| `fc.array(fc.string(), { maxLength: 3 })` | Arrays de strings |
| `fc.object({ maxDepth: 1 })` | Objetos simples |
| `fc.oneof(...)` | União dos arbitraries acima |

## Mock Socket

Mesmo padrão dos testes unitários da Fase 4:

```javascript
function makeSocket(id) {
  return {
    id: id || ('s-' + Math.random().toString(36).slice(2)),
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn()
  };
}
```

## Arquivos Modificados/Criados

| Arquivo | Ação | Commit |
|---------|------|--------|
| `specs/006-ci-fuzzing/` | Criar documentação da fase | 1 |
| `server/package.json` | Adicionar `fast-check`, script `test:fuzz` | 2 |
| `server/test/server.fuzz.test.js` | Criar com fuzz tests (2 falham) | 3 (RED) |
| `.gitlab-ci.yml` | Adicionar job `test:fuzz` | 3 (RED) |
| `server/games.js` | Adicionar validação de string em `createGame` | 4 (GREEN) |
| `ComoRodar.md` | Adicionar seção "CI — Testes de Fuzzing" | 5 |
