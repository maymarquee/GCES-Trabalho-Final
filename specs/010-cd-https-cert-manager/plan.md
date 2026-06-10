# Implementation Plan: CD & Segurança de Rede — HTTPS via Cert Manager

**Branch**: `010-cd-https-cert-manager` | **Date**: 2026-06-10 | **Spec**: [spec.md](./spec.md)

## Summary

Estender a infraestrutura Kubernetes da Fase 9 com TLS local via `cert-manager`: instalar o `cert-manager` no cluster (terraform `null_resource`, análogo ao `ingress-nginx`), adicionar um `ClusterIssuer` `selfsigned-issuer` e um `Certificate mkjs-tls` (namespace `mkjs`) a `k8s/`, e atualizar o `Ingress mkjs` com `spec.tls` + anotações `ssl-redirect`/`force-ssl-redirect` para servir `https://mkjs.local` e redirecionar `http://` → `https://`. Em paralelo, adicionar um estágio `release` ao `.gitlab-ci.yml` com um job `release:images` que builda `Dockerfile.prod`/`nginx/Dockerfile` e publica `mkjs-app`/`mkjs-nginx` no GitLab Container Registry do projeto a cada push em `main`, fechando o ciclo "CD" do nome da fase.

## Technical Context

**TLS local**: `cert-manager` v1.16.2 (manifesto oficial), `ClusterIssuer` `selfsigned-issuer` (`spec.selfSigned: {}`), `Certificate mkjs-tls` → `Secret mkjs-tls` (tipo `kubernetes.io/tls`).

**Ingress**: `ingress-nginx` (já instalado na Fase 9) consome `spec.tls`/`secretName` do `Ingress mkjs`; `ssl-redirect`/`force-ssl-redirect` fazem o 80→443.

**Registry**: GitLab Container Registry do próprio projeto (`$CI_REGISTRY_IMAGE`), sem credenciais adicionais — variáveis `CI_REGISTRY*` predefinidas pelo GitLab Runner.

**Imagens publicadas**: `mkjs-app` (de `Dockerfile.prod`) e `mkjs-nginx` (de `nginx/Dockerfile`), tags `$CI_COMMIT_SHORT_SHA` e `latest`.

**Build em CI**: `image: docker:27` + `services: [docker:27-dind]` (Docker-in-Docker) — necessário para `docker build`/`docker push` dentro do runner GitLab.

**IaC**: `terraform/null_resource.cert_manager` instala o `cert-manager` (manifesto oficial + `kubectl wait` pelos deployments de `cert-manager`), entre `null_resource.ingress_nginx` e `null_resource.app_manifests`.

**Estado atual**: Pipeline tem 6 estágios (build, lint, test, security, quality, infra) com 10 jobs. Esta fase adiciona o estágio `release` com 1 novo job.

## Constitution Check

| Princípio | Status | Justificativa |
|---|---|---|
| I — Incremental & Atomic Delivery | ✅ PASS | Commits separados: specs → terraform (cert-manager) → k8s (ClusterIssuer/Certificate) → k8s (ingress TLS) → CI (release stage) → docs. |
| II — Environment Parity via Containers | ✅ PASS | Reaproveita as mesmas imagens `Dockerfile.prod`/`nginx/Dockerfile` da Fase 8 — esta fase apenas as publica, não introduz novos Dockerfiles. |
| III — Test- & Quality-Gated Changes | ✅ PASS | O estágio `release` roda por último, após `infra`; sem `needs` que pulem estágios, só inicia se build/lint/test/security/quality/infra tiverem sucesso. |
| IV — Security by Default | ✅ PASS | HTTPS via `cert-manager` (`ClusterIssuer` selfsigned), `ssl-redirect`/`force-ssl-redirect` garantindo 80→443, e nenhum `Service` de aplicação exposto além do `Ingress` — implementa diretamente o requisito de "Segurança de Rede" da Fase 10/Princípio IV. |
| V — Documentation as a Deliverable | ✅ PASS | `ComoRodar.md` recebe seções "HTTPS (cert-manager)" e "CD — publicação de imagens", cobrindo instalação do cert-manager, acesso HTTPS local e onde ver as imagens publicadas. |

## Project Structure

### Documentation (this feature)

```text
specs/010-cd-https-cert-manager/
├── plan.md                       # Este arquivo
├── spec.md                       # Especificação completa
├── research.md                   # Decisões: cert-manager selfsigned, Certificate explícito, registry GitLab, escopo do CD
├── data-model.md                 # Recursos K8s/Terraform/CI novos ou alterados, fluxo TLS
├── quickstart.md                 # Setup cert-manager, acesso HTTPS, verificação de redirecionamento, registry
├── contracts/
│   └── tls-cd-contract.md        # Contrato: ClusterIssuer/Certificate/Ingress TLS, job release:images
└── checklists/
    └── requirements.md          # Checklist de qualidade
```

### Source Code Changes

```text
/
├── k8s/
│   ├── cert-issuer.yaml                # NOVO: ClusterIssuer selfsigned-issuer
│   ├── certificate.yaml                # NOVO: Certificate mkjs-tls (namespace mkjs)
│   ├── ingress.yaml                    # ATUALIZADO: spec.tls + ssl-redirect/force-ssl-redirect
│   └── kustomization.yaml              # ATUALIZADO: inclui cert-issuer.yaml e certificate.yaml
├── terraform/
│   ├── main.tf                         # ATUALIZADO: null_resource.cert_manager (entre ingress_nginx e app_manifests)
│   └── outputs.tf                      # ATUALIZADO: output https_url
├── .gitlab-ci.yml                      # ATUALIZADO: estágio release, job release:images
└── ComoRodar.md                        # ATUALIZADO: seções "HTTPS (cert-manager)" e "CD — publicação de imagens"
```

**Structure Decision**: Novos manifestos de TLS ficam em `k8s/` junto dos demais recursos da aplicação (mesmo padrão de organização da Fase 9 — um arquivo por recurso, listado em `kustomization.yaml`). O `cert-manager` em si (controllers/CRDs, namespace `cert-manager`) é instalado fora de `k8s/`, da mesma forma que o `ingress-nginx` na Fase 9 — é infraestrutura de cluster, não parte da aplicação `mkjs`. O job de release fica em `.gitlab-ci.yml` como um estágio novo ao final do pipeline existente, sem reestruturar os estágios anteriores.

## Complexity Tracking

Nenhuma violação da constituição identificada — não aplicável.
