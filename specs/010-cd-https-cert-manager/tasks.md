# Tasks: CD & Segurança de Rede — HTTPS via Cert Manager

**Input**: Design documents from `/specs/010-cd-https-cert-manager/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Organization**: Tarefas agrupadas por fase de entrega incremental, alinhadas às User Stories do `spec.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story correspondente (US1-US3)

---

## Phase 1: Documentação e Specs

**Purpose**: Criar os artefatos de especificação antes de qualquer manifesto.

- [x] T001 Criar `specs/010-cd-https-cert-manager/` com spec.md, plan.md, tasks.md, research.md, data-model.md, quickstart.md, contracts/tls-cd-contract.md, checklists/requirements.md

**Checkpoint**: Diretório `specs/010-cd-https-cert-manager/` criado com todos os arquivos de documentação.

---

## Phase 2: Foundational — `cert-manager` no cluster (Blocking Prerequisites)

**Purpose**: Instalar o `cert-manager` antes de qualquer `ClusterIssuer`/`Certificate`.

**⚠️ CRITICAL**: `kubectl apply -k k8s/` falha em `ClusterIssuer`/`Certificate` (CRDs inexistentes) sem esta fase.

- [ ] T002 [US1] Atualizar `terraform/main.tf`: adicionar `null_resource.cert_manager` (instala `https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.yaml` + `kubectl wait --namespace cert-manager --for=condition=available deployment --all`), `depends_on = [null_resource.ingress_nginx]`; atualizar `null_resource.app_manifests` para `depends_on = [null_resource.cert_manager]`
- [ ] T003 [P] [US1] Atualizar `terraform/outputs.tf`: adicionar output `https_url`

**Checkpoint**: `terraform fmt -check` e `terraform validate` passam; `quickstart.md` Opção A documenta o equivalente manual (`kubectl apply -f cert-manager.yaml` + `kubectl wait`).

---

## Phase 3: User Story 1 — TLS via cert-manager (Priority: P1) 🎯

**Goal**: `https://mkjs.local` serve o jogo com certificado emitido pelo `cert-manager`.

**Independent Test**: `kubectl get certificate -n mkjs` mostra `mkjs-tls READY=True`; `https://mkjs.local/` carrega o jogo após aceitar o aviso de certificado autoassinado.

### Implementation

- [ ] T004 [P] [US1] Criar `k8s/cert-issuer.yaml` com `ClusterIssuer selfsigned-issuer` (`spec.selfSigned: {}`)
- [ ] T005 [P] [US1] Criar `k8s/certificate.yaml` com `Certificate mkjs-tls` (ns `mkjs`, `secretName: mkjs-tls`, `dnsNames: [mkjs.local]`, `issuerRef: {kind: ClusterIssuer, name: selfsigned-issuer}`)
- [ ] T006 [US1] Adicionar `cert-issuer.yaml` e `certificate.yaml` a `k8s/kustomization.yaml`

**Checkpoint**: `kubectl apply -k k8s/` (com cert-manager instalado) cria `ClusterIssuer`/`Certificate`/`Secret mkjs-tls` (`READY=True`).

---

## Phase 4: User Story 2 — Ingress TLS + redirecionamento (Priority: P1)

**Goal**: `Ingress mkjs` serve HTTPS com `secretName: mkjs-tls` e redireciona `http://` → `https://`.

**Independent Test**: `curl -k -I http://mkjs.local/` retorna `308` para `https://mkjs.local/`; `curl -k -I https://mkjs.local/` retorna `200`.

### Implementation

- [ ] T007 [US2] Atualizar `k8s/ingress.yaml`: adicionar `spec.tls` (`hosts: [mkjs.local]`, `secretName: mkjs-tls`) e anotações `nginx.ingress.kubernetes.io/ssl-redirect: "true"`, `nginx.ingress.kubernetes.io/force-ssl-redirect: "true"`, preservando as anotações de timeout da Fase 9

**Checkpoint**: `curl -k -I http://mkjs.local/` → `308`; `curl -k -I https://mkjs.local/` → `200`; `kubectl get svc -n mkjs` confirma `app`/`nginx`/`postgres` ainda `ClusterIP`.

---

## Phase 5: User Story 3 — CD: publicação de imagens (Priority: P1)

**Goal**: Pipeline publica `mkjs-app`/`mkjs-nginx` no GitLab Container Registry a cada push em `main`, após os gates existentes.

**Independent Test**: Push em `main` → job `release:images` verde → imagens visíveis em "Container Registry" do projeto.

### Implementation

- [ ] T008 [US3] Atualizar `.gitlab-ci.yml`: adicionar `release` à lista `stages` (após `infra`); adicionar job `release:images` (`image: docker:27`, `services: [docker:27-dind]`, `rules: if CI_COMMIT_BRANCH == CI_DEFAULT_BRANCH`, build+push de `Dockerfile.prod` e `nginx/Dockerfile` para `$CI_REGISTRY_IMAGE/mkjs-app`/`mkjs-nginx` com tags `$CI_COMMIT_SHORT_SHA` e `latest`)

**Checkpoint**: Push para o GitLab → pipeline com 11 jobs; `release:images` roda apenas em `main` e apenas após `infra` passar.

---

## Phase 6: Documentação Final

**Purpose**: Atualizar `ComoRodar.md` com HTTPS e CD.

- [ ] T009 [P] Atualizar `ComoRodar.md`: adicionar seção "HTTPS (cert-manager)" (instalação, verificação do `ClusterIssuer`/`Certificate`, acesso `https://mkjs.local`, aviso de cert autoassinado, redirecionamento 80→443) e seção "CD — publicação de imagens" (estágio `release`, onde ver as imagens no Container Registry)

**Checkpoint**: `ComoRodar.md` documenta o fluxo completo de HTTPS local + CD desta fase.

---

## Dependencies & Execution Order

- **Phase 1**: Sem dependências — pode começar imediatamente
- **Phase 2**: Sem dependências de código novo — estende `terraform/` da Fase 9; bloqueia a aplicação real da Phase 3 em cluster (mas não bloqueia a escrita dos manifestos)
- **Phase 3**: Pode ser escrita em paralelo com a Phase 2 (arquivos diferentes); aplicar em cluster requer a Phase 2 concluída
- **Phase 4**: Depende da Phase 3 (precisa de `Secret mkjs-tls`, criado pelo `Certificate mkjs-tls`)
- **Phase 5**: Independente das Phases 2-4 (`.gitlab-ci.yml` não depende dos manifestos de TLS); pode rodar em paralelo
- **Phase 6**: Pode rodar em paralelo com a Phase 5, mas idealmente documenta o resultado final de todas as fases anteriores

---

## Commit Map

| Commit | Tarefas | Mensagem | CI esperado |
|--------|---------|----------|-------------|
| 1 | T001 | `docs: add specs and planning docs for cd-https-cert-manager phase` | — |
| 2 | T002-T003 | `feat(terraform): install cert-manager in kind cluster provisioning` | — |
| 3 | T004-T006 | `feat(k8s): add selfsigned ClusterIssuer and Certificate for mkjs.local` | verde |
| 4 | T007 | `feat(k8s): enable HTTPS on ingress via cert-manager TLS secret` | verde |
| 5 | T008 | `ci: add release stage publishing images to GitLab Container Registry` | verde |
| 6 | T009 | `docs: document HTTPS via cert-manager and CD image publishing` | verde |
