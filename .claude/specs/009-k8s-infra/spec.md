# Feature Specification: Infraestrutura — Kubernetes & Terraform

**Feature Branch**: `009-k8s-infra`

**Created**: 2026-06-10

**Status**: Draft

**Input**: Phase 9 do projeto GCES (Infraestrutura): criação de manifestos de Kubernetes (K8s) para orquestração da aplicação (Nginx + Node.js + Postgres), com persistência via PVC e exposição via Ingress. Opcionalmente, uso de Terraform para provisionar a infraestrutura necessária (cluster local).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deploy completo da stack com um único comando (Priority: P1)

Um(a) desenvolvedor(a) com um cluster Kubernetes local (kind ou minikube) quer subir toda a stack — Postgres, backend Node.js e Nginx — com um único comando, sem editar manifestos manualmente.

**Why this priority**: É o requisito central da fase — sem manifestos que orquestrem a aplicação completa, não há "infraestrutura como código" para avaliar.

**Independent Test**: Verificado executando `kubectl apply -k k8s/` em um cluster kind local e confirmando com `kubectl get pods -n mkjs` que os pods `app`, `nginx` e `postgres` ficam `Running`/`Ready`.

**Acceptance Scenarios**:

1. **Given** um cluster Kubernetes local vazio e as imagens `mkjs-app:latest`/`mkjs-nginx:latest` carregadas no cluster, **When** o(a) desenvolvedor(a) executa `kubectl apply -k k8s/`, **Then** o namespace `mkjs` é criado com todos os recursos (ConfigMap, Secret, PVC, StatefulSet, Deployments, Services, Ingress) sem erro.
2. **Given** os recursos aplicados, **When** o(a) desenvolvedor(a) executa `kubectl get pods -n mkjs`, **Then** todos os pods atingem `STATUS=Running` e `READY=1/1` em até 2 minutos.
3. **Given** a stack rodando, **When** o(a) desenvolvedor(a) executa `kubectl apply -k k8s/` novamente sem alterações, **Then** o comando é idempotente (`unchanged` para todos os recursos).

---

### User Story 2 - Acesso ao jogo via Ingress (Priority: P1)

Um(a) jogador(a) quer acessar o jogo em rede através de uma URL única exposta pelo cluster, com o Nginx servindo os arquivos estáticos e fazendo proxy do Socket.io e da API REST para o backend.

**Why this priority**: Sem um ponto de entrada externo (Ingress), a aplicação orquestrada não é acessível — a fase não entrega valor de "exposição de serviço".

**Independent Test**: Verificado configurando `mkjs.local` no `/etc/hosts` (ou `hosts` do Windows) apontando para o IP do cluster e acessando `http://mkjs.local` no navegador.

**Acceptance Scenarios**:

1. **Given** o Ingress `mkjs` aplicado e o controller `ingress-nginx` ativo no cluster, **When** o(a) jogador(a) acessa `http://mkjs.local/`, **Then** a página do jogo (`game/index.html`) é carregada via Nginx.
2. **Given** dois navegadores apontando para `http://mkjs.local/`, **When** ambos entram com o mesmo nome de partida (modo Rede), **Then** a conexão Socket.io é estabelecida através do Ingress sem desconectar (timeouts de proxy adequados a WebSocket).
3. **Given** a stack rodando, **When** o(a) jogador(a) acessa `http://mkjs.local/api/matches`, **Then** o Nginx faz proxy da requisição para o backend e retorna o histórico de partidas em JSON.

---

### User Story 3 - Persistência de dados sobrevive a reinícios de pod (Priority: P2)

Um(a) desenvolvedor(a) quer garantir que o histórico de partidas armazenado no Postgres não é perdido quando o pod do banco é recriado (deploy, crash, upgrade de nó).

**Why this priority**: Sem persistência via volume, o Postgres em Kubernetes se comporta pior que o `docker-compose` da fase anterior — a orquestração precisa preservar a garantia já conquistada na Fase 2.

**Independent Test**: Verificado registrando uma partida, deletando o pod do Postgres (`kubectl delete pod postgres-0 -n mkjs`) e confirmando que o histórico continua disponível após o pod ser recriado pelo StatefulSet.

**Acceptance Scenarios**:

1. **Given** uma partida registrada via `/api/matches`, **When** o pod `postgres-0` é deletado, **Then** o StatefulSet recria o pod e os dados em `postgres_data` (PVC) permanecem intactos.
2. **Given** o PVC `postgres-data`, **When** o(a) desenvolvedor(a) executa `kubectl get pvc -n mkjs`, **Then** o PVC aparece com `STATUS=Bound` e `STORAGECLASS` provisionado pelo cluster local.

---

### User Story 4 - Configuração e segredos não hardcoded em manifestos de aplicação (Priority: P2)

Um(a) desenvolvedor(a) quer que a configuração do banco (host, porta, nome, usuário) e a credencial sensível (senha) sejam injetadas via `ConfigMap`/`Secret`, não escritas diretamente nos manifestos de `Deployment`.

**Why this priority**: Separar configuração de código é uma prática DevOps básica e prepara o terreno para a Fase 10 (gestão de segredos/HTTPS via cert-manager).

**Independent Test**: Verificado inspecionando `k8s/app-deployment.yaml` e confirmando que nenhuma variável de ambiente tem valor literal — todas vêm de `envFrom: configMapRef`/`secretRef`.

**Acceptance Scenarios**:

1. **Given** o manifesto `k8s/configmap.yaml`, **When** o(a) desenvolvedor(a) inspeciona seu conteúdo, **Then** encontra `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` (sem dados sensíveis).
2. **Given** o manifesto `k8s/secret.yaml`, **When** o(a) desenvolvedor(a) executa `kubectl get secret mkjs-secrets -n mkjs -o yaml`, **Then** `PGPASSWORD` aparece codificado em base64 (não em texto plano no cluster).
3. **Given** o Deployment `app`, **When** o(a) desenvolvedor(a) executa `kubectl exec` no pod e roda `env`, **Then** `PGHOST=postgres`, `PGPORT=5432`, `PGDATABASE=mkjs`, `PGUSER=mkjs` e `PGPASSWORD` aparecem como variáveis de ambiente injetadas pelo ConfigMap/Secret.

---

### User Story 5 - Provisionamento do cluster local via Terraform (opcional) (Priority: P3)

Um(a) desenvolvedor(a) quer provisionar a infraestrutura necessária (cluster Kubernetes local + Ingress controller) de forma reprodutível via Terraform, em vez de comandos manuais de `kind`/`minikube`.

**Why this priority**: O README marca esta etapa como opcional ("Opcionalmente, utilize Terraform"); agrega valor de IaC mas não é bloqueante para as User Stories 1-4.

**Independent Test**: Verificado executando `terraform apply` no diretório `terraform/` e confirmando que um cluster `kind` chamado `mkjs` é criado, com o `ingress-nginx` instalado e os manifestos de `k8s/` aplicados automaticamente.

**Acceptance Scenarios**:

1. **Given** Docker e Terraform instalados, **When** o(a) desenvolvedor(a) executa `terraform apply` em `terraform/`, **Then** um cluster `kind` chamado `mkjs` é criado com as portas 80/443 mapeadas para o host.
2. **Given** o cluster criado, **When** o `apply` termina, **Then** o `ingress-nginx` está `Ready` e os recursos de `k8s/` foram aplicados (mesmo resultado da User Story 1).
3. **Given** o cluster criado, **When** o(a) desenvolvedor(a) executa `terraform destroy`, **Then** o cluster `kind` e todos os recursos são removidos sem deixar containers Docker órfãos.

---

### Edge Cases

- O que acontece se as imagens `mkjs-app:latest`/`mkjs-nginx:latest` não existirem no cluster local? Os pods ficam em `ImagePullBackOff` — o `quickstart.md` documenta `kind load docker-image` (ou `minikube image load`) como passo obrigatório antes do `apply`.
- O que acontece se o pod `app` iniciar antes do `postgres-0` estar pronto? O processo Node.js sobe normalmente (o `pg.Pool` conecta sob demanda); requisições a `/api/matches` retornam erro 500 até o Postgres aceitar conexões — o `readinessProbe` do Postgres e o `depends_on` lógico (ordem de aplicação) minimizam a janela, mas não há `initContainer` de espera nesta fase.
- O que acontece se `mkjs.local` não resolver no host? O `quickstart.md` documenta a entrada necessária em `/etc/hosts` (Linux/macOS) ou `C:\Windows\System32\drivers\etc\hosts` (Windows), e uma alternativa via `kubectl port-forward svc/nginx 8080:80 -n mkjs`.
- O que acontece com múltiplas réplicas do Deployment `app`? Não é suportado nesta fase — `GameCollection` mantém o estado das partidas em memória do processo Node.js (Socket.io sem adapter compartilhado). `replicas: 1` é uma decisão deliberada, documentada em `research.md`.
- O que acontece se `terraform destroy` falhar no meio do processo (ex.: container do kind travado)? `quickstart.md` documenta o comando manual de fallback `kind delete cluster --name mkjs`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O diretório `k8s/` DEVE conter manifestos declarativos para: `Namespace`, `ConfigMap` (config não-sensível), `Secret` (credencial do Postgres), `ConfigMap` de inicialização do schema, `PersistentVolumeClaim`, `StatefulSet` + `Service` headless do Postgres, `Deployment` + `Service` do app Node.js, `Deployment` + `Service` do Nginx, e `Ingress`.
- **FR-002**: Um arquivo `k8s/kustomization.yaml` DEVE listar todos os manifestos, permitindo `kubectl apply -k k8s/` para aplicar a stack inteira com um comando.
- **FR-003**: A configuração não-sensível do Postgres (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`) DEVE vir de um `ConfigMap` (`mkjs-config`); a senha (`PGPASSWORD`) DEVE vir de um `Secret` (`mkjs-secrets`). O Deployment `app` e o StatefulSet `postgres` DEVEM consumi-los via `envFrom`/`valueFrom` — nenhum valor sensível literal nos manifestos de `Deployment`/`StatefulSet`.
- **FR-004**: O StatefulSet `postgres` DEVE montar um `PersistentVolumeClaim` (`postgres-data`, `ReadWriteOnce`, 1Gi) em `/var/lib/postgresql/data`, garantindo que o histórico de partidas sobreviva a reinícios do pod.
- **FR-005**: O schema inicial (tabela `matches`, espelhando `server/db/init.sql`) DEVE ser aplicado automaticamente no primeiro start do Postgres via `ConfigMap` montado em `/docker-entrypoint-initdb.d`.
- **FR-006**: O `Ingress` DEVE rotear o host `mkjs.local` para o `Service` do Nginx (porta 80), com anotações de timeout adequadas para conexões WebSocket de longa duração (Socket.io).
- **FR-007**: Os Deployments `app` e `nginx` DEVEM definir `readinessProbe` e `livenessProbe` baseados em `httpGet` na porta exposta por cada container.
- **FR-008**: O Deployment `app` DEVE usar `replicas: 1` (limitação documentada — estado de partidas em memória); o Deployment `nginx` PODE usar `replicas: 2` por ser stateless.
- **FR-009** (opcional): O diretório `terraform/` PODE conter uma configuração Terraform que provisiona um cluster `kind` local, instala o `ingress-nginx` e aplica os manifestos de `k8s/`.
- **FR-010**: O pipeline de CI DEVE validar a sintaxe dos manifestos (`kubectl kustomize k8s/`) em um novo estágio `infra`, falhando o pipeline se a renderização produzir erro. Se `terraform/` existir, o pipeline DEVE também validar sua sintaxe (`terraform validate`).

### Key Entities

- **Namespace `mkjs`**: Isola todos os recursos da aplicação no cluster.
- **ConfigMap `mkjs-config`**: `PGHOST=postgres`, `PGPORT=5432`, `PGDATABASE=mkjs`, `PGUSER=mkjs`.
- **Secret `mkjs-secrets`**: `PGPASSWORD` (credencial padrão de ambiente local/educacional).
- **ConfigMap `postgres-init`**: Cópia do `server/db/init.sql` (criação da tabela `matches`).
- **PersistentVolumeClaim `postgres-data`**: 1Gi, `ReadWriteOnce`, monta em `/var/lib/postgresql/data` do pod `postgres-0`.
- **StatefulSet `postgres` / Service `postgres`**: 1 réplica, imagem `postgres:16-alpine`, service headless (`clusterIP: None`).
- **Deployment `app` / Service `app`**: 1 réplica, imagem `mkjs-app:latest` (build de `Dockerfile.prod`), porta 55555.
- **Deployment `nginx` / Service `nginx`**: 2 réplicas, imagem `mkjs-nginx:latest` (build de `nginx/Dockerfile`), porta 80.
- **Ingress `mkjs`**: Roteia `mkjs.local` → `Service nginx:80`.
- **(Opcional) `null_resource.kind_cluster`**: Recurso Terraform (provider `hashicorp/null`) que, via `local-exec`, provisiona o cluster `kind` local usado pelos demais recursos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `kubectl apply -k k8s/` cria todos os recursos do namespace `mkjs` sem erro em um cluster kind/minikube local.
- **SC-002**: `kubectl get pods -n mkjs` mostra os pods `app-*`, `nginx-*` (x2) e `postgres-0` em `STATUS=Running` e `READY` completo em até 2 minutos após o apply.
- **SC-003**: Acessar `http://mkjs.local/` carrega o jogo; duas abas em modo Rede completam uma partida com Socket.io funcionando através do Ingress.
- **SC-004**: `curl http://mkjs.local/api/matches` retorna o histórico de partidas; após `kubectl delete pod postgres-0 -n mkjs`, o mesmo comando continua retornando os mesmos dados (persistência via PVC).
- **SC-005**: O job `k8s:validate` aparece verde no estágio `infra` do pipeline GitLab CI.
- **SC-006** (opcional): `terraform apply` em `terraform/` cria o cluster `kind` e deixa a stack no mesmo estado descrito em SC-001/SC-002, sem passos manuais adicionais além de carregar as imagens Docker.

## Assumptions

- O(a) desenvolvedor(a) possui um cluster Kubernetes local (kind ou minikube) com o controller `ingress-nginx` habilitado — `quickstart.md` documenta a instalação para ambos.
- As imagens `mkjs-app:latest` (a partir de `Dockerfile.prod`) e `mkjs-nginx:latest` (a partir de `nginx/Dockerfile`, ambos da Fase 8) são construídas localmente e carregadas no cluster — não há registry de imagens nesta fase (fica para a Fase 10, CD).
- HTTPS/cert-manager e redirecionamento 80→443 ficam para a Fase 10; o `Ingress` desta fase serve HTTP simples em `mkjs.local`.
- As credenciais do Postgres no `Secret` (`mkjs/mkjs`) são as mesmas usadas em `docker-compose.yml`/`docker-compose.prod.yml` — adequadas para cluster local/educacional. Gestão de segredos externa (Sealed Secrets, Vault, External Secrets Operator) é citada como melhoria futura, fora de escopo.
- `replicas: 1` no Deployment `app` é uma limitação arquitetural conhecida (estado de partidas em memória no `GameCollection`/Socket.io sem adapter compartilhado), documentada e não corrigida nesta fase.
- O Terraform desta fase provisiona apenas infraestrutura **local** (cluster `kind` via Docker) — não há provisionamento em nuvem (custos/credenciais fora do escopo de um trabalho individual).
