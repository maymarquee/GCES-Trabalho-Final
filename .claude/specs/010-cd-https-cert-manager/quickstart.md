# Quickstart: CD & Segurança de Rede — HTTPS via Cert Manager

**Branch**: `010-cd-https-cert-manager` | **Date**: 2026-06-10

**Pré-requisitos**: cluster `kind` da Fase 9 já criado, com `ingress-nginx` instalado, `mkjs.local` no `/etc/hosts`/`hosts` do Windows apontando para `127.0.0.1`, e `kubectl apply -k k8s/` já aplicado pelo menos uma vez.

---

## Opção A — Instalação manual do `cert-manager`

```bash
# 1. Instalar o cert-manager (CRDs + controllers, namespace cert-manager)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.yaml

# 2. Aguardar os controllers ficarem prontos
kubectl wait --namespace cert-manager \
  --for=condition=available deployment --all --timeout=180s

# 3. (Re)aplicar os manifestos da aplicação — agora incluem ClusterIssuer e Certificate
kubectl apply -k k8s/
```

---

## Opção B — Via Terraform (estende a Fase 9)

```bash
cd terraform
terraform apply
```

`terraform apply` agora também instala o `cert-manager` (entre o `ingress-nginx` e a aplicação dos manifestos), na mesma ordem da Opção A.

---

## Verificar a emissão do certificado

```bash
kubectl get clusterissuer
# NAME                READY   AGE
# selfsigned-issuer   True    ...

kubectl get certificate -n mkjs
# NAME       READY   SECRET     AGE
# mkjs-tls   True    mkjs-tls   ...

kubectl get secret mkjs-tls -n mkjs
# NAME       TYPE                DATA   AGE
# mkjs-tls   kubernetes.io/tls   2      ...
```

Se `mkjs-tls` não ficar `READY=True` em alguns segundos, descreva o recurso para depurar:

```bash
kubectl describe certificate mkjs-tls -n mkjs
kubectl describe certificaterequest -n mkjs
```

---

## Acessar o jogo via HTTPS

Abra `https://mkjs.local/` no navegador. Como o certificado é emitido por um `ClusterIssuer` autoassinado (sem CA pública), o navegador exibe um aviso ("A conexão não é particular" / "NET::ERR_CERT_AUTHORITY_INVALID") — clique em **Avançado → Continuar para mkjs.local**. Isso é esperado para este ambiente local/educacional.

Para testar o modo Rede (Socket.io via `wss://`): abra `https://mkjs.local/` em duas abas, aceite o aviso em ambas, entre com o mesmo nome de partida e jogue normalmente.

### (Opcional) Confiar no certificado para evitar o aviso

```bash
# Extrair o certificado do Secret gerado pelo cert-manager
kubectl get secret mkjs-tls -n mkjs -o jsonpath='{.data.tls\.crt}' | base64 -d > mkjs-local.crt

# Linux: adicionar ao trust store do sistema
sudo cp mkjs-local.crt /usr/local/share/ca-certificates/mkjs-local.crt
sudo update-ca-certificates

# Windows (PowerShell como Administrador): importar no repositório de Autoridades Confiáveis
Import-Certificate -FilePath .\mkjs-local.crt -CertStoreLocation Cert:\LocalMachine\Root
```

---

## Verificar o redirecionamento HTTP → HTTPS

```bash
curl -k -I http://mkjs.local/
# HTTP/1.1 308 Permanent Redirect
# Location: https://mkjs.local/

curl -k -I https://mkjs.local/
# HTTP/2 200
```

---

## Verificar superfície de rede (nenhuma porta extra exposta)

```bash
kubectl get svc -n mkjs
# app, nginx, postgres → todos TYPE=ClusterIP

kubectl get svc -n ingress-nginx
# apenas o controller ingress-nginx expõe portas (mapeadas para 80/443 do host via kind)
```

---

## CD — publicação de imagens no Container Registry

A cada push na branch `main` que passe pelos estágios `build`, `lint`, `test`, `security`, `quality` e `infra`, o estágio `release` builda e publica:

- `$CI_REGISTRY_IMAGE/mkjs-app:<sha-curto>` e `:latest`
- `$CI_REGISTRY_IMAGE/mkjs-nginx:<sha-curto>` e `:latest`

Para visualizar: no projeto GitLab, acesse **Deploy → Container Registry** (ou **Packages and registries → Container Registry**).

Para baixar uma imagem publicada localmente (ex.: para inspecionar):

```bash
docker login registry.gitlab.com
docker pull registry.gitlab.com/<namespace>/<projeto>/mkjs-app:latest
```

> O deploy no cluster `kind` local continua via `kind load docker-image` (Fase 9) — esta fase publica as imagens como artefato versionado, mas não substitui o fluxo de carregamento local de imagens (não há cluster remoto/VPS para apontar `imagePullSecrets`).

---

## Validar manifestos localmente (mesmo comando do CI)

```bash
kubectl kustomize k8s/
# renderiza ClusterIssuer, Certificate e o Ingress com spec.tls — sem erro,
# mesmo sem o cert-manager instalado (kustomize não valida CRDs contra a API server)
```

---

## Limpar tudo

```bash
kubectl delete -k k8s/
kubectl delete -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.yaml
kind delete cluster --name mkjs   # ou: terraform destroy (na pasta terraform/)
```
