# Contract: Kubernetes Manifests & CI Validation

**Branch**: `009-k8s-infra` | **Date**: 2026-06-10

## Namespace

Todos os recursos abaixo (exceto o próprio `Namespace` e o `Ingress`, que herdam o campo `namespace`) vivem em `metadata.namespace: mkjs`.

## ConfigMap `mkjs-config` → consumidores

| Consumidor | Mecanismo | Chaves usadas |
|---|---|---|
| `Deployment app` | `envFrom.configMapRef.name: mkjs-config` | `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` |
| `StatefulSet postgres` | `env[].valueFrom.configMapKeyRef` | `POSTGRES_DB ← PGDATABASE`, `POSTGRES_USER ← PGUSER` |

## Secret `mkjs-secrets` → consumidores

| Consumidor | Mecanismo | Chaves usadas |
|---|---|---|
| `Deployment app` | `envFrom.secretRef.name: mkjs-secrets` | `PGPASSWORD` |
| `StatefulSet postgres` | `env[].valueFrom.secretKeyRef` | `POSTGRES_PASSWORD ← PGPASSWORD` |

**Garantia**: nenhum manifesto de `Deployment`/`StatefulSet` contém o valor da senha em texto plano — apenas referências (`secretKeyRef`/`secretRef`).

## Service Discovery

| Service | DNS interno | Porta | Selector |
|---|---|---|---|
| `postgres` (headless) | `postgres.mkjs.svc.cluster.local` | `5432` | `app: postgres` |
| `app` | `app.mkjs.svc.cluster.local` | `55555` | `app: mkjs-app` |
| `nginx` | `nginx.mkjs.svc.cluster.local` | `80` | `app: mkjs-nginx` |

`mkjs-config.PGHOST=postgres` resolve via DNS do `Service` headless para o pod `postgres-0`.

## Ingress `mkjs`

```yaml
spec:
  ingressClassName: nginx
  rules:
    - host: mkjs.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: nginx
                port:
                  number: 80
```

### Garantias

- **Pré-condição**: controller `ingress-nginx` instalado e `Ready` no cluster (ver `quickstart.md`).
- **Roteamento**: toda requisição para `Host: mkjs.local` é encaminhada ao `Service nginx:80`, que por sua vez:
  - serve arquivos estáticos de `game/` para `/`;
  - faz proxy de `/socket.io/` e `/api/` para `Service app:55555` (configuração herdada de `nginx/nginx.conf`, Fase 8).
- **WebSocket**: anotações `nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"` e `proxy-send-timeout: "3600"` evitam que o controller derrube conexões Socket.io de partidas longas (timeout default de 60s seria insuficiente).
- **TLS**: não configurado nesta fase — `spec.tls` fica vazio. A Fase 10 adiciona um bloco `tls:` com `secretName` gerenciado pelo `cert-manager` ao mesmo `Ingress`.

## Probes

| Workload | Probe | Configuração |
|---|---|---|
| `app` | readiness + liveness | `httpGet: { path: /, port: 55555 }` |
| `nginx` | readiness + liveness | `httpGet: { path: /, port: 80 }` |
| `postgres` | readiness + liveness | `exec: ["pg_isready", "-U", "mkjs"]` |

**Garantia**: um pod só recebe tráfego (`readinessProbe` OK) depois que o processo correspondente responde com sucesso; `livenessProbe` reinicia o container se ele parar de responder.

## Persistência

| Recurso | Garantia |
|---|---|
| `PersistentVolumeClaim postgres-data` | `ReadWriteOnce`, `1Gi`. Sobrevive a `kubectl delete pod postgres-0 -n mkjs` — o `StatefulSet` recria o pod e remonta o mesmo PVC. |
| `ConfigMap postgres-init` | Aplicado pela imagem `postgres:16-alpine` apenas no **primeiro** boot com volume de dados vazio (comportamento padrão da imagem oficial — `docker-entrypoint-initdb.d`). |

## CI — Estágio `infra`

### Job `k8s:validate`

```yaml
k8s:validate:
  stage: infra
  image: alpine/k8s:1.30.2
  script:
    - kubectl kustomize k8s/
```

- **Pré-condição**: nenhuma — roda sobre o código-fonte do repositório, sem cluster.
- **Sucesso**: `kubectl kustomize k8s/` renderiza todos os manifestos sem erro (exit `0`); a saída YAML é impressa no log.
- **Falha**: erro de sintaxe YAML, referência a arquivo inexistente em `kustomization.yaml`, ou recurso malformado → exit `1`, pipeline falha.

### Job `terraform:validate`

```yaml
terraform:validate:
  stage: infra
  image: hashicorp/terraform:1.9
  script:
    - cd terraform
    - terraform fmt -check
    - terraform init -backend=false
    - terraform validate
```

- **Pré-condição**: diretório `terraform/` existe com arquivos `.tf`.
- **Sucesso**: `terraform validate` confirma que a configuração é sintaticamente válida e internamente consistente (tipos, referências entre recursos).
- **Falha**: `terraform fmt -check` detecta formatação fora do padrão, ou `terraform validate` encontra erro de sintaxe/referência → exit `1`, pipeline falha.
- **Fora do escopo**: `terraform apply`/`destroy` (criação real de cluster) não roda no CI — fluxo local, documentado em `quickstart.md`.

## Pipeline Completo (estágios e jobs após esta fase)

| Estágio | Jobs |
|---|---|
| `build` | `build` |
| `lint` | `lint:back`, `lint:front` |
| `test` | `test:unit`, `test:fuzz` |
| `security` | `semgrep-sast`, `sca:npm-audit` |
| `quality` | `sonarcloud` |
| `infra` | `k8s:validate`, `terraform:validate` |
