# Feature Specification: CI — Testes de Fuzzing

**Feature Branch**: `006-ci-fuzzing`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "Fase 5 do projeto GCES (CI - Testes de Fuzzing): implementação de testes de fuzzing para validar a resiliência das entradas do servidor (Back-end) contra dados inesperados."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pipeline executa testes de fuzzing automaticamente ao fazer push (Priority: P1)

Um(a) desenvolvedor(a) faz push de uma alteração no código e espera que o pipeline de CI execute os testes de fuzzing automaticamente, reportando sucesso ou falha sem nenhuma ação manual.

**Why this priority**: É o requisito central desta fase — sem execução automática dos testes de fuzzing no CI, a validação de resiliência não tem valor de enforcement.

**Independent Test**: Verificado fazendo push de um commit e confirmando que o job `test:fuzz` aparece no pipeline e executa os testes.

**Acceptance Scenarios**:

1. **Given** um commit em qualquer branch com pipeline configurado, **When** o push chega ao servidor GitLab, **Then** um job `test:fuzz` é criado no estágio `test` e executa automaticamente após o build.
2. **Given** o pipeline em execução com todos os fuzz tests passando, **When** os estágios concluem sem erro, **Then** o pipeline aparece com status "passed".
3. **Given** o pipeline em execução com um fuzz test falhando, **When** o job `test:fuzz` executa, **Then** o pipeline aparece com status "failed" indicando o job `test:fuzz`.

---

### User Story 2 - Fuzz test expõe bug de coerção de tipo → CI falha → correção → CI passa (Priority: P1)

Um(a) desenvolvedor(a) escreve um teste de fuzzing que expõe um bug real: `GameCollection.createGame(null)` usa coerção de tipo implícita do JavaScript (`null` → `"null"`) e ocupa o slot do nome de jogo `"null"`, bloqueando um jogador legítimo de criar um jogo com esse nome. O CI falha; após corrigir a validação de entrada em `createGame`, o CI volta a passar.

**Why this priority**: Demonstra o valor concreto do fuzzing — encontrar classes de bugs que testes manuais típicos não cobrem. A sequência RED → GREEN (análoga à Fase 4) mostra que os fuzz tests enxergam comportamentos inesperados de produção.

**Independent Test**: Testado fazendo push do commit com o fuzz test que chama `createGame(null)` e depois `createGame('null')` esperando `true`, e verificando que o job `test:fuzz` falha com `Expected: true, Received: false`.

**Acceptance Scenarios**:

1. **Given** um fuzz test que afirma `createGame` rejeita entradas não-string, **When** o pipeline executa, **Then** o job `test:fuzz` falha porque `createGame(null)` atualmente retorna `true` em vez de `false`.
2. **Given** a validação adicionada a `createGame` (`typeof id !== 'string'`), **When** o pipeline executa após o commit de correção, **Then** o job `test:fuzz` passa com todos os fuzz tests em verde.

---

### User Story 3 - Fuzz tests cobrem resiliência das entidades do servidor contra dados arbitrários (Priority: P2)

Um(a) desenvolvedor(a) quer garantir que `GameCollection` e `Game` nunca lançam exceções para nenhuma entrada possível — strings normais, strings vazias, null, undefined, números, booleanos, arrays, objetos e strings com mais de 10.000 caracteres.

**Why this priority**: O objetivo do fuzzing é validar resiliência, não apenas a lógica correta. Um servidor que lança exceções não tratadas para inputs incomuns pode derrubar o processo Node.js e afetar todos os jogadores conectados.

**Independent Test**: Verificado executando `npm run test:fuzz` em `server/` localmente e confirmando que todos os testes de propriedade com `fc.assert` passam sem exceções.

**Acceptance Scenarios**:

1. **Given** `GameCollection.createGame` recebe qualquer valor JavaScript via `fc.anything()`, **When** o teste de propriedade executa 300 vezes, **Then** nenhuma chamada lança exceção.
2. **Given** `GameCollection.getGame` e `removeGame` recebem qualquer valor, **When** testados com `fc.anything()`, **Then** nenhuma chamada lança exceção.
3. **Given** `Game.addPlayer` recebe um mock socket, **When** testado com nomes de jogos gerados por `fc.string()`, **Then** nenhuma chamada lança exceção.

---

### User Story 4 - Fuzz tests podem ser executados localmente (Priority: P3)

Um(a) desenvolvedor(a) quer executar os mesmos fuzz tests do CI localmente com `npm run test:fuzz` antes de fazer push, para corrigir falhas sem esperar o pipeline.

**Why this priority**: Paridade local/CI reduz o ciclo de feedback.

**Independent Test**: Verificado executando `npm run test:fuzz` em `server/` localmente.

**Acceptance Scenarios**:

1. **Given** Node.js e dependências instaladas localmente, **When** `npm run test:fuzz` é executado em `server/`, **Then** os mesmos fuzz tests do CI rodam e reportam erros/sucessos.
2. **Given** um fuzz test falhando, **When** `npm run test:fuzz` é executado, **Then** o processo termina com código de saída não-zero.

---

### Edge Cases

- O que acontece se `fc.anything()` gerar um objeto circular? fast-check não gera objetos circulares por padrão; o arbitrary `fc.object()` gera objetos simples sem referências circulares.
- O que acontece se um fuzz test com 300 runs demorar mais de 30 segundos? O Jest timeout padrão é 5 segundos por teste, não por run; 300 runs de chamadas síncronas completam em menos de 1 segundo.
- O que acontece com strings de 10.000 caracteres como chave de objeto JavaScript? `this._games[longString]` é uma operação O(n) no tamanho da chave mas não lança exceções — o teste de resiliência confirma isso.
- O que acontece se `__proto__` for passado como nome de jogo? O teste de prototype pollution verifica que `Object.prototype` não é corrompido; com a validação de string adicionada, `createGame('__proto__')` ainda é aceito (é uma string válida) mas o teste verifica que métodos do `Object.prototype` permanecem intactos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O pipeline de CI DEVE executar os fuzz tests automaticamente em todo push, no estágio `test`, após o build.
- **FR-002**: O job `test:fuzz` DEVE usar o artifact `server/node_modules/` produzido pelo job `build`, sem reinstalar dependências.
- **FR-003**: O job `test:fuzz` DEVE executar `npm run test:fuzz` em `server/` e reprovar o pipeline se qualquer teste falhar.
- **FR-004**: Os fuzz tests DEVEM usar `fast-check` para gerar entradas arbitrárias (strings, null, undefined, inteiros, floats, booleanos, arrays, objetos) e verificar que `createGame`, `getGame` e `removeGame` nunca lançam exceções.
- **FR-005**: Os fuzz tests DEVEM verificar que `createGame` com entrada não-string retorna `false` (rejeição explícita, sem coerção de tipo silenciosa).
- **FR-006**: `GameCollection.createGame` DEVE ser corrigida para validar que `id` é uma string não-vazia antes de criar o jogo.
- **FR-007**: O histórico de commits DEVE conter: (a) um commit com fuzz tests que falham no CI, e (b) um commit subsequente com a correção que faz o CI passar.
- **FR-008**: O(a) desenvolvedor(a) DEVE conseguir executar `npm run test:fuzz` localmente em `server/` com o mesmo resultado que o CI produziria.

### Key Entities

- **Estágio `test`**: Estágio do pipeline já existente; passa a ter dois jobs: `test:unit` e `test:fuzz`.
- **Job `test:fuzz`**: Job que executa `npm run test:fuzz` usando os artifacts do job `build`.
- **`server.fuzz.test.js`**: Novo arquivo de fuzz tests em `server/test/`, usando fast-check para geração de entradas arbitrárias.
- **`fast-check`**: Biblioteca de property-based testing que gera e reduz (shrinks) entradas que causam falhas.
- **`GameCollection.createGame` (validação)**: Guard adicionado no GREEN commit: `typeof id !== 'string' || id.length === 0` → `return false`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um push dispara um pipeline com 5 jobs (build, lint:back, lint:front, test:unit, test:fuzz); completa em menos de 5 minutos.
- **SC-002**: O commit com os fuzz tests (antes da validação) produz falha no job `test:fuzz` com `Expected: true, Received: false` para `createGame('null')` após `createGame(null)` — verificável no log do pipeline GitLab.
- **SC-003**: O commit com a validação em `createGame` faz o pipeline passar com todos os fuzz tests em verde — verificável no log do pipeline GitLab.
- **SC-004**: Executar `npm run test:fuzz` localmente em `server/` completa em menos de 30 segundos, sem dependências de rede ou banco de dados.
- **SC-005**: Os fuzz tests cobrem pelo menos 6 propriedades distintas de `GameCollection` e `Game` com entradas arbitrárias.

## Assumptions

- fast-check v3.x é adicionado como devDependency em `server/package.json`.
- O script `"test:fuzz": "jest test/server.fuzz.test.js"` é adicionado ao `package.json`.
- O arquivo `.eslintrc.json` já possui o override `test/**/*.js` com `env: { jest: true }`, portanto `fast-check` como import externo é aceito pelo linter.
- Esta fase não altera a lógica de negócio além da validação de entrada em `createGame` — não são adicionados recursos novos ao jogo.
- Mock sockets são criados inline nos fuzz tests (mesma abordagem dos testes unitários da Fase 4).
