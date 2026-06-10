# Requirements Checklist: CD & Segurança de Rede — HTTPS via Cert Manager

**Branch**: `010-cd-https-cert-manager` | **Date**: 2026-06-10

## TLS via Cert Manager

- [ ] `k8s/cert-issuer.yaml` define `ClusterIssuer selfsigned-issuer` (`spec.selfSigned: {}`)
- [ ] `k8s/certificate.yaml` define `Certificate mkjs-tls` (ns `mkjs`, `secretName: mkjs-tls`, `dnsNames: [mkjs.local]`, `issuerRef` → `selfsigned-issuer`)
- [ ] `k8s/ingress.yaml` define `spec.tls` (`hosts: [mkjs.local]`, `secretName: mkjs-tls`)
- [ ] `k8s/ingress.yaml` define anotações `ssl-redirect: "true"` e `force-ssl-redirect: "true"`
- [ ] `k8s/kustomization.yaml` lista `cert-issuer.yaml` e `certificate.yaml`
- [ ] `kubectl kustomize k8s/` renderiza sem erro com os novos recursos

## Terraform (opcional)

- [ ] `terraform/main.tf` define `null_resource.cert_manager` (instala manifesto oficial do cert-manager + `kubectl wait`), entre `ingress_nginx` e `app_manifests`
- [ ] `terraform/outputs.tf` expõe `https_url`
- [ ] `terraform fmt -check` e `terraform validate` passam

## CI/CD

- [ ] `.gitlab-ci.yml` define o estágio `release` após `infra`
- [ ] Job `release:images` builda `Dockerfile.prod` e `nginx/Dockerfile`, publica `$CI_REGISTRY_IMAGE/mkjs-app` e `$CI_REGISTRY_IMAGE/mkjs-nginx` com tags `$CI_COMMIT_SHORT_SHA` e `latest`
- [ ] Job `release:images` restrito a `$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH`
- [ ] Pipeline passa com 11 jobs (10 da Fase 9 + `release:images`)

## Verificação funcional (manual, cluster local)

- [ ] `kubectl get clusterissuer selfsigned-issuer` → `READY=True`
- [ ] `kubectl get certificate mkjs-tls -n mkjs` → `READY=True`
- [ ] `kubectl get secret mkjs-tls -n mkjs` → `type: kubernetes.io/tls`
- [ ] `https://mkjs.local/` carrega o jogo (após aceitar aviso de cert autoassinado)
- [ ] `curl -k -I http://mkjs.local/` → `308` para `https://mkjs.local/`
- [ ] `kubectl get svc -n mkjs` → `app`/`nginx`/`postgres` todos `ClusterIP`
- [ ] Duas abas em `https://mkjs.local/` completam uma partida em modo Rede (`wss://`)

## Documentação

- [ ] `ComoRodar.md` atualizado com seção "HTTPS (cert-manager)"
- [ ] `ComoRodar.md` atualizado com seção "CD — publicação de imagens"
- [ ] Todos os arquivos em `specs/010-cd-https-cert-manager/` criados e preenchidos

## Qualidade

- [ ] Commits atômicos e espaçados (specs → terraform cert-manager → k8s ClusterIssuer/Certificate → k8s ingress TLS → ci release → docs)
- [ ] Nenhum segredo/credencial novo commitado — registry usa variáveis `CI_REGISTRY_*` predefinidas pelo GitLab
- [ ] `Secret mkjs-tls` não é declarado/commitado manualmente — apenas gerado pelo cert-manager em runtime
