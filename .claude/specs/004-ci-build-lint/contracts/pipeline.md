# Contract: GitLab CI Pipeline — Build & Lint

**Feature**: `004-ci-build-lint` | **Date**: 2026-06-09

---

## Gatilho

O pipeline é disparado automaticamente em todo push para qualquer branch do repositório
(comportamento padrão do GitLab CI quando `.gitlab-ci.yml` está presente na raiz).

---

## Estágios

```
build → lint (lint:back e lint:front em paralelo)
```

---

## Jobs

### `build`

| Propriedade      | Valor |
|------------------|-------|
| Stage            | `build` |
| Image            | `node:18-alpine` |
| Script           | `cd server && npm ci` |
| Artifact paths   | `server/node_modules/` |
| Artifact TTL     | `1 hour` |

**Contrato**: Instala dependências usando `package-lock.json`. Falha se o lock file estiver inconsistente com `package.json`. Passa `node_modules/` para jobs dependentes via artifact.

---

### `lint:back`

| Propriedade      | Valor |
|------------------|-------|
| Stage            | `lint` |
| Image            | `node:18-alpine` |
| Needs            | `build` (com artifacts) |
| Script           | `cd server && npm run lint:back` |

**npm script**: `eslint . --ext .js` executado de `server/`.

**Config aplicada**: `server/.eslintrc.json`
- Ambiente: Node.js + ES2020
- Override para `test/**`: ambiente Jest
- Regra `no-undef`: `"error"` → pipeline falha se houver variável não declarada
- Regra `no-unused-vars`: `"warn"` → aviso apenas

**Contrato de saída**:
- Exit 0 → lint passou (zero violações de regras `"error"`)
- Exit 1 → lint falhou (uma ou mais violações `"error"` encontradas) → pipeline reprovado

---

### `lint:front`

| Propriedade      | Valor |
|------------------|-------|
| Stage            | `lint` |
| Image            | `node:18-alpine` |
| Needs            | `build` (com artifacts) |
| Script           | `cd server && npm run lint:front` |

**npm script**: `eslint ../game/src --ext .js` executado de `server/`.

**Config aplicada**: `game/.eslintrc.json`
- Ambiente: browser + ES5
- Globals declarados: `io`, `cv`, `Movement`
- Regra `no-undef`: `"warn"` → código legado não reprova por globals de browser

**Contrato de saída**:
- Exit 0 → lint passou (zero violações de regras `"error"`; avisos são informativos)
- Exit 1 → lint falhou (erro de sintaxe ou regra `"error"` violada) → pipeline reprovado

---

## Artifacts

| Artifact         | Produzido por | Consumido por       | TTL    |
|------------------|---------------|---------------------|--------|
| `server/node_modules/` | `build`  | `lint:back`, `lint:front` | 1 hora |

---

## Scripts npm (adicionados a `server/package.json`)

```json
"lint:back":  "eslint . --ext .js",
"lint:front": "eslint ../game/src --ext .js",
"lint":       "npm run lint:back && npm run lint:front"
```

---

## Comportamento esperado para o código atual

| Cenário                  | `lint:back` | `lint:front` | Pipeline |
|--------------------------|-------------|--------------|----------|
| Código atual sem erros   | ✅ passed   | ✅ passed    | ✅ passed |
| Variável não declarada em `server/` | ❌ failed | — | ❌ failed |
| Erro de sintaxe em `game/src/` | — | ❌ failed | ❌ failed |
| Aviso de lint (warn) apenas | ✅ passed | ✅ passed | ✅ passed |
