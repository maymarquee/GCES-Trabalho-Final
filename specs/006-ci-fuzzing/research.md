# Research: CI — Testes de Fuzzing

**Branch**: `006-ci-fuzzing` | **Date**: 2026-06-09

## Decisões de Design

### fast-check como ferramenta de fuzzing

**Decisão**: Usar fast-check v3.x (property-based testing) com Jest.

**Alternativas consideradas**:

- **jazzer.js (Code Intelligence)**: Fuzzer de cobertura guiada (coverage-guided), semelhante ao libFuzzer. Mais poderoso para encontrar bugs profundos, mas requer build instrumentado e configuração complexa; não integra nativamente com Jest.
- **jsfuzz**: Fuzzer simples de linha de comando, sem integração com Jest; output não se encaixa no pipeline já configurado.
- **Testes manuais com inputs hardcoded**: Sem capacidade de explorar o espaço de inputs; não é "fuzzing" real — é apenas testes de fronteira.
- **fast-check**: Integra nativamente com Jest (`fc.assert` dentro de `test()`), gera entradas arbitrárias com os `Arbitrary` builders (`fc.string()`, `fc.anything()`, etc.), e faz **shrinking** automático ao encontrar uma falha (reporta o menor input que reproduce o problema). É a ferramenta padrão de property-based testing para o ecossistema Node.js/Jest.

**Conclusão**: fast-check é a escolha natural dado que o projeto já usa Jest. A integração é zero-config: `fc.assert(fc.property(...))` dentro de um `test()` do Jest.

---

### Bug escolhido para o ciclo RED → GREEN

**Decisão**: Expor o bug de coerção de tipo em `GameCollection.createGame(id)`.

**O bug**: JavaScript converte qualquer chave de objeto para string implicitamente. `this._games[null]` é equivalente a `this._games["null"]`. Isso significa que `createGame(null)` cria um jogo sob a chave `"null"`, e qualquer tentativa subsequente de `createGame("null")` retorna `false` (GAME_EXISTS) — mesmo que nenhum jogador tenha criado explicitamente um jogo com esse nome.

**Por que esse bug importa**: Um cliente mal-formado (ou um adversário) pode enviar `null` como nome de jogo via Socket.io, bloqueando permanentemente o slot `"null"` para jogadores legítimos. A mesma lógica se aplica a `undefined` → `"undefined"`, `0` → `"0"`, `false` → `"false"`, `[object Object]` para qualquer objeto, etc.

**A correção**: Validar `typeof id !== 'string' || id.length === 0` no início de `createGame` — rejeita qualquer entrada não-string ou string vazia silenciosamente.

**Alternativas consideradas**:
- Introduzir um bug artificial no código existente e corrigi-lo: menos pedagógico; não demonstra o valor real do fuzzing.
- Expor uma vulnerabilidade de prototype pollution via `__proto__` como chave: Em Node.js moderno, `obj['__proto__'] = value` *pode* alterar o prototype do objeto (comportamento depende do engine), mas o impacto real é limitado e o teste seria frágil entre versões.

**Conclusão**: O bug de coerção de tipo é real, demonstrável, tem uma correção clara, e é exatamente o tipo de problema que testes baseados em propriedades com entradas arbitrárias são projetados para encontrar.

---

### Escopo dos fuzz tests: unitário vs. integração

**Decisão**: Usar fuzz tests unitários (chamadas diretas a `GameCollection`/`Game`), sem levantar servidor Socket.io.

**Motivação**: Testes de fuzzing via Socket.io (como nos testes de matchmaking) são muito mais lentos — cada run de `fc.assert` abriria e fecharia uma conexão TCP. Com 300 runs, isso levaria vários minutos. Fuzz tests unitários com mocks executam 300 runs em menos de 1 segundo.

**Consequência**: Os fuzz tests cobrem a lógica de negócio em `games.js`. A resiliência da camada de transporte Socket.io (deserialização de mensagens mal-formadas) não é coberta aqui — isso seria escopo de um teste de integração separado.

**Conclusão**: Fuzz tests unitários são suficientes para o rubric desta fase, são rápidos e determinísticos no CI.

---

### Número de runs por propriedade

**Decisão**: 300 runs para testes de resiliência (`.not.toThrow()`), 200 runs para testes de correção.

**Motivação**: fast-check por padrão executa 100 runs. Aumentar para 200-300 aumenta a cobertura do espaço de inputs sem impacto significativo no tempo (chamadas síncronas completam em < 2 segundos). Mais do que 1000 runs para chamadas síncronas começa a ser redundante.

**Conclusão**: 200-300 runs é um bom equilíbrio entre cobertura e velocidade para este projeto.

---

### Posição do job `test:fuzz` no pipeline

**Decisão**: Mesmo estágio `test`, em paralelo com `test:unit`.

**Motivação**: `test:fuzz` e `test:unit` são independentes — ambos dependem apenas do artifact `server/node_modules/` do job `build`. Rodar em paralelo reduz o tempo total do pipeline.

**Alternativa descartada**: Estágio separado `fuzz` após `test` — adiciona latência serial sem benefício técnico.

**Conclusão**: Estágio `test` com dois jobs (`test:unit` e `test:fuzz`) em paralelo é o design mais eficiente.
