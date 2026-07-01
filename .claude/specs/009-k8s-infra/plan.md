# Implementation Plan: Infraestrutura — Kubernetes & Terraform

**Branch**: `009-k8s-infra` | **Date**: 2026-06-10 | **Spec**: [spec.md](./spec.md)

## Summary

Criar manifestos Kubernetes (`k8s/`) que orquestram a stack de produção já construída na Fase 8 (Nginx + Node.js + Postgres): `Namespace`, `ConfigMap`/`Secret` para configuração, `PersistentVolumeClaim` + `StatefulSet` para o Postgres com schema inicial via `ConfigMap`, `Deployment`/`Service` para o app e para o Nginx, e um `Ingress` (`ingress-nginx`) expondo `mkjs.local`. Opcionalmente, adicionar `terraform/` com o provider `kind` para provisionar um cluster local reprodutível e aplicar os manifestos automaticamente. Adicionar um estágio `infra` ao `.gitlab-ci.yml` com validação estática (`kubectl kustomize`, `terraform validate`).

## Technical Context

**Orquestração**: Kubernetes 1.29+ (testado com `kind`/`minikube` locais).

**Empacotamento**: Kustomize nativo do `kubectl` (`kubectl apply -k k8s/`).

**Imagens**: `mkjs-app:latest` (`Dockerfile.prod`, Fase 8) e `mkjs-nginx:latest` (`nginx/Dockerfile`, Fase 8) — construídas localmente, carregadas no cluster via `kind load docker-image` / `minikube image load`.

**Banco de dados**: `postgres:16-alpine` em `StatefulSet` com `PersistentVolumeClaim` de 1Gi.

**Ingress controller**: `ingress-nginx` (manifesto oficial específico para `kind`, ou addon `ingress` do `minikube`).

**IaC opcional**: Terraform >= 1.5, provider `hashicorp/null` apenas — `null_resource`/`local-exec` chamando as CLIs `kind`/`kubectl` para criar o cluster local, instalar o `ingress-nginx` e aplicar `k8s/`.

**CI**: GitLab CI — novo estágio `infra` com `k8s:validate` (`kubectl kustomize`) e `terraform:validate` (`terraform validate`), ambos sem necessidade de cluster real.

**Estado atual**: Pipeline tem 6 estágios (build, lint, test, security, quality) com 8 jobs. Esta fase adiciona o estágio `infra` com até 2 novos jobs.

## Constitution Check

| Princípio | Status | Justificativa |
|---|---|---|
| I — Incremental & Atomic Delivery | ✅ PASS | Commits separados: specs → configmap/secret/namespace → postgres (PVC/StatefulSet) → app/nginx/ingress → terraform → CI → docs. |
| II — Environment Parity via Containers | ✅ PASS | Reaproveita as mesmas imagens multi-stage Alpine (`Dockerfile.prod`, `nginx/Dockerfile`) da Fase 8 — nenhum novo Dockerfile criado; K8s apenas orquestra os mesmos containers. |
| III — Test- & Quality-Gated Changes | ✅ PASS | Novo estágio `infra` valida sintaticamente manifestos e Terraform em todo push. |
| IV — Security by Default | ✅ PASS | Credenciais do Postgres isoladas em `Secret` (não em `Deployment`/`StatefulSet`); nenhuma porta além do `Ingress` é exposta externamente pelos manifestos. HTTPS/cert-manager permanece para a Fase 10. |
| V — Documentation as a Deliverable | ✅ PASS | `ComoRodar.md` recebe seção "Kubernetes (K8s)" cobrindo deploy local, acesso via Ingress e verificação de persistência. |

## Project Structure

### Documentation (this feature)

```text
specs/009-k8s-infra/
├── plan.md                       # Este arquivo
├── spec.md                       # Especificação completa
├── research.md                   # Decisões: Kustomize, StatefulSet, ConfigMap/Secret, Ingress, replicas, Terraform, CI
├── data-model.md                 # Recursos K8s, fluxo de dados, recursos Terraform
├── quickstart.md                 # Setup de cluster local, deploy, acesso, verificação de persistência
├── contracts/
│   └── k8s-contract.md          # Contrato: recursos, seletores, env vars, rotas do Ingress, jobs de CI
└── checklists/
    └── requirements.md          # Checklist de qualidade
```

### Source Code Changes

```text
/
├── k8s/
│   ├── kustomization.yaml             # NOVO: agrega todos os recursos
│   ├── namespace.yaml                 # NOVO: namespace mkjs
│   ├── configmap.yaml                 # NOVO: mkjs-config
│   ├── secret.yaml                    # NOVO: mkjs-secrets
│   ├── postgres-init-configmap.yaml   # NOVO: schema inicial (espelha server/db/init.sql)
│   ├── postgres-pvc.yaml              # NOVO: PersistentVolumeClaim postgres-data
│   ├── postgres-statefulset.yaml      # NOVO: StatefulSet postgres
│   ├── postgres-service.yaml          # NOVO: Service headless postgres
│   ├── app-deployment.yaml            # NOVO: Deployment app
│   ├── app-service.yaml               # NOVO: Service app
│   ├── nginx-deployment.yaml          # NOVO: Deployment nginx
│   ├── nginx-service.yaml             # NOVO: Service nginx
│   └── ingress.yaml                   # NOVO: Ingress mkjs (host mkjs.local)
├── terraform/                         # NOVO (opcional): provisiona cluster kind local
│   ├── versions.tf
│   ├── variables.tf
│   ├── main.tf
│   └── outputs.tf
├── .gitlab-ci.yml                     # ATUALIZADO: estágio infra, jobs k8s:validate e terraform:validate
├── .gitignore                         # ATUALIZADO: artefatos Terraform (.terraform/, *.tfstate*)
└── ComoRodar.md                       # ATUALIZADO: seção Kubernetes (K8s)
```

**Structure Decision**: Manifestos K8s na raiz em `k8s/` (paralelo a `nginx/`, que já guarda os artefatos de infraestrutura da Fase 8). Terraform em `terraform/`, separado dos manifestos para deixar claro que é uma camada opcional de provisionamento, não de orquestração da aplicação.

## Complexity Tracking

Nenhuma violação da constituição identificada — não aplicável.
