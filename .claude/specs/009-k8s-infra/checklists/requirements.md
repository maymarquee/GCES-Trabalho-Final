# Requirements Checklist: Infraestrutura — Kubernetes & Terraform

**Branch**: `009-k8s-infra` | **Date**: 2026-06-10

## Manifestos Kubernetes

- [ ] `k8s/namespace.yaml` define o namespace `mkjs`
- [ ] `k8s/configmap.yaml` define `mkjs-config` com `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`
- [ ] `k8s/secret.yaml` define `mkjs-secrets` (tipo `Opaque`) com `PGPASSWORD`
- [ ] `k8s/postgres-init-configmap.yaml` espelha `server/db/init.sql`
- [ ] `k8s/postgres-pvc.yaml` define PVC `postgres-data` (`ReadWriteOnce`, `1Gi`)
- [ ] `k8s/postgres-statefulset.yaml` define `StatefulSet postgres` (1 réplica), monta PVC e ConfigMap de init, define probes `pg_isready`
- [ ] `k8s/postgres-service.yaml` define `Service postgres` headless (`clusterIP: None`)
- [ ] `k8s/app-deployment.yaml` define `Deployment app` (1 réplica), `envFrom` ConfigMap+Secret, probes `httpGet /`
- [ ] `k8s/app-service.yaml` define `Service app` (ClusterIP, porta 55555)
- [ ] `k8s/nginx-deployment.yaml` define `Deployment nginx` (2 réplicas), probes `httpGet /`
- [ ] `k8s/nginx-service.yaml` define `Service nginx` (ClusterIP, porta 80)
- [ ] `k8s/ingress.yaml` define `Ingress mkjs` (host `mkjs.local`, `ingressClassName: nginx`, anotações de timeout WebSocket)
- [ ] `k8s/kustomization.yaml` lista todos os recursos acima
- [ ] `kubectl kustomize k8s/` renderiza sem erro

## Terraform (opcional)

- [ ] `terraform/versions.tf` define `required_version` e provider `hashicorp/null`
- [ ] `terraform/variables.tf` define `cluster_name`, `http_port`, `https_port`
- [ ] `terraform/main.tf` define `null_resource.kind_cluster`, `null_resource.ingress_nginx` e `null_resource.app_manifests` (todos via `local-exec` com `kind`/`kubectl`)
- [ ] `terraform/outputs.tf` expõe `cluster_context`, `app_url`
- [ ] `terraform fmt -check` e `terraform validate` passam

## CI/CD

- [ ] `.gitlab-ci.yml` define o estágio `infra` após `quality`
- [ ] Job `k8s:validate` executa `kubectl kustomize k8s/`
- [ ] Job `terraform:validate` executa `terraform fmt -check && terraform init -backend=false && terraform validate`
- [ ] Pipeline passa com 10 jobs (build, lint:back, lint:front, test:unit, test:fuzz, semgrep-sast, sca:npm-audit, sonarcloud, k8s:validate, terraform:validate)

## Documentação

- [ ] `ComoRodar.md` atualizado com seção "Kubernetes (K8s)"
- [ ] Seção explica criação do cluster (`kind`), build/load das imagens, `kubectl apply -k k8s/`
- [ ] Seção explica acesso via `mkjs.local` (Ingress) e alternativa via `port-forward`
- [ ] Seção explica como verificar persistência via PVC
- [ ] Todos os arquivos em `specs/009-k8s-infra/` criados e preenchidos

## Qualidade

- [ ] Commits atômicos e espaçados (specs → config/secrets → postgres → app/nginx/ingress → terraform → ci → docs)
- [ ] Nenhum segredo real commitado — `Secret` usa as mesmas credenciais de desenvolvimento já presentes em `docker-compose.yml`
- [ ] Nenhum manifesto de `Deployment`/`StatefulSet` contém valores sensíveis literais
- [ ] `replicas: 1` do `Deployment app` documentado como limitação conhecida em `research.md`
