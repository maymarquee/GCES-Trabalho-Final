# Contract: Quality Gate — SonarCloud

**Phase**: 008-code-quality | **Date**: 2026-06-09

## Job `sonarcloud` — Contrato

### Pré-condições

- Variável CI `SONAR_TOKEN` configurada e mascarada no GitLab.
- Artefato `server/coverage/lcov.info` produzido pelo job `test:unit`.
- Arquivo `sonar-project.properties` com `sonar.projectKey` e `sonar.organization` preenchidos.
- Projeto importado no sonarcloud.io com Quality Gate configurado.

### Comportamento garantido

- O job executa `sonar-scanner` com `GIT_DEPTH=0` (histórico git completo).
- O job aguarda o resultado assíncrono do Quality Gate (`qualitygate.wait=true`).
- O job falha (`exit 1`) se o Quality Gate retornar `ERROR`.
- O job passa (`exit 0`) se o Quality Gate retornar `OK`.
- O cache `.sonar/cache` é reutilizado entre execuções para acelerar análises.

### Pós-condições

- Dashboard sonarcloud.io atualizado com métricas da análise.
- Log do job contém link direto para o dashboard SonarCloud.
- Status do Quality Gate visível no pipeline GitLab e em sonarcloud.io.

---

## Job `test:unit` (atualizado) — Contrato

### Comportamento garantido

- Executa `npm run test:coverage` (jest com `--coverage`).
- Gera `server/coverage/lcov.info` no formato LCOV.
- Exporta `server/coverage/` como artefato válido por 1 hora.
- O regex `coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'` extrai o percentual de linhas para o widget de cobertura do GitLab.

### Invariantes

- A cobertura não deve cair abaixo de 60% nas linhas do `games.js` — arquivo mais testado.
- O artefato `lcov.info` sempre é gerado, mesmo se algum teste falhar (`when: always`).
