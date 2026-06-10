# Tasks: Infraestrutura — Kubernetes & Terraform

**Input**: Design documents from `/specs/009-k8s-infra/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Organization**: Tarefas agrupadas por fase de entrega incremental, alinhadas às User Stories do `spec.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story correspondente (US1-US5)

---

## Phase 1: Documentação e Specs

**Purpose**: Criar os artefatos de especificação antes de qualquer manifesto.

- [x] T001 Criar `specs/009-k8s-infra/` com spec.md, plan.md, tasks.md, research.md, data-model.md, quickstart.md, contracts/k8s-contract.md, checklists/requirements.md

**Checkpoint**: Diretório `specs/009-k8s-infra/` criado com todos os arquivos de documentação.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Recursos de namespace e configuração que todos os workloads dependem.

**⚠️ CRITICAL**: Nenhum workload (Postgres, app, Nginx) pode ser aplicado antes desta fase.

- [ ] T002 [P] Criar `k8s/namespace.yaml` com `Namespace mkjs`
- [ ] T003 [P] Criar `k8s/configmap.yaml` com `ConfigMap mkjs-config` (`PGHOST=postgres`, `PGPORT="5432"`, `PGDATABASE=mkjs`, `PGUSER=mkjs`)
- [ ] T004 [P] Criar `k8s/secret.yaml` com `Secret mkjs-secrets` (`PGPASSWORD=mkjs`, `stringData`)
- [ ] T005 [P] Criar `k8s/postgres-init-configmap.yaml` com `ConfigMap postgres-init` espelhando `server/db/init.sql` (tabela `matches`)

**Checkpoint**: `kubectl apply -f k8s/namespace.yaml -f k8s/configmap.yaml -f k8s/secret.yaml -f k8s/postgres-init-configmap.yaml` aplica sem erro.

---

## Phase 3: User Story 1 + User Story 3 — Postgres com persistência (Priority: P1/P2) 🎯

**Goal**: Postgres rodando em `StatefulSet` com dados persistidos via PVC e schema inicial aplicado automaticamente.

**Independent Test**: `kubectl apply -f k8s/postgres-*.yaml`, aguardar `postgres-0` ficar `Running/1/1`, conectar via `kubectl exec -it postgres-0 -n mkjs -- psql -U mkjs -d mkjs -c '\dt'` e ver a tabela `matches`.

### Implementation

- [ ] T006 [US1,US3] Criar `k8s/postgres-pvc.yaml` com `PersistentVolumeClaim postgres-data` (`ReadWriteOnce`, `1Gi`)
- [ ] T007 [US1,US3] Criar `k8s/postgres-statefulset.yaml` com `StatefulSet postgres` (1 réplica, imagem `postgres:16-alpine`, env via `mkjs-config`/`mkjs-secrets`, `PGDATA=/var/lib/postgresql/data/pgdata`, volumeMounts para `postgres-data` e `postgres-init`, probes `pg_isready`)
- [ ] T008 [US1,US3] Criar `k8s/postgres-service.yaml` com `Service postgres` headless (`clusterIP: None`, `selector: app: postgres`, porta `5432`)

**Checkpoint**: Pod `postgres-0` fica `Running/1/1`; `kubectl delete pod postgres-0 -n mkjs` seguido de `kubectl get pvc -n mkjs` mostra o PVC `Bound` reaproveitado pelo novo pod.

---

## Phase 4: User Story 1 — App e Nginx (Priority: P1)

**Goal**: Backend Node.js e Nginx rodando como `Deployment`/`Service`, consumindo configuração via `ConfigMap`/`Secret`.

**Independent Test**: `kubectl apply -f k8s/app-*.yaml -f k8s/nginx-*.yaml`, `kubectl get pods -n mkjs` mostra `app` e `nginx` (x2) `Running/1/1`; `kubectl exec deploy/app -n mkjs -- env | grep PG` mostra as variáveis injetadas.

### Implementation

- [ ] T009 [P] [US1,US4] Criar `k8s/app-deployment.yaml` com `Deployment app` (1 réplica, imagem `mkjs-app:latest`, `envFrom: [configMapRef: mkjs-config, secretRef: mkjs-secrets]`, porta `55555`, probes `httpGet /`)
- [ ] T010 [P] [US1] Criar `k8s/app-service.yaml` com `Service app` (ClusterIP, `selector: app: mkjs-app`, porta `55555`)
- [ ] T011 [P] [US1] Criar `k8s/nginx-deployment.yaml` com `Deployment nginx` (2 réplicas, imagem `mkjs-nginx:latest`, porta `80`, probes `httpGet /`)
- [ ] T012 [P] [US1] Criar `k8s/nginx-service.yaml` com `Service nginx` (ClusterIP, `selector: app: mkjs-nginx`, porta `80`)
- [ ] T013 [US1] Criar `k8s/kustomization.yaml` listando todos os recursos de `k8s/` (T002-T012)

**Checkpoint**: `kubectl apply -k k8s/` aplica toda a stack (sem `Ingress` ainda); `kubectl get pods -n mkjs` mostra `app` (1/1), `nginx` (2/2), `postgres-0` (1/1).

---

## Phase 5: User Story 2 — Ingress (Priority: P1)

**Goal**: Acesso externo único via `mkjs.local`, com timeouts adequados para Socket.io.

**Independent Test**: Com `ingress-nginx` instalado e `mkjs.local` resolvendo para `127.0.0.1`, `curl -I http://mkjs.local/` retorna `200 OK` servido pelo Nginx do cluster.

### Implementation

- [ ] T014 [US2] Criar `k8s/ingress.yaml` com `Ingress mkjs` (`ingressClassName: nginx`, host `mkjs.local`, path `/` → `service nginx:80`, anotações `proxy-read-timeout`/`proxy-send-timeout: "3600"`); adicionar `ingress.yaml` ao `k8s/kustomization.yaml`

**Checkpoint**: `kubectl apply -k k8s/` inclui o `Ingress`; `curl -I http://mkjs.local/` (ou via `port-forward`) retorna `200`.

---

## Phase 6: User Story 5 — Terraform opcional (Priority: P3)

**Goal**: Provisionar cluster `kind` local + `ingress-nginx` + aplicar `k8s/` via Terraform.

**Independent Test**: `terraform apply` em `terraform/` cria o cluster `mkjs`, instala `ingress-nginx` e aplica os manifestos sem passos manuais (além do build/load das imagens).

### Implementation

- [ ] T015 [P] [US5] Criar `terraform/versions.tf` (`required_version >= 1.5`, provider único `hashicorp/null`)
- [ ] T016 [P] [US5] Criar `terraform/variables.tf` (`cluster_name`, `http_port`, `https_port`)
- [ ] T017 [US5] Criar `terraform/main.tf` (`null_resource.kind_cluster` gerando `.kind-config.yaml` com `extraPortMappings` 80/443 e label `ingress-ready=true`, e rodando `kind create cluster`/`kind delete cluster` via `local-exec`; `null_resource.ingress_nginx` instalando o `ingress-nginx` via `local-exec` com `kubectl --context kind-${var.cluster_name}`; `null_resource.app_manifests` aplicando `kubectl apply -k ../k8s --context kind-${var.cluster_name}`)
- [ ] T018 [P] [US5] Criar `terraform/outputs.tf` (`cluster_context`, `app_url`)

**Checkpoint**: `terraform fmt -check` e `terraform validate` passam localmente.

---

## Phase 7: CI — Estágio `infra`

**Purpose**: Validar manifestos K8s e Terraform em todo push.

- [ ] T019 Atualizar `.gitlab-ci.yml`: adicionar `infra` à lista `stages` (após `quality`); adicionar job `k8s:validate` (`image: alpine/k8s:1.30.2`, `script: kubectl kustomize k8s/`); adicionar job `terraform:validate` (`image: hashicorp/terraform:1.9`, `script: cd terraform && terraform fmt -check && terraform init -backend=false && terraform validate`)

**Checkpoint**: Push para o GitLab → pipeline com 10 jobs, `k8s:validate` e `terraform:validate` em verde.

---

## Phase 8: Documentação Final

**Purpose**: Atualizar `ComoRodar.md` com a seção de Kubernetes.

- [ ] T020 [P] Atualizar `ComoRodar.md`: adicionar seção "Kubernetes (K8s)" documentando criação do cluster `kind`, build/load de imagens, `kubectl apply -k k8s/`, acesso via `mkjs.local`/`port-forward`, verificação de persistência via PVC e o fluxo opcional via Terraform

**Checkpoint**: `ComoRodar.md` atualizado com instruções completas de deploy local em Kubernetes.

---

## Dependencies & Execution Order

- **Phase 1**: Sem dependências — pode começar imediatamente
- **Phase 2**: Sem dependências de código — apenas manifestos de namespace/config; bloqueia as fases 3-5
- **Phase 3**: Depende da Phase 2 (namespace, configmap, secret, postgres-init)
- **Phase 4**: Depende da Phase 2; pode rodar em paralelo com a Phase 3 (arquivos diferentes), mas o `kustomization.yaml` (T013) depende de T002-T012 existirem
- **Phase 5**: Depende da Phase 4 (precisa do `Service nginx` e do `kustomization.yaml`)
- **Phase 6**: Independente das Phases 3-5 (consome `k8s/` como um todo via `kubectl apply -k`); pode rodar em paralelo
- **Phase 7**: Depende de `k8s/` (Phases 2-5) e, se aplicável, `terraform/` (Phase 6) existirem
- **Phase 8**: Pode rodar em paralelo com a Phase 7, mas idealmente documenta o resultado final de todas as fases anteriores

---

## Commit Map

| Commit | Tarefas | Mensagem | CI esperado |
|--------|---------|----------|-------------|
| 1 | T001 | `docs: add specs and planning docs for k8s-infra phase` | — |
| 2 | T002-T005 | `feat(k8s): add namespace, config and secrets manifests` | — |
| 3 | T006-T008 | `feat(k8s): add Postgres StatefulSet, PVC and service` | — |
| 4 | T009-T013 | `feat(k8s): add app and nginx deployments, services and kustomization` | — |
| 5 | T014 | `feat(k8s): add ingress for mkjs.local` | — |
| 6 | T015-T018 | `feat(terraform): add local kind cluster provisioning` | — |
| 7 | T019 | `ci: add k8s manifest and terraform validation jobs` | verde |
| 8 | T020 | `docs: update ComoRodar.md with kubernetes section` | verde |
