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
