# Contract: TLS via Cert Manager & CD Image Publishing

**Branch**: `010-cd-https-cert-manager` | **Date**: 2026-06-10

## ClusterIssuer → Certificate → Secret → Ingress

```text
ClusterIssuer/selfsigned-issuer (cluster-scoped)
  spec.selfSigned: {}

Certificate/mkjs-tls (ns: mkjs)
  spec.secretName: mkjs-tls
  spec.dnsNames: [mkjs.local]
  spec.issuerRef: {kind: ClusterIssuer, name: selfsigned-issuer}

Secret/mkjs-tls (ns: mkjs, type: kubernetes.io/tls)
  managed by cert-manager — DO NOT edit tls.crt/tls.key manually

Ingress/mkjs (ns: mkjs)
  spec.tls: [{hosts: [mkjs.local], secretName: mkjs-tls}]
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
```

### Garantias

- `kubectl get clusterissuer selfsigned-issuer` → `READY: True`.
- `kubectl get certificate mkjs-tls -n mkjs` → `READY: True`, `SECRET: mkjs-tls`.
- `kubectl get secret mkjs-tls -n mkjs` → `TYPE: kubernetes.io/tls`, chaves `tls.crt`/`tls.key`.
- `curl -k -I https://mkjs.local/` → `200 OK` (com `-k` porque o certificado é autoassinado).
- `curl -k -I http://mkjs.local/` → `308 Permanent Redirect`, header `Location: https://mkjs.local/`.
- `kubectl get svc -n mkjs` → `app`, `nginx`, `postgres` todos `ClusterIP` (sem `NodePort`/`LoadBalancer` novos).

### Pré-requisito (fora de `k8s/`)

- `cert-manager` instalado e com os deployments `cert-manager`, `cert-manager-cainjector`, `cert-manager-webhook` (`namespace: cert-manager`) em `Available=True` **antes** de `kubectl apply -k k8s/` — caso contrário `ClusterIssuer`/`Certificate` falham com `no matches for kind`.

---

## CI — Estágio `release`

### Job `release:images`

```yaml
release:images:
  stage: release
  image: docker:27
  services:
    - docker:27-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
  before_script:
    - docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" "$CI_REGISTRY"
  script:
    - docker build -f Dockerfile.prod -t "$CI_REGISTRY_IMAGE/mkjs-app:$CI_COMMIT_SHORT_SHA" -t "$CI_REGISTRY_IMAGE/mkjs-app:latest" .
    - docker build -f nginx/Dockerfile -t "$CI_REGISTRY_IMAGE/mkjs-nginx:$CI_COMMIT_SHORT_SHA" -t "$CI_REGISTRY_IMAGE/mkjs-nginx:latest" .
    - docker push "$CI_REGISTRY_IMAGE/mkjs-app:$CI_COMMIT_SHORT_SHA"
    - docker push "$CI_REGISTRY_IMAGE/mkjs-app:latest"
    - docker push "$CI_REGISTRY_IMAGE/mkjs-nginx:$CI_COMMIT_SHORT_SHA"
    - docker push "$CI_REGISTRY_IMAGE/mkjs-nginx:latest"
```

### Garantias

- Roda apenas quando `CI_COMMIT_BRANCH == CI_DEFAULT_BRANCH` (branch `main`).
- Estágio `release` é o último da lista `stages` — sem `needs`, GitLab só inicia um estágio depois que **todos** os jobs do(s) estágio(s) anterior(es) tiverem sucesso. Logo, `release:images` só roda se `build`, `lint:*`, `test:*`, `semgrep-sast`, `sca:npm-audit`, `sonarcloud`, `k8s:validate` e `terraform:validate` passarem.
- `$CI_REGISTRY`, `$CI_REGISTRY_USER`, `$CI_REGISTRY_PASSWORD`, `$CI_REGISTRY_IMAGE` são predefinidas pelo runner GitLab.com — nenhuma variável de CI/CD adicional precisa ser cadastrada manualmente.

---

## Pipeline Completo (estágios e jobs após esta fase)

```text
build      → build
lint       → lint:back, lint:front
test       → test:unit, test:fuzz
security   → semgrep-sast, sca:npm-audit
quality    → sonarcloud
infra      → k8s:validate, terraform:validate
release    → release:images   (NOVO — apenas branch main)
```
