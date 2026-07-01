# Feature Specification: CI — Build & Lint

**Feature Branch**: `004-ci-build-lint`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "Fase 3 do projeto GCES (CI - Build & Lint): automação das etapas de Build e Lint (Front e Back) via GitLab CI. O pipeline deve falhar se o lint encontrar erros."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pipeline executa automaticamente ao fazer push (Priority: P1)

Um(a) desenvolvedor(a) faz push de uma alteração no código para qualquer branch do repositório e espera que o pipeline de CI seja disparado automaticamente, execute o build e relate o resultado (sucesso ou falha) sem nenhuma ação manual.

**Why this priority**: É o requisito fundamental de CI — sem gatilho automático, todo o restante do pipeline não tem utilidade. Qualquer outra história pressupõe que o pipeline rode automaticamente.

**Independent Test**: Pode ser testado fazendo push de qualquer commit para o repositório e verificando na interface do GitLab que um pipeline é criado e executado automaticamente para aquele commit.

**Acceptance Scenarios**:

1. **Given** um commit feito em qualquer branch com pipeline configurado, **When** o push chega ao servidor GitLab, **Then** um pipeline é criado automaticamente e executa os estágios de build e lint.
2. **Given** o pipeline em execução, **When** todos os estágios concluem sem erro, **Then** o pipeline aparece com status "passed" na interface do GitLab.
3. **Given** o pipeline em execução, **When** algum estágio falha, **Then** o pipeline aparece com status "failed" e indica qual job falhou.

---

### User Story 2 - Erros de lint no back-end reprovam o pipeline (Priority: P1)

Um(a) desenvolvedor(a) introduz um erro de lint no código back-end (pasta `server/`) e espera que o pipeline de CI falhe automaticamente com uma mensagem clara indicando o problema, impedindo que código com erros seja integrado sem revisão.

**Why this priority**: Lint automático no back-end é o principal mecanismo de enforcement de qualidade desta fase. Sem essa história, o pipeline pode passar mesmo com erros sérios de código.

**Independent Test**: Pode ser testado introduzindo intencionalmente uma variável não declarada em `server/server.js`, fazendo push, e verificando que o job de lint back-end falha com a mensagem de erro do ESLint apontando a linha problemática.

**Acceptance Scenarios**:

1. **Given** código back-end com uma variável de referência não declarada, **When** o pipeline executa o lint do back-end, **Then** o job de lint falha e exibe a mensagem do ESLint com o arquivo, linha e regra violada.
2. **Given** código back-end sem erros de lint, **When** o pipeline executa o lint, **Then** o job de lint passa sem erros.
3. **Given** código back-end com avisos de lint mas sem erros, **When** o pipeline executa o lint, **Then** o job de lint passa (avisos não reprovam o pipeline).

---

### User Story 3 - Lint do front-end é verificado no pipeline (Priority: P2)

Um(a) desenvolvedor(a) quer saber se alterações em `game/src/` introduzem problemas de qualidade de código, sem que o pipeline seja reprovado por questões dos globals específicos do browser existentes no código legado.

**Why this priority**: O front-end é código legado com muitos globals de browser; um lint agressivo quebraria o pipeline por razões não relacionadas a novos bugs. A história entrega visibilidade sem bloquear o trabalho.

**Independent Test**: Pode ser testado verificando que o pipeline executa o job de lint front-end, que completa com sucesso para o código atual de `game/src/`, e que erros de sintaxe JavaScript em `game/src/` causam falha no job.

**Acceptance Scenarios**:

1. **Given** o código atual de `game/src/` (legado, sem alterações), **When** o pipeline executa o lint do front-end, **Then** o job de lint front-end passa sem erros.
2. **Given** código front-end com um erro de sintaxe JavaScript, **When** o pipeline executa o lint, **Then** o job de lint front-end falha e indica o arquivo e linha com erro de sintaxe.

---

### User Story 4 - Lint pode ser executado localmente antes do push (Priority: P3)

Um(a) desenvolvedor(a) quer executar exatamente os mesmos checks de lint localmente, no terminal, antes de fazer push, para corrigir erros sem precisar esperar o pipeline de CI.

**Why this priority**: Reduz o ciclo de feedback. Um desenvolvedor não deve precisar fazer push para descobrir erros que poderiam ser vistos localmente em segundos.

**Independent Test**: Pode ser testado executando `npm run lint` dentro de `server/` em uma máquina com Node.js instalado e verificando que o resultado é idêntico ao que o CI reportaria.

**Acceptance Scenarios**:

1. **Given** Node.js e dependências instaladas localmente, **When** o(a) desenvolvedor(a) executa `npm run lint` dentro de `server/`, **Then** os mesmos checks do CI rodam localmente e relatam erros/avisos com o mesmo formato.
2. **Given** código com erros de lint, **When** `npm run lint` é executado, **Then** o processo termina com código de saída não-zero (refletindo que o CI falharia).

---

### Edge Cases

- O que acontece se o `package-lock.json` não estiver atualizado com a versão do ESLint declarada em `package.json`? O job de build deve falhar em `npm ci` com erro de lock file inconsistente, impedindo que lint seja executado sobre dependências incorretas.
- O que acontece se o pipeline rodar em um runner sem cache disponível? Os jobs de lint devem instalar dependências a partir de artifacts do job de build — sem depender de cache externo.
- O que acontece se um arquivo em `game/src/` tiver um erro de sintaxe mas o desenvolvedor não o introduziu naquele commit? O lint detecta o problema igualmente; a resolução é de responsabilidade do time.
- O que acontece se um novo arquivo `.js` for adicionado em `server/` sem seguir as convenções de lint existentes? O lint detecta automaticamente o arquivo e aplica as mesmas regras, reprovando o pipeline se houver erros.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O pipeline de CI DEVE ser executado automaticamente em todo push para qualquer branch do repositório, sem nenhuma configuração manual por execução.
- **FR-002**: O estágio de build DEVE instalar as dependências do servidor (`npm ci` em `server/`) e concluir com sucesso antes dos estágios de lint serem iniciados.
- **FR-003**: O estágio de lint back-end DEVE executar ESLint em todos os arquivos `.js` da pasta `server/` (excluindo `node_modules/`) e reprovar o pipeline se houver qualquer violação de regra configurada como `"error"`.
- **FR-004**: O estágio de lint front-end DEVE executar ESLint em todos os arquivos `.js` da pasta `game/src/` e reprovar o pipeline se houver erros de sintaxe ou violações de regras configuradas como `"error"`.
- **FR-005**: As configurações de ESLint DEVEM ser versionadas no repositório como arquivos de configuração (`.eslintrc.json`), uma por contexto (back-end / front-end), de modo que o comportamento seja idêntico localmente e no CI.
- **FR-006**: O(a) desenvolvedor(a) DEVE conseguir executar o mesmo lint localmente com o comando `npm run lint` (dentro de `server/`), sem necessidade de configuração adicional além de `npm install`.
- **FR-007**: A imagem Docker usada nos jobs de CI DEVE ser compatível com o Node.js 18 LTS declarado no projeto.
- **FR-008**: Os jobs de lint DEVEM depender explicitamente do job de build, garantindo que os módulos instalados pelo build sejam reutilizados (via artifacts) pelos jobs de lint.

### Key Entities

- **Pipeline**: Conjunto de estágios e jobs que executam automaticamente ao receber um push. Configurado pelo arquivo `.gitlab-ci.yml` na raiz do repositório.
- **Job de Build**: Job responsável por instalar as dependências do servidor (`npm ci`) e produzir os artefatos necessários para os jobs dependentes.
- **Job de Lint Back-end**: Job que executa ESLint sobre `server/` com regras para o ambiente Node.js.
- **Job de Lint Front-end**: Job que executa ESLint sobre `game/src/` com regras para o ambiente browser.
- **Configuração de Lint**: Arquivo `.eslintrc.json` versionado que define as regras de lint para cada contexto do projeto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um push para qualquer branch dispara automaticamente um pipeline que executa pelo menos 3 jobs (build, lint:back, lint:front); o pipeline completa em menos de 5 minutos para o código atual sem erros.
- **SC-002**: Introduzir uma variável não declarada em `server/server.js`, fazer push, e observar o pipeline falhar especificamente no job `lint:back` com a mensagem de erro do ESLint apontando o arquivo e linha — em 100% das tentativas.
- **SC-003**: O código atual de `server/` e `game/src/` passa no lint sem erros (zero violações de regras configuradas como `"error"`).
- **SC-004**: Executar `npm run lint` localmente em `server/` produz o mesmo resultado que o job de lint do CI para o mesmo estado de código.
- **SC-005**: O job de lint front-end passa para o código atual de `game/src/` (código legado não é penalizado por globals de browser já declarados na configuração).

## Assumptions

- O repositório está hospedado no GitLab e possui GitLab CI habilitado (com pelo menos um runner disponível).
- A configuração de lint usa ESLint v8.x (última versão estável da série 8) com formato de configuração `.eslintrc.json` (legacy config), adequado ao estilo de código CommonJS e ES5/ES2020 do projeto.
- O código back-end de `server/` usa Node.js 18 LTS, CommonJS (`require`/`module.exports`), e pode conter sintaxe ES2020 (`async/await`, template literals). O lint deve suportar esse mix.
- O código front-end de `game/src/` é JavaScript legado (ES5, IIFEs, globals de browser), com dependências externas (`io` do socket.io, `cv` do OpenCV) carregadas via `<script>` tag. A configuração de lint declara esses globals explicitamente.
- Arquivos de teste em `server/test/` usam Jest e precisam de globals do Jest (`describe`, `test`, `expect`, etc.) configurados na seção de `overrides` do `.eslintrc.json` do servidor.
- Esta fase não inclui testes unitários no CI (Fase 4), análise de segurança (Fase 6) ou qualidade de código com SonarCloud (Fase 7) — esses são estágios adicionados nas fases seguintes ao mesmo pipeline.
- O `package-lock.json` existente em `server/` é mantido atualizado após a adição da dependência ESLint.
