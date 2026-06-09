# Implementation Plan: CI — Build & Lint

**Branch**: `004-ci-build-lint` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-ci-build-lint/spec.md`

## Summary

Adicionar pipeline de CI ao projeto mk.js via GitLab CI (`.gitlab-ci.yml`).
O pipeline tem dois estágios — `build` e `lint` — executados automaticamente em todo push.
O estágio de build instala dependências (`npm ci`) e passa `node_modules` como artifact.
O estágio de lint executa dois jobs paralelos: ESLint no back-end (`server/`) e ESLint no
front-end (`game/src/`). O pipeline falha se o lint back-end encontrar erros.
Dois arquivos `.eslintrc.json` (um por contexto) são versionados no repositório.

## Technical Context

**Language/Version**: Node.js 18 LTS; JavaScript ES5/ES2020 misto.

**CI Platform**: GitLab CI — arquivo `.gitlab-ci.yml` na raiz.
**CI Image**: `node:18-alpine` para todos os jobs.

**Lint Tool**: ESLint v8.x (legacy config format `.eslintrc.json`).
**Nova devDependency**: `eslint@^8.57.0` adicionada a `server/package.json`.

**Configurações de lint**:
- `server/.eslintrc.json` — ambiente Node.js + ES2020 + override para Jest em `test/`
- `game/.eslintrc.json` — ambiente browser + ES5 + globals declarados (`io`, `cv`, `Movement`)

**npm scripts adicionados** em `server/package.json`:
- `lint:back` → `eslint . --ext .js`
- `lint:front` → `eslint ../game/src --ext .js`
- `lint` → `npm run lint:back && npm run lint:front`

**Testing**: Sem novos testes unitários nesta fase (testes são Fase 4). Os scripts de lint
são verificados executando `npm run lint` localmente antes do commit.

**Target Platform**: GitLab CI com runners compartilhados Linux.

**Performance Goals**: Pipeline completo (build + 2 lint jobs paralelos) em < 5 minutos.

**Constraints**:
- `node_modules/` nunca commitado; passado via artifact entre jobs do mesmo pipeline.
- Nenhuma mudança no código funcional da aplicação (server.js, games.js, db.js, mk.js).
- Regras de lint não podem reprovar o pipeline para o código atual (baseline verde).

**Scale/Scope**: Ambiente de CI simples para desenvolvimento individual.

## Constitution Check

| Princípio | Status | Justificativa |
|-----------|--------|---------------|
| I — Incremental & Atomic Delivery | ✅ PASS | Commits separados: ESLint deps → ESLint configs → npm scripts → .gitlab-ci.yml → docs. |
| II — Environment Parity via Containers | ✅ PASS | CI usa `node:18-alpine`; mesmo Node.js declarado em `engines` do package.json e no Dockerfile. |
| III — Test- & Quality-Gated Changes | ✅ PASS | O próprio pipeline de CI é o gate; testes existentes continuam passando (sem alteração no código funcional). |
| IV — Security by Default | ✅ PASS | Nenhuma credencial no pipeline; imagem oficial node Alpine; sem secrets necessários para build/lint. |
| V — Documentation as a Deliverable | ✅ PASS | ComoRodar.md atualizado com seção CI no mesmo commit ou adjacente. |

Sem violações — prosseguir para implementação.

## Project Structure

### Documentation (this feature)

```text
specs/004-ci-build-lint/
├── plan.md              # Este arquivo
├── research.md          # Decisões: ESLint v8, GitLab CI, artifacts, configs separadas
├── data-model.md        # Estrutura do pipeline (jobs, estágios, artifacts)
├── quickstart.md        # Como verificar o pipeline localmente e no GitLab
├── contracts/
│   └── pipeline.md      # Contrato: jobs, stages, regras, scripts, artefatos
├── checklists/
│   └── requirements.md  # Checklist de qualidade da spec
└── tasks.md             # Lista de tarefas ordenadas
```

### Source Code (repository root)

```text
/                               # raiz do repositório
├── .gitlab-ci.yml              # NOVO: pipeline CI com estágios build e lint
├── server/
│   ├── package.json            # ATUALIZADO: add eslint@^8.57.0 em devDependencies; add scripts lint, lint:back, lint:front
│   ├── package-lock.json       # ATUALIZADO: após npm install
│   └── .eslintrc.json          # NOVO: config ESLint para back-end (Node.js + ES2020 + Jest overrides)
└── game/
    └── .eslintrc.json          # NOVO: config ESLint para front-end (browser + ES5 + globals)
```

**Structure Decision**: `.gitlab-ci.yml` na raiz porque o GitLab o exige nessa localização.
`server/.eslintrc.json` próximo ao código que lint; `game/.eslintrc.json` em `game/` para
cobrir `game/src/` (ESLint aplica a config do diretório pai mais próximo).

## Complexity Tracking

> Sem violações de constituição a justificar.
