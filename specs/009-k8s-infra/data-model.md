# Data Model: Infraestrutura — Kubernetes & Terraform

**Branch**: `009-k8s-infra` | **Date**: 2026-06-10

## Visão geral do namespace `mkjs`

```
namespace/mkjs
├── configmap/mkjs-config        (PGHOST, PGPORT, PGDATABASE, PGUSER)
├── secret/mkjs-secrets           (PGPASSWORD)
├── configmap/postgres-init       (init.sql — tabela matches)
├── persistentvolumeclaim/postgres-data   (1Gi, RWO)
├── statefulset/postgres (1 réplica) ──> service/postgres (headless, ClusterIP: None)
├── deployment/app (1 réplica)        ──> service/app (ClusterIP, :55555)
├── deployment/nginx (2 réplicas)     ──> service/nginx (ClusterIP, :80)
└── ingress/mkjs (host: mkjs.local)   ──> service/nginx:80
```

## Recursos

### `Namespace` `mkjs`

| Campo | Valor |
|-------|-------|
| apiVersion | `v1` |
| kind | `Namespace` |
| metadata.name | `mkjs` |

---

### `ConfigMap` `mkjs-config`

| Chave | Valor | Origem |
|-------|-------|--------|
| `PGHOST` | `postgres` | nome do `Service` headless do Postgres |
| `PGPORT` | `"5432"` | porta padrão Postgres |
| `PGDATABASE` | `mkjs` | igual a `docker-compose.yml` |
| `PGUSER` | `mkjs` | igual a `docker-compose.yml` |

Consumido por: `Deployment app` (via `envFrom.configMapRef`) e `StatefulSet postgres` (via `valueFrom.configMapKeyRef` para `POSTGRES_USER`/`POSTGRES_DB`).

---

### `Secret` `mkjs-secrets` (tipo `Opaque`)

| Chave | Valor (stringData) | Observação |
|-------|---------------------|------------|
| `PGPASSWORD` | `mkjs` | Mesma credencial padrão de `docker-compose.yml`/`docker-compose.prod.yml`; adequada para cluster local. |

Consumido por: `Deployment app` (via `envFrom.secretRef`) e `StatefulSet postgres` (via `valueFrom.secretKeyRef` para `POSTGRES_PASSWORD`).

---

### `ConfigMap` `postgres-init`

| Chave | Valor |
|-------|-------|
| `init.sql` | Cópia literal de `server/db/init.sql` (tabela `matches`) |

Montado em `/docker-entrypoint-initdb.d/init.sql` no container `postgres` — a imagem oficial `postgres:16-alpine` executa todo `.sql`/`.sh` desse diretório no primeiro boot (volume de dados vazio).

---

### `PersistentVolumeClaim` `postgres-data`

| Campo | Valor |
|-------|-------|
| accessModes | `["ReadWriteOnce"]` |
| resources.requests.storage | `1Gi` |
| storageClassName | (não definido — usa o `StorageClass` default do cluster: `standard` no `kind`, `standard`/`hostpath` no `minikube`) |

Montado em `/var/lib/postgresql/data` no pod `postgres-0`, com `PGDATA=/var/lib/postgresql/data/pgdata` (subdiretório, evita conflito com `lost+found` em alguns provisioners).

---

### `StatefulSet` `postgres`

| Campo | Valor |
|-------|-------|
| serviceName | `postgres` |
| replicas | `1` |
| image | `postgres:16-alpine` |
| containerPort | `5432` |
| env | `POSTGRES_USER` ← ConfigMap, `POSTGRES_PASSWORD` ← Secret, `POSTGRES_DB` ← ConfigMap, `PGDATA` (literal) |
| volumeMounts | `postgres-data` → `/var/lib/postgresql/data`; `postgres-init` (ConfigMap) → `/docker-entrypoint-initdb.d` |
| readinessProbe / livenessProbe | `exec: pg_isready -U mkjs` |

### `Service` `postgres`

| Campo | Valor |
|-------|-------|
| type | `ClusterIP` |
| clusterIP | `None` (headless — DNS estável `postgres-0.postgres.mkjs.svc.cluster.local`) |
| selector | `app: postgres` |
| ports | `5432 → 5432` |

---

### `Deployment` `app`

| Campo | Valor |
|-------|-------|
| replicas | `1` (ver `research.md` — estado em memória do `GameCollection`) |
| image | `mkjs-app:latest` (build local de `Dockerfile.prod`, Fase 8) |
| containerPort | `55555` |
| envFrom | `configMapRef: mkjs-config`, `secretRef: mkjs-secrets` |
| readinessProbe | `httpGet: { path: /, port: 55555 }` |
| livenessProbe | `httpGet: { path: /, port: 55555 }` |

### `Service` `app`

| Campo | Valor |
|-------|-------|
| type | `ClusterIP` |
| selector | `app: mkjs-app` |
| ports | `55555 → 55555` |

---

### `Deployment` `nginx`

| Campo | Valor |
|-------|-------|
| replicas | `2` (camada stateless) |
| image | `mkjs-nginx:latest` (build local de `nginx/Dockerfile`, Fase 8) |
| containerPort | `80` |
| readinessProbe | `httpGet: { path: /, port: 80 }` |
| livenessProbe | `httpGet: { path: /, port: 80 }` |

### `Service` `nginx`

| Campo | Valor |
|-------|-------|
| type | `ClusterIP` |
| selector | `app: mkjs-nginx` |
| ports | `80 → 80` |

---

### `Ingress` `mkjs`

| Campo | Valor |
|-------|-------|
| ingressClassName | `nginx` |
| host | `mkjs.local` |
| path | `/` (Prefix) → `service/nginx:80` |
| annotations | `nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"`, `nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"` (conexões WebSocket Socket.io de longa duração) |
| TLS | Não configurado nesta fase (Fase 10 — cert-manager) |

---

## Fluxo de dados (request roteado pelo Ingress)

```
navegador → Ingress (mkjs.local) → Service nginx:80 → pod nginx
                                                          ├── /            → arquivos estáticos (game/)
                                                          ├── /socket.io/  → proxy_pass → Service app:55555 → pod app → io (Socket.io)
                                                          └── /api/        → proxy_pass → Service app:55555 → pod app → GET /api/matches → db.js (pg.Pool) → Service postgres:5432 → pod postgres-0 → PVC postgres-data
```

## (Opcional) Recursos Terraform

Único provider declarado: `hashicorp/null` (`~> 3.2`). Todos os recursos usam `null_resource` + `local-exec` chamando as CLIs `kind`/`kubectl`.

### `null_resource.kind_cluster`

| Campo | Valor |
|-------|-------|
| trigger `cluster_name` | `mkjs` (`var.cluster_name`) |
| trigger `http_port` / `https_port` | `var.http_port` / `var.https_port` (mapeados para o host via `extraPortMappings`) |
| `local-exec` (create) | gera `.kind-config.yaml` (node `control-plane` com label `ingress-ready=true` e `extraPortMappings` 80/443) e roda `kind create cluster --name mkjs --config .kind-config.yaml` |
| `local-exec` (destroy) | `kind delete cluster --name mkjs` |

### `null_resource.ingress_nginx`

`local-exec` aplicando o manifesto oficial `ingress-nginx` para `kind` (`--context kind-mkjs`) e aguardando o controller ficar `Ready` via `kubectl wait`. Depende de `null_resource.kind_cluster`.

### `null_resource.app_manifests`

`local-exec` executando `kubectl apply -k ../k8s --context kind-mkjs`. Depende de `null_resource.ingress_nginx`. `triggers.manifests_hash` recalcula o hash (sha1) dos arquivos em `k8s/` para reaplicar quando os manifestos mudarem.

### Outputs

| Output | Valor |
|--------|-------|
| `cluster_context` | `kind-${var.cluster_name}` (uso: `kubectl --context <valor> ...`) |
| `app_url` | `http://mkjs.local:${var.http_port}` |

## Pipeline CI — estágio `infra`

| Job | Imagem | Comando | Requer cluster? |
|-----|--------|---------|-----------------|
| `k8s:validate` | `alpine/k8s:1.30.2` | `kubectl kustomize k8s/` | Não |
| `terraform:validate` | `hashicorp/terraform:1.9` | `cd terraform && terraform fmt -check && terraform init -backend=false && terraform validate` | Não |
