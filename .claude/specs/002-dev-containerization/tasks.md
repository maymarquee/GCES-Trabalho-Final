# Tasks: Containerização do Ambiente de Desenvolvimento (Hot-Reload)

**Input**: Design documents from `/specs/002-dev-containerization/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Organization**: Tarefas agrupadas por User Story para entrega incremental independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story correspondente (US1, US2, US3)

---

## Phase 1: Setup (Dependências e Infraestrutura Compartilhada)

**Purpose**: Preparar as dependências e arquivos de suporte que todos os artefatos Docker vão precisar.

- [x] T001 Adicionar `nodemon` em `devDependencies` de `server/package.json` e rodar `npm install` para atualizar `server/package-lock.json`
- [x] T002 [P] Criar `.dockerignore` na raiz do repositório (excluir `node_modules`, `.git`, `specs`, `.specify`, `.env`)
- [x] T003 [P] Adicionar `.env` à lista de ignorados em `.gitignore` (se ainda não estiver)

---

## Phase 2: Foundational (Pré-requisito que Bloqueia todas as US)

**Purpose**: O `Dockerfile` é o artefato central do qual US1 e US2 dependem diretamente.

**⚠️ CRITICAL**: Nenhuma User Story pode ser validada antes deste artefato estar completo.

- [x] T004 Criar `Dockerfile` na raiz com base `node:18-slim`, `WORKDIR /app`, cópia de `server/package*.json`, `RUN npm ci`, `EXPOSE 55555` e `CMD ["npx", "nodemon", "--legacy-watch", "server/server.js"]`

**Checkpoint**: Com T001–T004 concluídos é possível executar `docker build -t mkjs-dev .` com sucesso.

---

## Phase 3: User Story 1 — Subir o ambiente sem instalar Node.js (Priority: P1) 🎯 MVP

**Goal**: Desenvolvedor consegue rodar o jogo inteiro via Docker sem ter Node.js no host.

**Independent Test**: Clonar o repo em máquina sem Node.js → `docker build` → `docker run` com volumes → jogo abre em `http://localhost:55555` e partida em rede funciona entre duas abas.

### Implementação para User Story 1

- [x] T005 [US1] Verificar que o `Dockerfile` copia apenas `server/package*.json` antes do `npm ci` (camada de cache separada) e monta `server/` e `game/` como volumes no comando de run documentado em `ComoRodar.md`
- [x] T006 [US1] Atualizar `ComoRodar.md`: adicionar seção "Ambiente de Desenvolvimento via Docker" com os passos de `docker build`, `docker run` (incluindo os bind mounts de `server/` e `game/` e o volume anônimo para `node_modules`), e o comando para parar o contêiner

**Checkpoint**: `docker run --rm -it -p 55555:55555 -v $(pwd)/server:/app/server -v $(pwd)/game:/app/game -v mkjs-dev-modules:/app/server/node_modules mkjs-dev` sobe o servidor; `http://localhost:55555` mostra o jogo; partida em rede entre duas abas funciona (US1 validada).

---

## Phase 4: User Story 2 — Hot-reload sem reconstruir a imagem (Priority: P2)

**Goal**: Salvar arquivo em `server/` reinicia o servidor automaticamente; salvar em `game/` fica disponível ao recarregar a página.

**Independent Test**: Com contêiner rodando, editar `server/server.js` → logs do nodemon aparecem no terminal indicando restart; editar arquivo em `game/` → recarregar a página no navegador mostra o conteúdo atualizado.

### Implementação para User Story 2

- [x] T007 [US2] Criar `nodemon.json` (ou seção `nodemon` em `server/package.json`) na raiz para configurar `watch: ["server/"]`, `ext: "js,json"`, `legacyWatch: true` — garante que o nodemon dentro do contêiner detecta mudanças via bind mount em Docker Desktop (Windows/macOS)
- [x] T008 [US2] Atualizar a seção Docker em `ComoRodar.md` documentando o comportamento esperado de hot-reload (back-end reinicia; front-end disponível ao recarregar) e o flag `--legacy-watch` necessário em Docker Desktop

**Checkpoint**: Editar e salvar `server/server.js` com o contêiner rodando → nodemon exibe `restarting due to changes` nos logs em ≤ 3 s sem rebuild (US2 validada).

---

## Phase 5: User Story 3 — Configuração local sem editar arquivos versionados (Priority: P3)

**Goal**: Desenvolvedor pode mudar a porta exposta no host via `.env` local sem que `git status` mostre arquivos modificados.

**Independent Test**: Criar `.env` com `HOST_PORT=55556` → `docker run -p ${HOST_PORT}:55555 ...` → jogo abre em `localhost:55556`; `git status` limpo.

### Implementação para User Story 3

- [x] T009 [US3] Criar `.env.example` na raiz com `HOST_PORT=55555` (rastreado pelo Git; serve como template)
- [x] T010 [US3] Atualizar `ComoRodar.md` com o passo de copiar `.env.example` para `.env` e o uso de `${HOST_PORT:-55555}` no comando de `docker run`, além do aviso de que `.env` não é rastreado pelo Git

**Checkpoint**: Copiar `.env.example` para `.env`, alterar porta para 55556, subir contêiner → jogo acessível em `http://localhost:55556`; `git status` limpo (US3 validada).

---

## Phase 6: Polish & Validação Final

**Purpose**: Garantir que todos os cenários do quickstart.md passam e a documentação está consistente.

- [x] T011 [P] Executar todos os cenários de validação do `specs/002-dev-containerization/quickstart.md` (Cenários 1–4) e registrar resultados
- [x] T012 [P] Revisar `ComoRodar.md` para garantir consistência entre os passos documentados e o comportamento real do contêiner (porta, volumes, hot-reload, porta alternativa)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sem dependências — pode começar imediatamente
- **Phase 2 (Foundational)**: Depende de T001 (nodemon no package.json)
- **Phase 3 (US1)**: Depende da Phase 2 completa
- **Phase 4 (US2)**: Depende da Phase 2 completa (paralela com US1)
- **Phase 5 (US3)**: Pode rodar em paralelo com US1 e US2 (arquivos independentes)
- **Phase 6 (Polish)**: Depende de todas as fases anteriores

### Parallel Opportunities

- T002 e T003 podem rodar em paralelo (arquivos diferentes)
- T007 e T009 podem rodar em paralelo (arquivos diferentes)
- T008 e T010 podem ser combinados em uma única edição de `ComoRodar.md` (mesma seção — fazer sequencialmente)
- T011 e T012 podem rodar em paralelo

---

## Commit Map (Guia de Atomicidade)

| Commit | Tarefas | Mensagem sugerida |
|--------|---------|-------------------|
| 1 | T001 | `chore(server): add nodemon devDependency for hot-reload` |
| 2 | T002, T003, T004 | `feat: add Dockerfile and .dockerignore for dev environment` |
| 3 | T005, T007 | `feat: configure nodemon watch for hot-reload in container` |
| 4 | T009 | `chore: add .env.example with HOST_PORT for local config` |
| 5 | T006, T008, T010 | `docs: add Docker dev environment section to ComoRodar.md` |
| 6 | T011, T012 | `docs: mark Phase 1 dev containerization complete` |

---

## Implementation Strategy

### MVP (User Story 1 — Jogo acessível via Docker)

1. Completar Phase 1: Setup (T001–T003)
2. Completar Phase 2: Foundational (T004) — **crítico**
3. Completar Phase 3: US1 (T005–T006)
4. **VALIDAR**: `docker build` + `docker run` + jogo no navegador + partida em rede funcionam
5. Avançar para Phase 4 (hot-reload) e Phase 5 (porta configurável)

### Incremental Delivery

1. Setup + Foundational → imagem buildável
2. US1 → jogo acessível via Docker (MVP desta fase!)
3. US2 → hot-reload do back-end configurado
4. US3 → porta configurável sem alterar arquivos versionados
5. Polish → todos os cenários do quickstart validados

---

## Notes

- `--legacy-watch` é necessário no nodemon dentro de Docker Desktop (Windows/macOS) para detectar mudanças via bind mount usando polling em vez de inotify
- O volume anônimo `mkjs-dev-modules` sobrepõe o bind mount de `server/` em `/app/server/node_modules` — padrão essencial para isolar dependências do container das do host
- Não há testes novos nesta fase: não existe lógica de aplicação nova para testar
- Os testes Jest existentes em `server/test/` continuam passando sem alteração
