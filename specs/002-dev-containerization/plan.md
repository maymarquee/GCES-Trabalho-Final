# Implementation Plan: Containerização do Ambiente de Desenvolvimento (Hot-Reload)

**Branch**: `002-dev-containerization` | **Date**: 2026-06-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-dev-containerization/spec.md`

## Summary

Criar um `Dockerfile` voltado para desenvolvimento que empacota o back-end
Node.js/Express/Socket.io do mk.js e serve o front-end estático `game/` sem
necessitar de Node.js no host. O contêiner monta `server/` e `game/` como volumes
do host e usa `nodemon` para reiniciar o servidor automaticamente ao detectar
alterações em `server/`. Arquivos em `game/` ficam disponíveis ao recarregar a
página, pois são servidos diretamente do volume montado. Um `.env.example` permite
personalizar a porta exposta sem editar arquivos rastreados pelo Git.
`ComoRodar.md` é atualizado com os passos do ambiente containerizado.

## Technical Context

**Language/Version**: Node.js 18 LTS (mínimo já declarado em `server/package.json`
`engines`; exigido por Express 4.x e Socket.io 4.x).

**Primary Dependencies (produção)**: `express@^4.21`, `socket.io@^4.8`.
**DevDependency adicionada**: `nodemon` — watcher de processos para hot-reload
do back-end dentro do contêiner.

**Storage**: N/A — sem persistência nesta fase.

**Testing**: Jest (já configurado em `server/package.json`). O Dockerfile de
desenvolvimento não altera a suíte de testes; os testes continuam rodando via
`npm test` dentro ou fora do contêiner.

**Target Platform**: Contêiner Docker (Linux). Imagem base: `node:18-slim`
(menor que a `node:18` completa, mantém ferramentas de debug úteis em dev;
Alpine fica reservado para produção na Fase 8).

**Project Type**: Web service + arquivos estáticos (relay Socket.io + front-end
HTML/CSS/JS servido pelo Express a partir do diretório `../game`).

**Performance Goals**: Reinício do servidor (back-end hot-reload) em ≤ 3 s após
salvar arquivo em `server/`. Front-end disponível imediatamente ao recarregar a
página (servido do volume, sem etapa de cópia).

**Constraints**: Único comando para subir; sem Node.js/npm no host; porta padrão
55555; configuração local via `.env` não rastreado pelo Git.

**Scale/Scope**: Ambiente local de desenvolvimento para um único desenvolvedor
por vez; sem requisitos de escalabilidade nesta fase.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Justificativa |
|-----------|--------|---------------|
| I — Incremental & Atomic Delivery | ✅ PASS | Um commit por artefato (Dockerfile, .dockerignore, .env.example, docs); sem alterações de lógica de aplicação nesta fase. |
| II — Environment Parity via Containers | ✅ PASS | É o objetivo direto da fase: Dockerfile de dev com hot-reload documentado. |
| III — Test- & Quality-Gated Changes | ✅ PASS | Sem mudança na lógica da aplicação; testes Jest existentes continuam passando sem alteração. |
| IV — Security by Default | ✅ PASS | Imagem oficial `node:18-slim`; `node_modules/` e `.git/` excluídos via `.dockerignore`; sem credenciais hardcoded; `.env` em `.gitignore`. |
| V — Documentation as a Deliverable | ✅ PASS | `ComoRodar.md` atualizado no mesmo conjunto de commits. |

Sem violações — prosseguir para Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/002-dev-containerization/
├── plan.md              # Este arquivo
├── research.md          # Decisões: nodemon, volumes, .env, node:18-slim
├── data-model.md        # Entidade: Configuração do Ambiente (variáveis de ambiente)
├── quickstart.md        # Guia de validação end-to-end
├── contracts/
│   └── dev-environment.md   # Interface pública: porta, volumes, variáveis
└── tasks.md             # Gerado por /speckit-tasks
```

### Source Code (repository root)

```text
/                          # raiz do repositório
├── Dockerfile             # Imagem de desenvolvimento (node:18-slim + nodemon)
├── .dockerignore          # Exclui node_modules, .git, specs, etc.
├── .env.example           # Exemplo de variáveis locais (ex.: HOST_PORT=55555)
├── .gitignore             # .env adicionado à lista de ignorados
├── ComoRodar.md           # Nova seção "Ambiente de Desenvolvimento via Docker"
└── server/
    ├── package.json       # nodemon adicionado a devDependencies
    └── package-lock.json  # Atualizado após npm install com nodemon
```

**Structure Decision**: Dockerfile na raiz para ter visibilidade de `server/` e
`game/` e montar ambos como volumes. A estrutura de código pré-existente é
preservada integralmente; nenhum arquivo em `server/` ou `game/` tem sua lógica
alterada.

## Complexity Tracking

> Sem violações de constituição a justificar.
