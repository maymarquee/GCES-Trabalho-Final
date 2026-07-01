# Data Model: CD & Segurança de Rede — HTTPS via Cert Manager

**Branch**: `010-cd-https-cert-manager` | **Date**: 2026-06-10

## Visão geral

Esta fase não adiciona novos dados de aplicação (nenhuma tabela/coluna nova no Postgres). Os "recursos" são objetos do Kubernetes (TLS) e um job de CI (publicação de imagens). O diagrama abaixo estende o da Fase 9 com a cadeia de emissão de certificado e o novo estágio de pipeline.

```text
                         ┌─────────────────────────────┐
                         │   cert-manager (ns: cert-manager)  │
                         │   (instalado via Terraform/quickstart, fora de k8s/) │
                         └───────────────┬─────────────┘
                                          │ observa
                                          ▼
┌──────────────────────┐   issuerRef    ┌───────────────────────┐
│ ClusterIssuer          │◄──────────────│ Certificate mkjs-tls    │
│ selfsigned-issuer       │   (kind:       │ (ns: mkjs)              │
│ (selfSigned: {})        │  ClusterIssuer)│ dnsNames: [mkjs.local]  │
└──────────────────────┘                │ secretName: mkjs-tls    │
                                          └───────────┬─────────────┘
                                                       │ materializa
                                                       ▼
                                          ┌───────────────────────┐
                                          │ Secret mkjs-tls         │
                                          │ type: kubernetes.io/tls │
                                          │ (ns: mkjs)              │
                                          └───────────┬─────────────┘
                                                       │ spec.tls.secretName
                                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ Ingress mkjs (ns: mkjs)                                            │
│  - spec.tls: hosts=[mkjs.local], secretName=mkjs-tls               │
│  - annotations: ssl-redirect=true, force-ssl-redirect=true         │
│  - rules: mkjs.local → Service nginx:80  (inalterado, Fase 9)      │
└──────────────────────────────────────────────────────────────────┘
                          ▲
                          │ HTTP 80 → 308 → HTTPS 443
                          │
                  Cliente (browser) — mkjs.local via /etc/hosts (Fase 9)
```

## Recursos novos/alterados

### `ClusterIssuer` `selfsigned-issuer`

- **Escopo**: cluster-wide (sem `namespace`).
- **Spec**: `selfSigned: {}` — gera chave/certificado autoassinado sob demanda, sem CA pré-existente.
- **Consumido por**: `Certificate mkjs-tls` (`issuerRef.kind: ClusterIssuer`, `issuerRef.name: selfsigned-issuer`).

### `Certificate` `mkjs-tls` (namespace `mkjs`)

| Campo | Valor |
|---|---|
| `spec.secretName` | `mkjs-tls` |
| `spec.dnsNames` | `[mkjs.local]` |
| `spec.issuerRef.kind` | `ClusterIssuer` |
| `spec.issuerRef.name` | `selfsigned-issuer` |

- **Status esperado**: `status.conditions[type=Ready].status == "True"` após o `cert-manager` emitir o certificado (segundos após `kubectl apply -k k8s/`, assumindo o `cert-manager` já instalado).

### `Secret` `mkjs-tls` (namespace `mkjs`, gerenciado pelo cert-manager)

- **Type**: `kubernetes.io/tls`.
- **Chaves**: `tls.crt`, `tls.key` (geradas/atualizadas pelo `cert-manager`; não editar manualmente).
- **Não é declarado em `k8s/`** — é criado/atualizado pelo controller do `cert-manager` a partir do `Certificate mkjs-tls`.

### `Ingress` `mkjs` (atualizado)

| Campo | Fase 9 | Fase 10 |
|---|---|---|
| `metadata.annotations` | `proxy-read-timeout`, `proxy-send-timeout` | + `ssl-redirect: "true"`, `force-ssl-redirect: "true"` |
| `spec.tls` | (ausente) | `[{hosts: [mkjs.local], secretName: mkjs-tls}]` |
| `spec.rules` | `mkjs.local` → `nginx:80` | inalterado |

### `k8s/kustomization.yaml` (atualizado)

- Adiciona `cert-issuer.yaml` e `certificate.yaml` à lista `resources`.
- Ordem relativa: ambos podem vir após `namespace.yaml` (o `Certificate` referencia o namespace `mkjs`, que já é criado pelo `namespace.yaml`); o `ClusterIssuer` é cluster-scoped e independe de ordem.

## Pipeline CI — estágio `release`

### Job `release:images`

| Campo | Valor |
|---|---|
| `stage` | `release` (novo, após `infra`) |
| `image` | `docker:27` |
| `services` | `[docker:27-dind]` |
| `rules` | `if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH` |
| Variáveis usadas | `$CI_REGISTRY`, `$CI_REGISTRY_USER`, `$CI_REGISTRY_PASSWORD`, `$CI_REGISTRY_IMAGE`, `$CI_COMMIT_SHORT_SHA` (predefinidas) |
| Imagens publicadas | `$CI_REGISTRY_IMAGE/mkjs-app:{$CI_COMMIT_SHORT_SHA,latest}`, `$CI_REGISTRY_IMAGE/mkjs-nginx:{$CI_COMMIT_SHORT_SHA,latest}` |
| Dockerfiles usados | `Dockerfile.prod` (build de `mkjs-app`), `nginx/Dockerfile` (build de `mkjs-nginx`) — ambos da Fase 8, contexto `.` (raiz do repositório) |

## (Opcional) Recursos Terraform

### `null_resource.cert_manager` (novo)

- **`depends_on`**: `null_resource.ingress_nginx`.
- **`local-exec`**: `kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.yaml --context kind-${var.cluster_name}` seguido de `kubectl wait --namespace cert-manager --for=condition=available deployment --all --timeout=180s --context kind-${var.cluster_name}`.
- **Consumido por**: `null_resource.app_manifests` passa a depender de `null_resource.cert_manager` (em vez de — ou além de — `null_resource.ingress_nginx`), garantindo que as CRDs `ClusterIssuer`/`Certificate` existam antes de `kubectl apply -k k8s/`.

### `outputs.tf` (atualizado)

- Novo output `https_url` = `"https://mkjs.local:${var.https_port}"` (paralelo ao `app_url` existente, agora documentado como a URL preferencial após esta fase).
