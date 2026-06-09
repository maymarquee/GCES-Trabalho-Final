# Research: Segurança — SAST & SCA

**Branch**: `007-sast-sca` | **Date**: 2026-06-09

## Decisões de Design

### SAST: GitLab SAST Template com Semgrep

**Decisão**: Usar o template oficial `Security/SAST.gitlab-ci.yml` do GitLab, que utiliza semgrep como analyzer para JavaScript/Node.js.

**Alternativas consideradas**:

- **ESLint com plugins de segurança (`eslint-plugin-security`, `eslint-plugin-no-unsanitized`)**: Integração simples, já temos ESLint configurado. Porém, não é uma ferramenta SAST dedicada — cobre menos padrões de vulnerabilidade e não gera relatórios no formato GitLab Security.
- **Snyk SAST (Code)**: Boa detecção, integração GitLab nativa. Requer conta Snyk e token de API como secret; adiciona dependência externa. O tier gratuito tem limitações de scans por mês.
- **SonarCloud SAST**: Poderoso, mas pertence à Fase 7 (Qualidade de Código). Misturar SAST com qualidade de código viola a separação de responsabilidades entre as fases.
- **Horusec**: Ferramenta open-source que agrega múltiplos analyzers. Configuração mais complexa; sem integração nativa com GitLab Security Dashboard.
- **GitLab SAST Template (semgrep)**: Zero configuração extra — `include: template: Security/SAST.gitlab-ci.yml` é suficiente. Disponível no GitLab Free tier. Gera `gl-sast-report.json` no formato padrão GitLab, integrando com o Security Dashboard. Semgrep é um analyzer moderno, com regras mantidas pela comunidade e pelo GitLab.

**Conclusão**: O template GitLab SAST com semgrep é a escolha com menor overhead de configuração, integração nativa com a plataforma, e sem dependências externas. É a abordagem recomendada pelo próprio GitLab para projetos JavaScript/Node.js.

---

### SCA: npm audit vs. Snyk

**Decisão**: Usar `npm audit` como ferramenta SCA.

**Alternativas consideradas**:

- **Snyk (`snyk test`)**: Mais detalhado que `npm audit`, com informações de remediação e histórico. Requer conta Snyk, token de API (`SNYK_TOKEN`) como CI/CD secret, e uma dependência CLI no runner. O README menciona "ex: Snyk ou npm audit" — Snyk é opcional.
- **`audit-ci`**: Wrapper sobre `npm audit` com configuração por nível de severidade via arquivo JSON. Overhead de dependência sem ganho funcional para este projeto (podemos configurar `--audit-level` diretamente).
- **`npm audit`**: Built-in no npm — zero dependências adicionais, zero configuração de secrets. Usa o mesmo banco de dados de vulnerabilidades do npm Registry. O flag `--audit-level=high` garante que o pipeline falha apenas em vulnerabilidades de severidade `high` ou `critical`, ignorando `low`/`moderate` que frequentemente não têm remediação disponível. Gera JSON via `--json` para artefato de referência.

**Conclusão**: `npm audit` é suficiente para os requisitos desta fase e elimina a necessidade de criar secrets de API. Snyk pode ser adicionado futuramente se a equipe precisar de relatórios mais detalhados.

---

### Nível de severidade para falha: `--audit-level=high`

**Decisão**: Falhar o pipeline apenas em vulnerabilidades `high` ou `critical`.

**Motivação**: Vulnerabilidades `low` e `moderate` frequentemente:
- Afetam apenas ambientes de desenvolvimento (devDependencies)
- Não têm fix disponível ainda (depende de upstream)
- Requerem condições específicas de exploração que não se aplicam ao projeto

Usar `--audit-level=high` segue a prática da indústria (OWASP, CIS) de bloquear apenas riscos reais de produção.

**Estado atual**: `npm audit` retorna 0 vulnerabilidades para as dependências atuais do projeto (`express 4.21.2`, `socket.io 4.8.1`, `pg 8.13.3`).

---

### Posição no pipeline: estágio `security` após `test`

**Decisão**: Criar um estágio `security` separado, executado após o estágio `test`.

**Motivação**:
- Separação semântica clara entre qualidade de código (testes) e segurança (análise de vulnerabilidades)
- O template GitLab SAST usa `stage: test` por padrão; sobrescrever para `security` alinha o pipeline com convenções DevSecOps
- Jobs de segurança não bloqueiam o feedback de testes unitários/fuzzing (falham em paralelo ou após)

**Alternativa descartada**: Colocar `sca:npm-audit` no estágio `test` — semântica incorreta, mistura responsabilidades de qualidade e segurança.

---

### `allow_failure` para SAST

**Decisão**: `semgrep-sast` usa `allow_failure: true` (padrão do template GitLab).

**Motivação**: Análise SAST pode gerar falsos positivos. Bloquear o pipeline em todo achado SAST seria contraproducente — a equipe precisaria fazer triage de cada finding antes de qualquer merge. A prática padrão é gerar o relatório, exibir no Security Dashboard, e permitir que a equipe decida a remediação em um ciclo separado. O job `sca:npm-audit` (vulnerabilidades reais em dependências) usa `allow_failure: false` pois é objetivo — não há ambiguidade sobre o que é uma vulnerabilidade conhecida.
