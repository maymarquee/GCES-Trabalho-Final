# Tasks: CI — Build & Lint

**Input**: Design documents from `/specs/004-ci-build-lint/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Organization**: Tarefas agrupadas por fase de entrega incremental.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story correspondente (US1, US2, US3, US4)

---

## Phase 1: Setup (Dependências e Estrutura)

**Purpose**: Adicionar ESLint como dependência de desenvolvimento e criar os arquivos de configuração.

- [x] T001 Adicionar `eslint@^8.57.0` em `devDependencies` de `server/package.json` e rodar `npm install` dentro de `server/` para atualizar `server/package-lock.json`
- [x] T002 [P] Criar `server/.eslintrc.json` com: `env: { node: true, es2020: true }`, `parserOptions: { ecmaVersion: 2020 }`, `rules: { no-undef: "error", no-unused-vars: ["warn", { argsIgnorePattern: "^_" }], no-console: "off" }`, e `overrides: [{ files: ["test/**/*.js"], env: { jest: true } }]`
- [x] T003 [P] Criar `game/.eslintrc.json` com: `env: { browser: true }`, `parserOptions: { ecmaVersion: 5, sourceType: "script" }`, `globals: { io: "readonly", cv: "readonly", Movement: "readonly" }`, `rules: { no-undef: "warn", no-unused-vars: "off", no-console: "off" }`

**Checkpoint**: `npx eslint --version` dentro de `server/` retorna `v8.x.x`; arquivo `server/.eslintrc.json` e `game/.eslintrc.json` criados.

---

## Phase 2: npm Scripts (Lint Local)

**Purpose**: Adicionar scripts npm para que desenvolvedores possam executar lint localmente.

- [x] T004 [US4] Atualizar `server/package.json`: adicionar scripts `"lint:back": "eslint . --ext .js"`, `"lint:front": "eslint ../game/src --ext .js"`, `"lint": "npm run lint:back && npm run lint:front"` na seção `scripts` (mantendo `"test": "jest"`)

**Checkpoint**: `npm run lint` dentro de `server/` executa sem erros para o código atual; `npm run lint:back` e `npm run lint:front` funcionam individualmente.

---

## Phase 3: GitLab CI Pipeline

**Purpose**: Criar o arquivo `.gitlab-ci.yml` com os estágios de build e lint.

- [x] T005 [US1] Criar `.gitlab-ci.yml` na raiz do repositório com: `stages: [build, lint]`; `default: { image: node:18-alpine }`; job `build` com `stage: build`, `script: [cd server && npm ci]`, `artifacts: { paths: [server/node_modules/], expire_in: 1 hour }`; job `lint:back` com `stage: lint`, `needs: [{job: build, artifacts: true}]`, `script: [cd server && npm run lint:back]`; job `lint:front` com `stage: lint`, `needs: [{job: build, artifacts: true}]`, `script: [cd server && npm run lint:front]`

**Checkpoint**: `.gitlab-ci.yml` criado na raiz; YAML válido (pode ser validado em `CI/CD → Editor` no GitLab).

---

## Phase 4: Validação e Documentação

**Purpose**: Verificar que o pipeline está verde e documentar como usá-lo.

- [x] T006 [P] Verificar que `npm run lint` passa localmente com zero erros para `server/` e `game/src/` — registrar resultado
- [x] T007 [P] Verificar que `npm test` continua passando após adição do ESLint (sem regressão)
- [x] T008 [P] Atualizar `ComoRodar.md`: adicionar seção "CI — Build & Lint" documentando como executar lint localmente (`npm run lint`) e onde ver o pipeline no GitLab

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sem dependências — pode começar imediatamente
- **Phase 2 (Scripts)**: Depende de T001 (ESLint instalado) e T002 (config back-end)
- **Phase 3 (CI)**: Depende de T004 (scripts npm devem existir antes do pipeline usá-los)
- **Phase 4 (Validação)**: Depende de T005 (CI criado) e T004 (scripts criados)

### Parallel Opportunities

- T002 e T003 podem rodar em paralelo (arquivos diferentes)
- T006, T007 e T008 podem rodar em paralelo na fase de polish

---

## Commit Map (Guia de Atomicidade)

| Commit | Tarefas | Mensagem sugerida |
|--------|---------|-------------------|
| 1 | T001 | `chore(server): add eslint dev dependency for CI lint` |
| 2 | T002 | `chore: add eslint config for server back-end lint` |
| 3 | T003 | `chore: add eslint config for game front-end lint` |
| 4 | T004 | `chore(server): add lint scripts to package.json` |
| 5 | T005 | `ci: add .gitlab-ci.yml with build and lint stages` |
| 6 | T008 | `docs: update ComoRodar.md with CI lint section` |
| 7 | T006, T007 | `chore: validate lint and tests pass after CI setup` |
| 8 | — | `docs: add specs and planning docs for ci-build-lint phase` |

---

## Implementation Strategy

### MVP (Pipeline verde rodando no GitLab)

1. Phase 1: Setup — ESLint + configs
2. Phase 2: Scripts npm — lint local funciona
3. **VALIDAR**: `npm run lint` passa sem erros localmente
4. Phase 3: CI — `.gitlab-ci.yml` criado
5. **VALIDAR**: push para GitLab → pipeline verde

### Incremental Delivery

1. Dependências e configs → base para lint local e CI
2. Scripts npm → lint rodando localmente (US4)
3. `.gitlab-ci.yml` → pipeline automático (US1, US2, US3)
4. Validação + docs → fase completa

---

## Notes

- ESLint v8 ignora `node_modules/` por padrão — não é necessário `.eslintignore` para isso.
- O override `test/**` no `server/.eslintrc.json` garante que globals do Jest (`describe`, `test`, `expect`, etc.) não causem erros `no-undef` nos arquivos de teste.
- O artifact `server/node_modules/` tem TTL de 1 hora — suficiente para os jobs de lint que rodam logo após o build no mesmo pipeline.
- Avisos (`warn`) não afetam o exit code do ESLint; apenas erros (`error`) causam exit code 1 e reprovam o job de CI.
