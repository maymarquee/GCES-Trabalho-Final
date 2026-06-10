# Research: Infraestrutura — Kubernetes & Terraform

**Branch**: `009-k8s-infra` | **Date**: 2026-06-10

## Decisões de Design

### Empacotamento dos manifestos: Kustomize vs. Helm vs. YAML solto

**Decisão**: `k8s/` com manifestos YAML simples + `kustomization.yaml` na raiz, aplicados via `kubectl apply -k k8s/`.

**Alternativas consideradas**:

- **Helm chart**: Permite templating e parametrização por ambiente (`values.yaml`), mas introduz uma linguagem de templates (Go templates) e uma ferramenta adicional (`helm`) só para um único ambiente local. Overhead desproporcional ao escopo desta fase — não há múltiplos ambientes (dev/staging/prod) a serem parametrizados ainda.
- **YAML solto sem Kustomize (`kubectl apply -f k8s/`)**: Funciona, mas exige listar cada arquivo manualmente ou depender da ordem alfabética do diretório (frágil — ex.: `Namespace` precisa existir antes dos demais recursos).
- **Kustomize (`kubectl apply -k k8s/`)**: Nativo do `kubectl` desde a v1.14 (sem instalação extra), resolve a ordem de aplicação dos recursos automaticamente, e permite no futuro criar overlays (`overlays/dev`, `overlays/prod`) sem duplicar os manifestos base — caminho natural caso a Fase 10 precise de uma variação com TLS/cert-manager.

**Conclusão**: Kustomize oferece o melhor custo-benefício: zero dependências novas, um comando único, e caminho de evolução para overlays.

---

### Postgres: StatefulSet vs. Deployment

**Decisão**: `StatefulSet` com 1 réplica + `Service` headless (`clusterIP: None`).

**Alternativas consideradas**:

- **Deployment + PVC referenciado diretamente**: Funciona para 1 réplica (um `Deployment` com `replicas: 1` e um `PersistentVolumeClaim` comum também garante persistência). Porém, `Deployment` não garante identidade de rede estável nem comunica a intenção "isto é um banco de dados com estado".
- **StatefulSet + `volumeClaimTemplates`**: Padrão para bancos com múltiplas réplicas (cada pod ganha seu próprio PVC `postgres-data-postgres-0`, `-1`, etc.). Como esta fase usa **1 réplica fixa** (sem replicação do Postgres), um `volumeClaimTemplates` adicionaria complexidade sem benefício imediato.
- **StatefulSet + PVC único referenciado por nome** (escolha final): Combina a identidade estável do `StatefulSet` (`postgres-0`, DNS `postgres-0.postgres.mkjs.svc.cluster.local`) com um `PersistentVolumeClaim` simples e nomeado (`postgres-data`), mais fácil de inspecionar (`kubectl get pvc`) e de entender para quem está lendo os manifestos pela primeira vez.

**Conclusão**: `StatefulSet` comunica corretamente a natureza stateful do Postgres e mantém a porta aberta para `volumeClaimTemplates` se uma futura fase precisar de réplicas, sem adicionar essa complexidade agora.

---

### Configuração e segredos: ConfigMap + Secret nativos vs. gerenciador externo

**Decisão**: `ConfigMap` (`mkjs-config`) para valores não-sensíveis e `Secret` (`mkjs-secrets`, tipo `Opaque`, via `stringData`) para `PGPASSWORD`, com as mesmas credenciais padrão (`mkjs`/`mkjs`) já usadas em `docker-compose.yml` e `docker-compose.prod.yml`.

**Alternativas consideradas**:

- **Sealed Secrets / External Secrets Operator / Vault**: Soluções corretas para produção real, mas exigem instalar um controller adicional no cluster e gerenciar chaves de criptografia ou um backend externo (Vault, AWS Secrets Manager). Para um cluster local de uso educacional, isso adiciona uma dependência operacional sem benefício prático — ninguém além do(a) próprio(a) desenvolvedor(a) acessa o cluster.
- **Hardcode nas variáveis de ambiente do `Deployment`**: Mais simples, mas viola FR-003 e a prática básica de não misturar configuração/segredo com a definição do workload — dificultaria trocar a senha sem editar o `Deployment`.
- **`Secret` nativo do Kubernetes** (escolha final): Já resolve o requisito da fase (segredo não aparece em texto plano no manifesto do `Deployment`, é codificado em base64 no etcd) sem dependências novas. A limitação (Secrets nativos não são criptografados em repouso por padrão, apenas codificados em base64) é documentada como melhoria futura.

**Conclusão**: `ConfigMap`/`Secret` nativos atendem ao requisito desta fase com zero dependências extras; gestão de segredos externa fica registrada como trabalho futuro (fora do escopo "Opcionalmente" do README).

---

### Exposição externa: Ingress (ingress-nginx) vs. Service NodePort/LoadBalancer

**Decisão**: `Ingress` (`networking.k8s.io/v1`) roteando o host `mkjs.local` para o `Service` `nginx`, assumindo o controller `ingress-nginx` instalado no cluster local.

**Alternativas consideradas**:

- **`Service` tipo `NodePort`**: Simples, não requer controller adicional, mas expõe uma porta alta arbitrária (ex.: `30080`) e não oferece roteamento por host/path — não é o "ponto de entrada HTTP" idiomático do Kubernetes.
- **`Service` tipo `LoadBalancer`**: Idiomático em clusters cloud (provisiona um Load Balancer externo), mas em `kind`/`minikube` requer `cloud-provider-kind`/`minikube tunnel` para funcionar — passo manual extra sem ganho sobre o Ingress.
- **`Ingress` + `ingress-nginx`** (escolha final): É o recurso padrão do Kubernetes para HTTP(S) externo, suporta roteamento por host (`mkjs.local`) e path, tem instalação documentada e específica para `kind` (manifesto oficial `deploy/static/provider/kind/deploy.yaml`), e é exatamente o recurso ao qual a Fase 10 vai anexar TLS via `cert-manager` (anotação `cert-manager.io/cluster-issuer` + bloco `tls:`). Escolher `Ingress` agora evita reescrever a camada de exposição na próxima fase.

**Anotações de timeout para Socket.io**: `nginx.ingress.kubernetes.io/proxy-read-timeout` e `proxy-send-timeout` definidos para `3600` (1h) — o padrão do `ingress-nginx` (60s) encerraria conexões WebSocket de partidas longas, espelhando o `proxy_http_version 1.1` + `Upgrade`/`Connection` já configurados em `nginx/nginx.conf` (Fase 8).

**Conclusão**: `Ingress` com `ingress-nginx` é o caminho idiomático, reaproveita o proxy WebSocket já validado na Fase 8, e prepara a Fase 10.

---

### Réplicas do app: por que `replicas: 1`

**Decisão**: `Deployment app` com `replicas: 1`. `Deployment nginx` com `replicas: 2` (demonstra escalonamento da camada stateless).

**Motivação**: `server/games.js` (`GameCollection`) mantém o estado de cada partida (jogadores conectados, vidas, posições) em memória do processo Node.js. O Socket.io, sem um adapter compartilhado (ex.: `@socket.io/redis-adapter`), não propaga eventos entre réplicas — dois jogadores poderiam ser roteados para pods `app` diferentes e nunca se verem na mesma partida. Resolver isso corretamente exigiria: (a) um adapter Redis para Socket.io, (b) mover `GameCollection` para um armazenamento compartilhado (ou usar afinidade de sessão por `game-name` no Ingress), e (c) testes de carga — escopo de uma fase própria, não desta.

**Alternativa descartada**: `replicas: 2+` com `sessionAffinity: ClientIP` no `Service` — reduziria, mas não eliminaria, o problema (dois jogadores em IPs/origens diferentes ainda poderiam cair em pods distintos), e mascararia o problema real em vez de documentá-lo.

**Conclusão**: `replicas: 1` é uma limitação deliberada e documentada (não um esquecimento). O `Deployment nginx` (camada stateless de proxy/estáticos) usa `replicas: 2` para demonstrar que a topologia suporta escalonamento horizontal onde é seguro fazê-lo.

---

### Terraform (opcional): provisionar cluster `kind` local

**Decisão**: `terraform/` com `null_resource` + `local-exec` envolvendo as CLIs `kind`/`kubectl`: um recurso cria o cluster `kind` chamado `mkjs` (com `kind create cluster --config ...`, portas 80/443 mapeadas para o host), o seguinte instala o `ingress-nginx`, e o último roda `kubectl apply -k k8s/`. Único provider declarado: `hashicorp/null` (parte do core do Terraform).

**Alternativas consideradas**:

- **Provider `kubernetes`/`helm` apontando para um cluster pré-existente**: Não "provisiona infraestrutura" — assume que o cluster já existe, deslocando o problema para fora do Terraform. Não atende ao espírito do requisito ("Terraform para provisionar a infraestrutura necessária").
- **Cloud provider (EKS/GKE/AKS via Terraform)**: Tecnicamente mais "real", mas exige conta na nuvem, billing e credenciais — inviável para um trabalho individual avaliado localmente, e fora do escopo de custo de um projeto acadêmico.
- **Provider de terceiros `tehcyx/kind` (`kind_cluster`)**: Modela o cluster como um recurso Terraform "de verdade" (com atributos computados como `kubeconfig_path`), mas é um provider de terceiros distribuído via GitHub Releases — em ambientes com egress restrito (incluindo o sandbox usado para validar esta fase), o download do binário do provider falhou por timeout, quebrando `terraform init`. Depender dele tornaria `terraform:validate` no CI frágil a uma fonte externa adicional.
- **`null_resource` + `local-exec` com `kind`/`kubectl`** (escolha final): Usa exatamente as mesmas CLIs já exigidas pelo restante desta fase (`quickstart.md` Opção A), sem providers extras além do `hashicorp/null` (instala instantaneamente, hospedado pelo próprio `registry.terraform.io`). `terraform apply` literalmente automatiza os comandos manuais da Opção A.

**Limitação assumida**: `terraform validate` é verificado no CI (sintaxe/tipos), mas `terraform apply` não roda no pipeline — exigiria Docker-in-Docker no runner para criar o cluster `kind`, o que foge do escopo desta fase (CD real fica para a Fase 10). `terraform apply` é um fluxo **local**, documentado em `quickstart.md`. `kubectl --context kind-mkjs` é usado em vez de um `kubeconfig_path` dedicado — `kind create cluster` já mescla o contexto no kubeconfig padrão (`~/.kube/config`).

**Conclusão**: O Terraform desta fase é opcional (conforme o README) e cobre exatamente "provisionar a infraestrutura necessária" (o cluster) sem custos, credenciais externas ou providers de terceiros; os manifestos de `k8s/` continuam sendo o artefato principal e funcionam de forma independente do Terraform.

---

### CI: novo estágio `infra`

**Decisão**: Novo estágio `infra` (após `quality`), com dois jobs:

- `k8s:validate` — `kubectl kustomize k8s/` (renderiza os manifestos; falha se houver erro de referência/sintaxe). Não requer cluster.
- `terraform:validate` — `terraform fmt -check` + `terraform init -backend=false` + `terraform validate` no diretório `terraform/`. Não requer Docker/`kind`.

**Motivação**: Ambos os comandos são puramente estáticos (não dependem de um cluster ou de criar containers), então rodam em qualquer runner GitLab compartilhado, mantendo a Fase 9 alinhada ao Princípio III da constituição (mudanças gateadas por CI).

**Conclusão**: Validação estática de manifestos/Terraform no CI dá feedback rápido sobre erros de sintaxe sem exigir infraestrutura real no runner.
