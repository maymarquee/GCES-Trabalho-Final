# Feature Specification: Qualidade de Código — SonarCloud

**Feature Branch**: `008-code-quality`

**Created**: 2026-06-09

**Status**: Draft

**Input**: Phase 7 do projeto GCES (Qualidade de Código): integração completa com o SonarCloud no pipeline de CI, garantindo métricas de qualidade e cobertura mínima de código.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pipeline executa análise de qualidade SonarCloud automaticamente ao fazer push (Priority: P1)

Um(a) desenvolvedor(a) faz push de uma alteração e espera que o pipeline execute análise completa de qualidade de código no SonarCloud, reportando métricas e validando o Quality Gate automaticamente.

**Why this priority**: É o requisito central desta fase — sem análise automática de qualidade, problemas de maintainability, coverage e bugs são descobertos tarde demais no ciclo de desenvolvimento.

**Independent Test**: Verificado fazendo push de um commit e confirmando que o job `sonarcloud` aparece no estágio `quality` do pipeline e que o resultado aparece no dashboard sonarcloud.io.

**Acceptance Scenarios**:

1. **Given** um commit em qualquer branch com pipeline configurado, **When** o push chega ao servidor GitLab, **Then** um job `sonarcloud` é criado no estágio `quality` e executa automaticamente.
2. **Given** o pipeline em execução com sonarcloud concluído, **When** o Quality Gate passa, **Then** o job termina com exit code `0` e o status verde aparece no pipeline.
3. **Given** o pipeline em execução, **When** o job `sonarcloud` executa, **Then** o dashboard em sonarcloud.io exibe métricas atualizadas de coverage, bugs, code smells e duplicações.

---

### User Story 2 - Cobertura de código é reportada no SonarCloud (Priority: P1)

Um(a) desenvolvedor(a) quer visualizar a cobertura de código (%) diretamente no dashboard SonarCloud, com dados gerados pelos testes Jest já existentes.

**Why this priority**: Cobertura é a métrica mais diretamente acionável para qualidade — sem ela, o dashboard SonarCloud fica incompleto e o Quality Gate não pode verificar coverage em novo código.

**Independent Test**: Verificado acessando sonarcloud.io → projeto → Overview e confirmando que a métrica "Coverage" exibe um percentual numérico (não "—").

**Acceptance Scenarios**:

1. **Given** o job `test:unit` executado com `--coverage`, **When** o job `sonarcloud` executa, **Then** o arquivo `server/coverage/lcov.info` é encontrado e a cobertura é enviada ao SonarCloud.
2. **Given** a análise SonarCloud concluída, **When** o desenvolvedor acessa o dashboard, **Then** a métrica Coverage exibe um valor numérico percentual calculado a partir dos testes Jest.
3. **Given** novo código sem cobertura adicionado, **When** o Quality Gate verifica, **Then** o gate falha se a cobertura em novo código estiver abaixo do limiar configurado.

---

### User Story 3 - Quality Gate bloqueia merge se métricas não atendem o padrão (Priority: P2)

Um(a) desenvolvedor(a) quer garantir que código com qualidade abaixo do padrão não seja integrado na branch principal.

**Why this priority**: A barreira de qualidade automática é o valor central desta fase — sem ela, SonarCloud se torna apenas relatório passivo sem impacto no fluxo de desenvolvimento.

**Independent Test**: Verificado introduzindo um bloco de código duplicado ou com bug óbvio e confirmando que o Quality Gate falha na análise.

**Acceptance Scenarios**:

1. **Given** o Quality Gate "Sonar way" configurado no SonarCloud, **When** novo código com cobertura < 80% é enviado, **Then** o job `sonarcloud` falha com `QUALITY_GATE_ERROR`.
2. **Given** código que atende todos os critérios do Quality Gate, **When** o pipeline executa, **Then** o job `sonarcloud` passa e o status "Passed" aparece no SonarCloud.

---

### Edge Cases

- O que acontece se `SONAR_TOKEN` não estiver configurado como variável CI? O job `sonarcloud` falha com erro de autenticação — o token é obrigatório.
- O que acontece se `server/coverage/lcov.info` não existir quando o job `sonarcloud` executar? O SonarCloud analisa o código sem métricas de cobertura — a coverage aparece como "—" no dashboard.
- O que acontece se o `sonar-project.properties` tiver `projectKey` ou `organization` incorretos? O scanner falha com erro `404 Not Found` da API do SonarCloud.
- O que acontece com arquivos `node_modules/` na análise? São excluídos via `sonar.exclusions` para evitar falsos positivos e análise desnecessária.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O pipeline de CI DEVE executar análise SonarCloud automaticamente em todo push, no estágio `quality` (após `test`).
- **FR-002**: O job `test:unit` DEVE executar jest com `--coverage` e exportar o diretório `server/coverage/` como artefato.
- **FR-003**: O job `sonarcloud` DEVE usar a imagem `sonarsource/sonar-scanner-cli:latest` e o token `SONAR_TOKEN` (variável CI mascarada).
- **FR-004**: O job `sonarcloud` DEVE usar `GIT_DEPTH: "0"` para garantir análise completa do histórico git pelo SonarCloud.
- **FR-005**: O arquivo `sonar-project.properties` na raiz DEVE definir: `sonar.projectKey`, `sonar.organization`, `sonar.sources`, `sonar.tests`, `sonar.javascript.lcov.reportPaths` e `sonar.exclusions`.
- **FR-006**: O job `sonarcloud` DEVE passar `-Dsonar.qualitygate.wait=true` para aguardar o resultado do Quality Gate e falhar o pipeline se não passar.
- **FR-007**: O(a) desenvolvedor(a) DEVE conseguir executar a análise localmente com `sonar-scanner` após configurar as credenciais.

### Key Entities

- **Estágio `quality`**: Novo estágio no pipeline, executado após `test`. Contém o job `sonarcloud`.
- **Job `sonarcloud`**: Executa `sonar-scanner` com `GIT_DEPTH=0` e `SONAR_TOKEN`; aguarda resultado do Quality Gate.
- **`sonar-project.properties`**: Arquivo de configuração do sonar-scanner na raiz do projeto; define sources, tests, coverage path e exclusões.
- **`server/coverage/lcov.info`**: Relatório LCOV gerado pelo Jest com `--coverage`; consumido pelo SonarCloud para métricas de cobertura.
- **`SONAR_TOKEN`**: Token de autenticação gerado no sonarcloud.io; configurado como variável CI mascarada no GitLab.
- **Quality Gate "Sonar way"**: Conjunto de condições de qualidade configurado no SonarCloud; inclui coverage ≥ 80% em novo código.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um push dispara o job `sonarcloud` no estágio `quality`; pipeline completa em menos de 15 minutos.
- **SC-002**: O dashboard SonarCloud exibe métricas de Coverage com valor numérico (não "—").
- **SC-003**: O Quality Gate mostra status "Passed" no dashboard sonarcloud.io para o branch `main`.
- **SC-004**: O job `test:unit` exporta o artefato `server/coverage/` com `lcov.info` — verificável em `CI/CD → Pipelines → Artifacts`.
- **SC-005**: O arquivo `sonar-project.properties` existe na raiz do repositório com `projectKey`, `organization` e `sonar.javascript.lcov.reportPaths` configurados.

## Assumptions

- O projeto está hospedado no GitLab.com; a integração SonarCloud ↔ GitLab é via OAuth ou token pessoal.
- O token `SONAR_TOKEN` é gerado no sonarcloud.io e configurado como variável CI mascarada no GitLab.
- O Quality Gate "Sonar way" padrão do SonarCloud é suficiente — não é necessário criar um Quality Gate customizado.
- As dependências atuais não introduzem código duplicado que falhe o Quality Gate.
- Esta fase não altera a lógica de negócio da aplicação — apenas o pipeline de CI e a configuração do sonar-scanner.
