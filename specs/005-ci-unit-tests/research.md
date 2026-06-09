# Research: CI — Testes Unitários

**Branch**: `005-ci-unit-tests` | **Date**: 2026-06-09

## Decisões de Design

### Jest como framework de testes

**Decisão**: Manter Jest v29 (já instalado em `server/package.json`).

**Alternativas consideradas**:
- **Mocha + Chai**: Mais configuração manual; Jest oferece mocking embutido (`jest.fn()`, `jest.mock()`), assertions nativas e relatório de cobertura, sem necessidade de dependências extras.
- **Node Test Runner (nativo)**: Disponível desde Node 18, mas sem o suporte a mocking automático de módulos que `db.test.js` usa com `jest.mock('pg')`.

**Conclusão**: Jest é a escolha mais simples dado que já está instalado e os testes existentes o usam.

---

### Estratégia de mock para testes unitários de `games.js`

**Decisão**: Usar objetos simples com `jest.fn()` como mock sockets, criados inline nos testes.

**Alternativas consideradas**:
- **socket.io-mock (pacote npm)**: Overhead desnecessário; os testes só precisam que sockets tenham `on`, `emit`, `disconnect` e `id`.
- **Instância real de socket.io**: Tornaria o teste de integração, não unitário — dependência de rede e porta.

**Conclusão**: Mock socket mínimo inline (`{ id, on: jest.fn(), emit: jest.fn(), disconnect: jest.fn() }`) é suficiente e mantém os testes isolados e rápidos.

---

### Novo método `Game.prototype.getPlayerCount`

**Decisão**: Adicionar método simples que retorna `this._players.length`.

**Motivação**: Demonstrar o ciclo RED → GREEN obrigatório da Fase 4 de forma limpa. Além disso, `getPlayerCount` é útil para futuros testes e para lógica de negócio que precise verificar se um jogo está completo.

**Alternativas consideradas**:
- Introduzir um bug propositalmente em código existente e corrigi-lo: menos pedagógico, simula um cenário artificial.
- Escrever um teste para comportamento já existente que falha por uma edge case não coberta: mais frágil e confuso para quem lê o histórico.

**Conclusão**: TDD limpo (escreve o teste → falha → implementa) é a abordagem mais transparente e correta para o histórico de commits.

---

### Posição do estágio `test` no pipeline

**Decisão**: Inserir `test` após `lint` na sequência `build → lint → test`.

**Motivação**: Código com erros de lint não chega à fase de testes — fail fast. O job `test:unit` usa os artifacts de `node_modules/` produzidos pelo job `build`, o que é consistente com o padrão já estabelecido para os jobs de lint.

**Alternativas consideradas**:
- `test` em paralelo com `lint`: Economizaria tempo mas executaria testes em código com possíveis erros de lint.
- `test` no mesmo estágio que `lint`: Semânticamente incorreto; lint e testes são categorias diferentes.

**Conclusão**: Sequência `build → lint → test` é a mais clara e segura.

---

### Cobertura de código

**Decisão**: Não configurar relatório de cobertura nesta fase.

**Motivação**: O rubric reserva métricas de qualidade (cobertura mínima) para a Fase 7 (SonarCloud). Adicionar `--coverage` agora adicionaria complexidade sem valor incremental.

**Conclusão**: `npm test` executa Jest sem flags de cobertura. Cobertura será adicionada na Fase 7.
