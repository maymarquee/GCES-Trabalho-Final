# Quickstart: Infraestrutura — Kubernetes & Terraform

**Branch**: `009-k8s-infra` | **Date**: 2026-06-10

Pré-requisito comum: **Docker** instalado e em execução.

## Opção A — Cluster manual com `kind`

**1. Instalar `kind` e criar o cluster com portas 80/443 mapeadas**

```bash
# instalar kind: https://kind.sigs.k8s.io/docs/user/quick-start/#installation

cat <<'EOF' > kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
EOF

kind create cluster --name mkjs --config kind-config.yaml
```

**2. Instalar o `ingress-nginx` (manifesto oficial específico para `kind`)**

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=180s
```

**3. Build das imagens de produção (Fase 8) e carga no cluster**

```bash
docker build -f Dockerfile.prod -t mkjs-app:latest .
docker build -f nginx/Dockerfile -t mkjs-nginx:latest .

kind load docker-image mkjs-app:latest --name mkjs
kind load docker-image mkjs-nginx:latest --name mkjs
```

**4. Aplicar os manifestos**

```bash
kubectl apply -k k8s/
```

**5. Acompanhar os pods até ficarem prontos**

```bash
kubectl get pods -n mkjs --watch
# Ctrl+C quando app, nginx (x2) e postgres-0 estiverem Running / 1/1
```

## Opção B — Cluster via Terraform (opcional)

```bash
cd terraform
terraform init
terraform apply
```

O `apply` cria o cluster `kind` (`mkjs`), instala o `ingress-nginx` e aplica `k8s/` automaticamente. **Ainda é necessário** construir e carregar as imagens (passo 3 da Opção A) — o Terraform não builda imagens Docker da aplicação.

```bash
docker build -f Dockerfile.prod -t mkjs-app:latest ..
docker build -f nginx/Dockerfile -t mkjs-nginx:latest ..
kind load docker-image mkjs-app:latest --name mkjs
kind load docker-image mkjs-nginx:latest --name mkjs

# Reaplica os manifestos agora que as imagens existem
kubectl apply -k ../k8s --context "$(terraform output -raw cluster_context)"
```

Para destruir tudo:

```bash
terraform destroy
# fallback se algo travar:
kind delete cluster --name mkjs
```

## Acessar o jogo

**1. Apontar `mkjs.local` para o cluster local**

Linux/macOS — adicionar a `/etc/hosts`:
```
127.0.0.1 mkjs.local
```

Windows — adicionar a `C:\Windows\System32\drivers\etc\hosts` (como Administrador):
```
127.0.0.1 mkjs.local
```

**Alternativa sem editar `hosts`** (se a porta 80 não estiver mapeada ou em uso):
```bash
kubectl port-forward svc/nginx 8080:80 -n mkjs
# acessar http://localhost:8080
```

**2. Abrir o navegador**

```
http://mkjs.local/
```

O jogo abre em modo Rede. Em duas abas/navegadores:
- **"Are you going to be host?"** → `yes` na primeira, `no` na segunda
- **"Enter game name:"** → mesmo nome nas duas abas (ex.: `sala1`)

## Verificar persistência (PVC)

```bash
# Após registrar ao menos uma partida (jogar até o fim em uma das abas)
curl http://mkjs.local/api/matches

# Deletar o pod do Postgres
kubectl delete pod postgres-0 -n mkjs

# Aguardar o StatefulSet recriar o pod
kubectl get pods -n mkjs --watch

# Confirmar que o histórico continua o mesmo
curl http://mkjs.local/api/matches
```

## Verificar configuração via ConfigMap/Secret

```bash
kubectl get configmap mkjs-config -n mkjs -o yaml
kubectl get secret mkjs-secrets -n mkjs -o yaml   # PGPASSWORD em base64

kubectl exec -n mkjs deploy/app -- env | grep -E '^PG'
```

## Validar manifestos localmente (mesmo comando do CI)

```bash
kubectl kustomize k8s/
```

## Limpar tudo

```bash
kubectl delete -k k8s/
# ou, se usou Terraform:
cd terraform && terraform destroy
```
