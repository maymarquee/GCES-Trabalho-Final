# Implementation Plan: CI — Testes de Fuzzing

**Branch**: `006-ci-fuzzing` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-ci-fuzzing/spec.md`

## Summary

Adicionar job `test:fuzz` ao pipeline GitLab CI, instalar `fast-check` como devDependency, e criar `server/test/server.fuzz.test.js` com testes de property-based testing para `GameCollection` e `Game`. Demonstrar o ciclo RED → GREEN: o commit RED inclui um fuzz test que expõe o bug de coerção de tipo em `createGame(null)` (JavaScript silenciosamente converte `null` para `"null"`, ocupando o slot do nome "null"); o commit GREEN adiciona validação `typeof id !== 'string' || id.length === 0` em `createGame`.

## Technical Context

**Language/Version**: Node.js 18 LTS; CommonJS.

**CI Platform**: GitLab CI — arquivo `.gitlab-ci.yml` na raiz.
**CI Image**: `node:18-alpine` (herdado do `default`).

**Fuzzing Tool**: fast-check v3.x — biblioteca de property-based testing para JavaScript/TypeScript. Gera entradas arbitrárias e reduz (shrinks) automaticamente o menor caso que causa falha.

**Novas dependências**: `fast-check ^3.0.0` como devDependency em `server/package.json`.

**Bug exposto pelos fuzz tests**:
- `GameCollection.createGame(null)` retorna `true` (cria jogo) em vez de `false` (rejeitar non-string)
- JavaScript converte `null` para `"null"` como chave de objeto, bloqueando a criação legítima de um jogo chamado `"null"` por outro cliente

**Fix em `games.js`**:
```javascript
GameCollection.prototype.createGame = function (id) {
  if (typeof id !== 'string' || id.length === 0) {
    return false;
  }
  // ... resto existente
};
```

## Constitution Check

| Princípio | Status | Justificativa |
|-----------|--------|---------------|
| I — Incremental & Atomic Delivery | ✅ PASS | Commits separados: specs → dependência → RED fuzz → GREEN fix → docs. |
| II — Environment Parity via Containers | ✅ PASS | CI usa `node:18-alpine`; mesma versão Node do Dockerfile. |
| III — Test- & Quality-Gated Changes | ✅ PASS | O ciclo RED→GREEN via fuzz tests é a demonstração central desta fase. |
| IV — Security by Default | ✅ PASS | A validação de entrada corrige um bug de coerção de tipo que poderia ser explorado. |
| V — Documentation as a Deliverable | ✅ PASS | ComoRodar.md atualizado com seção de fuzzing. |

## Project Structure

### Documentation (this feature)

```text
specs/006-ci-fuzzing/
├── plan.md              # Este arquivo
├── spec.md              # Especificação completa
├── research.md          # Decisões: fast-check, property-based testing, bug escolhido
├── data-model.md        # Entidades testadas, propriedades, estrutura do pipeline
├── quickstart.md        # Como executar os fuzz tests localmente
├── contracts/
│   └── fuzz-contract.md  # Contrato: job test:fuzz, garantias, interface
└── checklists/
    └── requirements.md  # Checklist de qualidade
```

### Source Code Changes

```text
/
├── .gitlab-ci.yml                       # ATUALIZADO: adicionar job test:fuzz no stage test
├── server/
│   ├── package.json                     # ATUALIZADO: adicionar fast-check, script test:fuzz
│   ├── games.js                         # ATUALIZADO: validação de entrada em createGame
│   └── test/
│       └── server.fuzz.test.js          # NOVO: fuzz tests com fast-check
└── ComoRodar.md                         # ATUALIZADO: seção CI — Testes de Fuzzing
```

## Commit Map

| Commit | Arquivo(s) | Mensagem | Estado CI |
|--------|-----------|----------|-----------|
| 1 | `specs/006-ci-fuzzing/` | `docs: add specs and planning docs for ci-fuzzing phase` | — |
| 2 | `server/package.json` | `build(server): add fast-check devDependency and test:fuzz npm script` | verde |
| 3 | `server/test/server.fuzz.test.js`, `.gitlab-ci.yml` | `test: add failing fuzz tests for server input validation` | **VERMELHO** |
| 4 | `server/games.js` | `fix(games): validate string id in createGame` | **VERDE** |
| 5 | `ComoRodar.md` | `docs: update ComoRodar.md with fuzzing section` | verde |
