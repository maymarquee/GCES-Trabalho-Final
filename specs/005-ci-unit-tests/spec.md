# Feature Specification: CI — Testes Unitários

**Feature Branch**: `005-ci-unit-tests`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "Fase 4 do projeto GCES (CI - Testes Unitários): implementação de testes unitários funcionais com commits sequenciais demonstrando o teste quebrando no CI e, em seguida, passando após correção."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pipeline executa testes automaticamente ao fazer push (Priority: P1)

Um(a) desenvolvedor(a) faz push de uma alteração no código e espera que o pipeline de CI execute os testes unitários automaticamente, reportando sucesso ou falha sem nenhuma ação manual.

**Why this priority**: É o requisito central desta fase — sem execução automática de testes no CI, a cobertura de testes não tem valor de enforcement. Qualquer outra história pressupõe que os testes rodem automaticamente.

**Independent Test**: Verificado fazendo push de um commit para o repositório e confirmando que o job `test:unit` aparece no pipeline e executa os testes.

**Acceptance Scenarios**:

1. **Given** um commit em qualquer branch com pipeline configurado, **When** o push chega ao servidor GitLab, **Then** um job `test:unit` é criado e executa automaticamente após o job de build.
2. **Given** o pipeline em execução com todos os testes passando, **When** os estágios concluem sem erro, **Then** o pipeline aparece com status "passed".
3. **Given** o pipeline em execução com um teste falhando, **When** o job de testes executa, **Then** o pipeline aparece com status "failed" indicando o job `test:unit`.

---

### User Story 2 - Um teste que falha reprovam o pipeline (Priority: P1)

Um(a) desenvolvedor(a) introduz um teste unitário para uma funcionalidade ainda não implementada e espera que o CI falhe com a mensagem clara do Jest apontando o teste reprovado.

**Why this priority**: Esta é a demonstração obrigatória do ciclo RED → GREEN exigida pelo rubric — o CI deve reprovar quando um teste falha e passar após a correção.

**Independent Test**: Testado fazendo push de um commit com um teste que chama `game.getPlayerCount()` (método inexistente) e verificando que o job `test:unit` falha com `TypeError: game.getPlayerCount is not a function`.

**Acceptance Scenarios**:

1. **Given** um teste que chama um método inexistente, **When** o pipeline executa os testes, **Then** o job `test:unit` falha com a mensagem de erro do Jest apontando o método não encontrado.
2. **Given** o método implementado corretamente, **When** o pipeline executa os testes após o commit de correção, **Then** o job `test:unit` passa com todos os testes em verde.

---

### User Story 3 - Testes unitários cobrem as entidades principais do servidor (Priority: P2)

Um(a) desenvolvedor(a) quer garantir que a lógica de gerenciamento de partidas (`GameCollection` e `Game`) esteja coberta por testes unitários que rodem sem depender de rede ou banco de dados.

**Why this priority**: Testes unitários isolados são mais rápidos e confiáveis que testes de integração. Cobrir as entidades principais garante que refatorações futuras não quebrem silenciosamente o comportamento esperado.

**Independent Test**: Verificado executando `npm test` dentro de `server/` localmente e confirmando que os testes de `games.unit.test.js` passam sem nenhuma conexão de rede ou banco de dados.

**Acceptance Scenarios**:

1. **Given** a lógica de `GameCollection`, **When** os testes unitários executam, **Then** todos os cenários de CRUD (criar, obter, remover jogo) são validados com assertions claras.
2. **Given** a lógica de `Game`, **When** os testes unitários executam com mock sockets, **Then** o comportamento de adicionar jogadores (incluindo limite de 2) é validado.
3. **Given** a execução dos testes, **When** `npm test` é executado, **Then** todos os testes passam em menos de 30 segundos sem nenhuma dependência externa real.

---

### User Story 4 - Testes podem ser executados localmente (Priority: P3)

Um(a) desenvolvedor(a) quer executar os mesmos testes do CI localmente com `npm test` antes de fazer push, para corrigir falhas sem esperar o pipeline.

**Why this priority**: Reduz o ciclo de feedback. A paridade local/CI garante que o desenvolvedor veja o mesmo resultado que o pipeline verá.

**Independent Test**: Verificado executando `npm test` dentro de `server/` localmente e confirmando que o output é idêntico ao que o job `test:unit` do CI produziria.

**Acceptance Scenarios**:

1. **Given** Node.js e dependências instaladas localmente, **When** `npm test` é executado em `server/`, **Then** os mesmos testes do CI rodam e reportam erros/sucessos no mesmo formato Jest.
2. **Given** um teste falhando, **When** `npm test` é executado, **Then** o processo termina com código de saída não-zero.

---

### Edge Cases

- O que acontece se os testes de integração (matchmaking.test.js) tentarem abrir uma porta já em uso? Os testes usam `server.listen(0)` para porta efêmera aleatória, evitando conflitos.
- O que acontece se o job `test:unit` tentar conectar ao banco de dados? O `db.test.js` usa `jest.mock('pg')` para simular o banco completamente — nenhuma conexão real é feita.
- O que acontece se o artifact `server/node_modules/` expirar antes do job de test rodar? O artifact tem TTL de 1 hora, suficiente para jobs que rodam no mesmo pipeline logo após o build.
- O que acontece ao adicionar um terceiro arquivo de teste sem seguir as convenções? Jest detecta automaticamente arquivos `*.test.js` na pasta `test/` e os executa sem configuração adicional.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O pipeline de CI DEVE executar os testes unitários automaticamente em todo push, no estágio `test`, após o estágio de `lint`.
- **FR-002**: O job `test:unit` DEVE usar o artifact `server/node_modules/` produzido pelo job `build`, sem reinstalar dependências.
- **FR-003**: O job `test:unit` DEVE executar `npm test` em `server/` e reprovar o pipeline se qualquer teste falhar (exit code não-zero).
- **FR-004**: Os testes unitários de `games.js` DEVEM cobrir `GameCollection.createGame`, `GameCollection.getGame`, `GameCollection.removeGame`, `Game.addPlayer`, e `Game.getPlayerCount`.
- **FR-005**: Os testes DEVEM usar mock sockets (objetos com `on`, `emit`, `disconnect` simulados) para isolar a lógica de jogo de dependências de rede.
- **FR-006**: O histórico de commits DEVE conter obrigatoriamente: (a) um commit com um teste que falha no CI, e (b) um commit subsequente com a correção que faz o CI passar.
- **FR-007**: O(a) desenvolvedor(a) DEVE conseguir executar `npm test` localmente em `server/` com o mesmo resultado que o CI produziria.

### Key Entities

- **Estágio `test`**: Estágio do pipeline adicionado após `lint`, que contém o job `test:unit`.
- **Job `test:unit`**: Job que executa `npm test` em `server/` usando os artifacts do job `build`.
- **`games.unit.test.js`**: Novo arquivo de teste unitário para `GameCollection` e `Game`, isolado de rede e banco de dados.
- **`Game.prototype.getPlayerCount`**: Novo método em `games.js` retornando o número atual de jogadores — implementado no commit GREEN após o commit RED com o teste falhando.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um push dispara um pipeline com pelo menos 4 jobs (build, lint:back, lint:front, test:unit); completa em menos de 5 minutos.
- **SC-002**: O commit com o teste `getPlayerCount` (antes da implementação) produz falha no job `test:unit` com mensagem `TypeError: game.getPlayerCount is not a function` — verificável no log do pipeline GitLab.
- **SC-003**: O commit com a implementação de `getPlayerCount` faz o pipeline passar com todos os testes em verde — verificável no log do pipeline GitLab.
- **SC-004**: Executar `npm test` localmente em `server/` passa todos os testes em menos de 30 segundos, sem nenhuma dependência de rede ou banco de dados ativo.
- **SC-005**: Os novos testes unitários cobrem os 6 comportamentos-chave de `GameCollection` e `Game` listados em FR-004.

## Assumptions

- Jest v29 está instalado como devDependency em `server/package.json` (já confirmado na fase anterior).
- O arquivo `server/.eslintrc.json` já possui o override `test/**/*.js` com `env: { jest: true }` para que os globals do Jest não causem erros de lint.
- O estágio `test` é inserido após `lint` no pipeline para garantir que código com erros de lint não chegue à fase de testes.
- Mock sockets são criados inline nos testes (objetos simples com `jest.fn()`) sem necessidade de biblioteca adicional.
- Esta fase não inclui relatório de cobertura (Coverage) — isso é parte da Fase 7 (SonarCloud). O foco aqui é apenas fazer os testes passarem/falharem no CI conforme esperado.
