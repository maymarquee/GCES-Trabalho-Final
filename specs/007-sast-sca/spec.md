# Feature Specification: Segurança — SAST & SCA

**Feature Branch**: `007-sast-sca`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "Fase 6 do projeto GCES (Segurança - SAST & SCA): integração de ferramentas de análise estática de segurança (SAST) e verificação de vulnerabilidades em dependências (SCA - npm audit) no pipeline de CI."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pipeline executa análise SAST automaticamente ao fazer push (Priority: P1)

Um(a) desenvolvedor(a) faz push de uma alteração no código e espera que o pipeline de CI execute uma análise estática de segurança (SAST) automaticamente, reportando achados sem nenhuma ação manual.

**Why this priority**: É o requisito central desta fase — sem análise SAST automatizada no CI, vulnerabilidades de código podem ser introduzidas sem detecção.

**Independent Test**: Verificado fazendo push de um commit e confirmando que o job `semgrep-sast` aparece no pipeline no estágio `security` e executa.

**Acceptance Scenarios**:

1. **Given** um commit em qualquer branch com pipeline configurado, **When** o push chega ao servidor GitLab, **Then** um job `semgrep-sast` é criado no estágio `security` e executa automaticamente.
2. **Given** o pipeline em execução com SAST concluído, **When** o job termina sem erros críticos, **Then** um artefato `gl-sast-report.json` é gerado com o relatório de achados.
3. **Given** o pipeline em execução, **When** o job `semgrep-sast` executa, **Then** o pipeline continua mesmo se achados informativos forem reportados (`allow_failure: true`).

---

### User Story 2 - Pipeline executa verificação SCA (npm audit) automaticamente (Priority: P1)

Um(a) desenvolvedor(a) faz push e espera que o pipeline verifique automaticamente se as dependências possuem vulnerabilidades conhecidas, falhando o pipeline em caso de vulnerabilidade com severidade alta ou crítica.

**Why this priority**: Dependências vulneráveis são o vetor de ataque mais comum em projetos Node.js. A SCA automatizada impede que dependências comprometidas cheguem à produção.

**Independent Test**: Verificado fazendo push e confirmando que o job `sca:npm-audit` executa no estágio `security` e passa porque não há vulnerabilidades de alta/crítica severidade.

**Acceptance Scenarios**:

1. **Given** um commit com `server/package.json` sem vulnerabilidades de alta severidade, **When** o pipeline executa, **Then** o job `sca:npm-audit` passa com exit code `0`.
2. **Given** uma dependência com vulnerabilidade crítica introduzida no `package.json`, **When** o pipeline executa, **Then** o job `sca:npm-audit` falha e bloqueia o pipeline.
3. **Given** o job `sca:npm-audit` em execução, **When** `npm audit` completa, **Then** um artefato `npm-audit-report.json` é gerado para referência.

---

### User Story 3 - Relatórios de segurança são acessíveis no pipeline GitLab (Priority: P2)

Um(a) desenvolvedor(a) quer visualizar os resultados da análise de segurança diretamente na interface do GitLab, sem precisar acessar logs brutos.

**Why this priority**: A visibilidade dos achados de segurança na interface do GitLab facilita a triagem e resolução de vulnerabilidades.

**Independent Test**: Verificado navegando até `Security & Compliance → Vulnerability Report` no GitLab após o pipeline executar (disponível em projetos com GitLab Free).

**Acceptance Scenarios**:

1. **Given** o pipeline executado com sucesso, **When** o desenvolvedor acessa `CI/CD → Pipelines → [pipeline] → Artifacts`, **Then** o artefato `gl-sast-report.json` está disponível para download.
2. **Given** o artefato `gl-sast-report.json` gerado, **When** inspecionado, **Then** contém a estrutura padrão do GitLab SAST (`vulnerabilities[]`, `scan.scanner`, `scan.type: "sast"`).

---

### User Story 4 - Verificação SCA pode ser executada localmente (Priority: P3)

Um(a) desenvolvedor(a) quer verificar vulnerabilidades de dependências localmente com `npm audit` antes de fazer push.

**Why this priority**: Paridade local/CI reduz o ciclo de feedback.

**Independent Test**: Verificado executando `npm audit` em `server/` localmente.

**Acceptance Scenarios**:

1. **Given** Node.js e dependências instaladas localmente, **When** `npm audit` é executado em `server/`, **Then** o relatório de vulnerabilidades é exibido e o exit code reflete o resultado.
2. **Given** nenhuma vulnerabilidade alta/crítica presente, **When** `npm audit --audit-level=high` é executado, **Then** o processo termina com exit code `0`.

---

### Edge Cases

- O que acontece se o semgrep não conseguir analisar um arquivo JavaScript complexo (ex: `mk.js` com 4000+ linhas)? Semgrep processa o arquivo inteiro; pode ser lento mas não falha.
- O que acontece se `node_modules/` for incluído na análise SAST? Geraria milhares de achados falsos; por isso `node_modules` é explicitamente excluído via `SAST_EXCLUDED_PATHS`.
- O que acontece se uma dependência transitiva tiver vulnerabilidade? `npm audit` reporta todas as vulnerabilidades, incluindo transitivas, com o caminho de dependência.
- O que acontece com o job SAST se o GitLab runner não tiver acesso ao Docker Hub? O job falharia ao puxar a imagem semgrep; na prática, o GitLab.com com shared runners tem acesso garantido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O pipeline de CI DEVE executar análise SAST (semgrep) automaticamente em todo push, no estágio `security`.
- **FR-002**: O job `semgrep-sast` DEVE gerar um artefato `gl-sast-report.json` no formato padrão GitLab SAST.
- **FR-003**: O job `semgrep-sast` DEVE excluir `node_modules`, `test` e diretórios temporários da análise.
- **FR-004**: O job `semgrep-sast` DEVE usar `allow_failure: true` — achados SAST são informativos e não bloqueiam o pipeline por padrão.
- **FR-005**: O pipeline de CI DEVE executar verificação SCA (`npm audit`) automaticamente em todo push, no estágio `security`.
- **FR-006**: O job `sca:npm-audit` DEVE falhar o pipeline se houver vulnerabilidades com severidade `high` ou `critical` (`--audit-level=high`).
- **FR-007**: O job `sca:npm-audit` DEVE gerar um artefato `npm-audit-report.json` para referência.
- **FR-008**: O(a) desenvolvedor(a) DEVE conseguir executar `npm audit` localmente em `server/` com o mesmo resultado que o CI produziria.

### Key Entities

- **Estágio `security`**: Novo estágio no pipeline, executado após `test`. Contém os jobs `semgrep-sast` e `sca:npm-audit`.
- **Job `semgrep-sast`**: Gerado automaticamente pela inclusão do template `Security/SAST.gitlab-ci.yml`; sobrescrito para usar o estágio `security`.
- **Job `sca:npm-audit`**: Job personalizado que executa `npm audit --audit-level=high` e gera relatório JSON.
- **`gl-sast-report.json`**: Artefato de relatório no formato GitLab SAST; integra com a interface de segurança do GitLab.
- **`npm-audit-report.json`**: Artefato de relatório SCA; contém o inventário de vulnerabilidades de dependências.
- **`SAST_EXCLUDED_PATHS`**: Variável de configuração do template SAST para excluir diretórios irrelevantes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um push dispara um pipeline com 7 jobs (build, lint:back, lint:front, test:unit, test:fuzz, semgrep-sast, sca:npm-audit); completa em menos de 10 minutos.
- **SC-002**: O job `sca:npm-audit` passa com `found 0 vulnerabilities` — verificável no log do pipeline GitLab.
- **SC-003**: O job `semgrep-sast` gera o artefato `gl-sast-report.json` — acessível em `CI/CD → Pipelines → [pipeline] → Artifacts`.
- **SC-004**: Executar `npm audit` localmente em `server/` completa em menos de 10 segundos e reporta 0 vulnerabilidades.
- **SC-005**: O arquivo `.gitlab-ci.yml` inclui `template: Security/SAST.gitlab-ci.yml` e define o job `sca:npm-audit` no estágio `security`.

## Assumptions

- O projeto está hospedado no GitLab.com; shared runners têm acesso ao Docker Hub para puxar a imagem semgrep.
- As dependências atuais (`express 4.x`, `socket.io 4.x`, `pg 8.x`) não possuem vulnerabilidades conhecidas de alta/crítica severidade.
- O template `Security/SAST.gitlab-ci.yml` está disponível no GitLab Free tier (semgrep analyzer).
- Esta fase não altera a lógica de negócio da aplicação — apenas o pipeline de CI.
- O `node_modules` não é versionado no repositório (está no `.gitignore`), portanto não é analisado pelo SAST.
