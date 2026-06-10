# Como Rodar o Projeto

Este é um jogo de luta simples criado com HTML5 canvas e JavaScript. Ele possui três modos de jogo:
* `Básico` - com um jogador ativo e um inativo.
* `Multijogador` - com dois jogadores ativos em um computador.
* `Rede` - com dois jogadores ativos, jogando pela rede.

### Execução Local (Modo Básico/Multijogador)

Para rodar o jogo localmente, basta abrir o arquivo `game/index.html` em qualquer navegador moderno.

### Execução em Rede (Servidor Node.js)

Pré-requisito: Node.js **18 ou superior** (o servidor usa Express 4.x e
Socket.io 4.x, que exigem essa versão mínima — ver `server/package.json`).

Para o jogo em rede, você precisa iniciar o servidor:

1.  Navegue até a pasta do servidor:
    ```bash
    cd server
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Inicie o servidor:
    ```bash
    node server.js
    ```

O servidor será iniciado na porta `55555`. Abra o navegador em `http://localhost:55555`. Ambos os jogadores devem inserir o mesmo nome de jogo para se conectarem.

### Ambiente de Desenvolvimento via Docker (recomendado)

Pré-requisito: apenas **Docker** instalado e em execução — Node.js não é necessário no host.

**1. Configuração inicial (uma vez)**

```bash
cp .env.example .env
# Edite .env se precisar mudar a porta padrão (55555)
```

**2. Build da imagem**

```bash
docker build -t mkjs-dev .
```

**3. Subir o servidor com hot-reload**

```bash
# Linux / macOS
docker run --rm -it \
  -p ${HOST_PORT:-55555}:55555 \
  -v "$(pwd)/server:/app/server" \
  -v "$(pwd)/game:/app/game" \
  -v mkjs-dev-modules:/app/server/node_modules \
  --name mkjs-dev \
  mkjs-dev

# Windows PowerShell
docker run --rm -it `
  -p "${env:HOST_PORT:-55555}:55555" `
  -v "${PWD}/server:/app/server" `
  -v "${PWD}/game:/app/game" `
  -v mkjs-dev-modules:/app/server/node_modules `
  --name mkjs-dev `
  mkjs-dev
```

Abra `http://localhost:55555` (ou a porta configurada em `.env`).

**Hot-reload:**
- Editar e salvar qualquer arquivo em `server/` → nodemon reinicia o servidor automaticamente (≤ 3 s)
- Editar e salvar qualquer arquivo em `game/` → recarregar a página no navegador aplica a mudança imediatamente

**Parar o servidor:**
```bash
Ctrl+C          # o flag --rm garante limpeza automática do contêiner
```

**Após alterar dependências em `server/package.json`:**
```bash
docker build -t mkjs-dev .   # reconstrói a camada de npm ci
```

### Docker Compose DEV com Postgres (recomendado para desenvolvimento completo)

Sobe a aplicação **e** um banco de dados PostgreSQL com um único comando. Persiste o histórico de partidas automaticamente.

Pré-requisito: apenas **Docker** (com suporte a Compose v2) — nenhuma outra ferramenta no host.

**1. Configuração inicial (uma vez)**

```bash
cp .env.example .env
# Edite .env para ajustar portas ou credenciais do banco se necessário
```

**2. Subir o ambiente completo**

```bash
docker compose up
```

Aguarde até ver nos logs:
```
app  | [nodemon] starting `node server/server.js`
```

Abra `http://localhost:55555` no navegador. O jogo está disponível e o banco está pronto para registrar partidas.

**Hot-reload (mesmo comportamento da fase anterior):**
- Editar e salvar qualquer arquivo em `server/` → nodemon reinicia o servidor automaticamente (≤ 3 s)
- Editar e salvar qualquer arquivo em `game/` → recarregar a página aplica a mudança imediatamente

**Consultar histórico de partidas:**
```bash
# Via rota HTTP
curl http://localhost:55555/api/matches

# Via psql (acesso direto ao banco)
docker compose exec db psql -U mkjs -d mkjs -c "SELECT * FROM matches;"
```

**Parar o ambiente:**
```bash
docker compose down          # para os containers, preserva os dados (volume postgres_data)
docker compose down -v       # para e apaga os volumes (reset completo do banco)
```

**Após alterar dependências em `server/package.json`:**
```bash
docker compose up --build    # reconstrói a imagem app com as novas dependências
```

### Ambiente de Produção via Docker Compose (Nginx + Node.js + Postgres)

Stack otimizada para produção: **Nginx** serve os arquivos estáticos do jogo e faz proxy do Socket.io e da API REST para o backend Node.js. A imagem do backend usa multi-stage build baseada em Alpine e roda como usuário não-root. Apenas a porta 80 do Nginx é exposta — o backend e o banco ficam na rede interna Docker.

Pré-requisito: apenas **Docker** (com suporte a Compose v2) instalado.

**1. Configuração inicial (uma vez)**

```bash
cp .env.example .env
# Edite .env se precisar mudar PROD_PORT (padrão: 80)
```

**2. Build e subida do stack de produção**

```bash
docker compose -f docker-compose.prod.yml up --build
```

Aguarde até ver nos logs:
```
nginx  | ... start worker processes
```

Abra `http://localhost` (ou `http://localhost:${PROD_PORT}` se alterou a porta) no navegador.

**3. Jogar pela interface**

O jogo abre automaticamente em modo de rede. Uma caixa de diálogo perguntará:
- **"Are you going to be host?"** — responda `yes` no primeiro navegador e `no` no segundo
- **"Enter game name:"** — insira o mesmo nome nos dois navegadores (ex.: `sala1`)

Após ambos os jogadores entrarem, o jogo começa. Controles:
- **Jogador 1 (esquerda):** `A`/`D` = mover, `W` = pular, `E` = soco alto, `Q` = soco baixo, `R` = chute alto, `C` = chute baixo
- **Jogador 2 (direita):** `←`/`→` = mover, `↑` = pular, teclas numéricas do pad para ataques

Para testar **localmente com dois jogadores na mesma máquina**, abra dois navegadores (ou duas abas anônimas) em `http://localhost`.

**4. Consultar histórico de partidas**

```bash
curl http://localhost/api/matches
```

**5. Parar o ambiente**

```bash
docker compose -f docker-compose.prod.yml down          # preserva dados
docker compose -f docker-compose.prod.yml down -v       # apaga volumes (reset completo)
```

**Diferenças em relação ao ambiente de dev:**

| | Dev (`docker-compose.yml`) | Prod (`docker-compose.prod.yml`) |
|---|---|---|
| Imagem base | `node:18-slim` | `node:18-alpine` (multi-stage) |
| Hot-reload | Sim (nodemon + bind mounts) | Não |
| Porta exposta | 55555 (Node.js direto) | 80 (Nginx) |
| DevDependencies | Incluídas | Excluídas (`--omit=dev`) |
| Usuário no container | root | `node` (não-root) |
| Frontend | Servido pelo Express | Servido pelo Nginx (estático) |

---

### Kubernetes (K8s)

Manifestos em `k8s/` (aplicados via Kustomize) sobem a mesma stack — Nginx, app Node.js e Postgres com persistência — em um cluster Kubernetes local. Útil para validar a aplicação fora do Docker Compose, em um ambiente mais próximo de produção.

Pré-requisitos: **Docker**, **kubectl**, **kind** (cluster Kubernetes local via containers Docker).

**1. Criar o cluster local**

Crie `kind-config.yaml`:

```yaml
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
```

```bash
kind create cluster --name mkjs --config kind-config.yaml
```

**2. Instalar o ingress-nginx**

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller --timeout=180s
```

**3. Build das imagens e carga no cluster**

`kind` não tem acesso a um registry — as imagens construídas localmente precisam ser carregadas explicitamente no cluster:

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

**5. Acompanhar os pods**

```bash
kubectl get pods -n mkjs --watch
# Ctrl+C quando app, nginx (x2) e postgres-0 estiverem Running / 1/1
```

**6. Acessar o jogo**

Adicione ao arquivo de hosts (`/etc/hosts` ou `C:\Windows\System32\drivers\etc\hosts`):

```
127.0.0.1 mkjs.local
```

Abra `http://mkjs.local/` no navegador. Sem editar o arquivo de hosts, use port-forward:

```bash
kubectl port-forward svc/nginx 8080:80 -n mkjs
# Abra http://localhost:8080
```

**7. Verificar persistência do Postgres**

```bash
kubectl delete pod postgres-0 -n mkjs
kubectl get pvc -n mkjs
# postgres-data continua "Bound" e é remontado pelo novo pod postgres-0
```

**8. Limpar o ambiente**

```bash
kubectl delete -k k8s/      # remove os recursos da aplicação (mantém o PVC se StorageClass usar Retain)
kind delete cluster --name mkjs   # remove o cluster inteiro
```

#### Opção: provisionar via Terraform (opcional)

`terraform/` automatiza os passos 1, 2 e 4 acima (criação do cluster `kind`, instalação do `ingress-nginx` e `kubectl apply -k k8s/`):

```bash
cd terraform
terraform init
terraform apply
```

O build e a carga das imagens (passo 3) continuam manuais — o Terraform não builda imagens Docker da aplicação:

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

---

### CI — Qualidade de Código (SonarCloud)

O pipeline executa análise de qualidade no SonarCloud automaticamente em todo push, no estágio `quality` (após `test` e `security`). O job `sonarcloud` aguarda o resultado do Quality Gate e falha o pipeline se as métricas não atendem o padrão.

**Pré-requisito (configuração única — via interface):**

1. Acesse [sonarcloud.io](https://sonarcloud.io) → **Log in with GitLab**
2. Clique em **+** → **Analyze new project** → selecione o repositório
3. Na tela de configuração, escolha **With GitLab CI**
4. Anote o **Project Key** e **Organization Key** exibidos e edite o arquivo `sonar-project.properties` na raiz do repositório com esses valores
5. Em sonarcloud.io → **My Account** → **Security** → gere um token chamado `gitlab-ci`
6. No GitLab: **Settings → CI/CD → Variables** → adicione `SONAR_TOKEN` (mascarado) com o token gerado

**Verificar resultados no SonarCloud:**

1. Após o pipeline executar, acesse [sonarcloud.io](https://sonarcloud.io) → seu projeto
2. A aba **Overview** exibe: Quality Gate status, Coverage %, Bugs, Code Smells
3. No GitLab: `CI/CD → Pipelines → [pipeline] → quality → sonarcloud` — o log exibe o link direto para o dashboard

**Executar cobertura de testes localmente:**

```bash
cd server && npm run test:coverage
```

O relatório de cobertura é gerado em `server/coverage/lcov.info` (LCOV) e `server/coverage/lcov-report/index.html` (HTML navegável).

---

### CI — Segurança: SAST & SCA (GitLab CI)

O pipeline executa análise de segurança automaticamente em todo push, no estágio `security` (após `test`). Dois jobs são executados em paralelo:

- **`semgrep-sast`** — Análise Estática de Segurança (SAST) via semgrep, detecta padrões de vulnerabilidade no código-fonte JavaScript.
- **`sca:npm-audit`** — Verificação de Componentes (SCA) via `npm audit`, detecta vulnerabilidades conhecidas nas dependências.

**Executar SCA localmente:**

```bash
cd server

# Verificar vulnerabilidades (mesmo critério do CI: apenas high/critical bloqueiam)
npm audit --audit-level=high

# Relatório completo
npm audit
```

Saída esperada (dependências limpas):
```
found 0 vulnerabilities
```

**Visualizar resultados no GitLab:**

1. Acesse `CI/CD → Pipelines` no repositório
2. Clique no pipeline mais recente → estágio `security`
3. `sca:npm-audit` — log com resultado do `npm audit`
4. `semgrep-sast` — artefato `gl-sast-report.json` disponível para download

O job `sca:npm-audit` falha o pipeline se houver vulnerabilidade de severidade `high` ou `critical`. O job `semgrep-sast` é informativo (`allow_failure: true`) — achados SAST são reportados mas não bloqueiam o pipeline.

---

### CI — Testes de Fuzzing (GitLab CI)

O pipeline executa os testes de fuzzing automaticamente em todo push, no estágio `test` (em paralelo com `test:unit`). Os fuzz tests usam **fast-check** (property-based testing) para gerar centenas de entradas arbitrárias e verificar propriedades de `GameCollection` e `Game`.

**Pré-requisito**: Node.js 18+ e dependências instaladas (`cd server && npm install`).

**Executar apenas os fuzz tests:**
```bash
cd server && npm run test:fuzz
```

**Executar todos os testes (unit + fuzz):**
```bash
cd server && npm test
```

Quando um fuzz test falha, fast-check imprime o menor input que causou a falha:
```
Property failed after X tests
Counterexample: [null]
```

Para visualizar o job `test:fuzz` no GitLab: `CI/CD → Pipelines → test:fuzz`.

---

### CI — Testes Unitários (GitLab CI)

O pipeline executa os testes unitários automaticamente em todo push, no estágio `test`, após build e lint. Para rodar localmente:

**Pré-requisito**: Node.js 18+ e dependências instaladas (`cd server && npm install`).

**Executar todos os testes:**
```bash
cd server && npm test
```

**Executar apenas os testes unitários de `games.js`:**
```bash
cd server && npx jest test/games.unit.test.js
```

O processo termina com código `0` se todos os testes passarem. Para ver o job `test:unit` no GitLab: `CI/CD → Pipelines → test:unit`.

---

### CI — Build & Lint (GitLab CI)

O pipeline de CI executa automaticamente em todo push. Para verificar localmente antes de fazer push:

**Pré-requisito**: Node.js 18+ instalado. Instale as dependências uma vez:
```bash
cd server && npm install
```

**Executar lint completo (back-end + front-end):**
```bash
cd server && npm run lint
```

**Executar lint apenas do back-end (`server/`):**
```bash
cd server && npm run lint:back
```

**Executar lint apenas do front-end (`game/src/`):**
```bash
cd server && npm run lint:front
```

O processo termina com código de saída `0` se não houver erros. Avisos (`warning`) não causam falha.
Para visualizar o pipeline no GitLab: `CI/CD → Pipelines` no repositório.

---

# Configuração Técnica

O `mk.js` pode ser configurado através do objeto de opções passado na inicialização:

*   `arena`: Propriedades da arena (container e tipo).
*   `fighters`: Array com os nomes dos dois jogadores.
*   `game-type`: Define o modo (`network`, `basic`, `multiplayer`).
*   `callbacks`: Funções disparadas em eventos como `attack` ou `game-end`.

# Licença

Este software é distribuído sob os termos da licença MIT.
