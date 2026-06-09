# Data Model: CI — Build & Lint

**Feature**: `004-ci-build-lint` | **Date**: 2026-06-09

Esta fase não introduz entidades de banco de dados. O "modelo" desta fase é a
estrutura de configuração do pipeline de CI e as regras de lint.

---

## Pipeline Configuration

### Estrutura do `.gitlab-ci.yml`

| Campo            | Valor |
|------------------|-------|
| `stages`         | `[build, lint]` |
| `default.image`  | `node:18-alpine` |
| Jobs             | `build`, `lint:back`, `lint:front` |

### Job: `build`

| Campo       | Valor |
|-------------|-------|
| `stage`     | `build` |
| `script`    | `cd server && npm ci` |
| `artifacts.paths` | `server/node_modules/` |
| `artifacts.expire_in` | `1 hour` |

### Job: `lint:back`

| Campo       | Valor |
|-------------|-------|
| `stage`     | `lint` |
| `needs`     | `[build]` (com artifacts) |
| `script`    | `cd server && npm run lint:back` |

### Job: `lint:front`

| Campo       | Valor |
|-------------|-------|
| `stage`     | `lint` |
| `needs`     | `[build]` (com artifacts) |
| `script`    | `cd server && npm run lint:front` |

---

## ESLint Configuration — Back-end (`server/.eslintrc.json`)

| Campo            | Valor |
|------------------|-------|
| `env.node`       | `true` — globals do Node.js (`require`, `module`, `process`, etc.) |
| `env.es2020`     | `true` — suporte a `async/await`, template literals, etc. |
| `parserOptions.ecmaVersion` | `2020` |
| `rules.no-undef` | `"error"` — variáveis não declaradas reprovam o pipeline |
| `rules.no-unused-vars` | `["warn", { "argsIgnorePattern": "^_" }]` — aviso apenas |
| `rules.no-console` | `"off"` — o servidor usa console para logging |
| `overrides[test/**].env.jest` | `true` — globals Jest para arquivos de teste |

---

## ESLint Configuration — Front-end (`game/.eslintrc.json`)

| Campo            | Valor |
|------------------|-------|
| `env.browser`    | `true` — globals de browser (`window`, `document`, `Image`, etc.) |
| `env.es6`        | `false` — código ES5 legado |
| `parserOptions.ecmaVersion` | `5` |
| `parserOptions.sourceType`  | `"script"` |
| `globals.io`     | `"readonly"` — socket.io-client carregado via `<script>` |
| `globals.cv`     | `"readonly"` — OpenCV.js carregado via `<script>` |
| `globals.Movement` | `"readonly"` — exportado por `movement.js` para `mk.js` |
| `rules.no-undef` | `"warn"` — globals não declarados geram aviso (não reprovar por código legado) |
| `rules.no-unused-vars` | `"off"` — código legado tem variáveis internas à IIFE |
| `rules.no-console` | `"off"` |

---

## npm Scripts (`server/package.json`)

| Script       | Comando |
|--------------|---------|
| `lint:back`  | `eslint . --ext .js` |
| `lint:front` | `eslint ../game/src --ext .js` |
| `lint`       | `npm run lint:back && npm run lint:front` |

> `eslint .` executado de `server/` ignora `node_modules/` automaticamente (comportamento padrão ESLint v8).
