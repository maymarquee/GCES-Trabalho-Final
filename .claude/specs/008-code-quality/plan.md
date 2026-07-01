# Implementation Plan: Qualidade de Código — SonarCloud

**Branch**: `008-code-quality` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

## Summary

Integrar o SonarCloud ao pipeline GitLab CI adicionando um estágio `quality` com o job `sonarcloud`. Configurar o Jest para gerar relatório LCOV de cobertura no job `test:unit` e passá-lo via artefato para o scanner. Criar `sonar-project.properties` na raiz com as configurações do projeto.

## Technical Context

**Language/Version**: Node.js 18 LTS; Jest 29.x para cobertura.

**CI Platform**: GitLab CI — arquivo `.gitlab-ci.yml` na raiz.

**Quality Tool**: SonarCloud (sonarcloud.io) via imagem Docker `sonarsource/sonar-scanner-cli:latest`.

**Coverage Tool**: Jest com `--coverage` gerando LCOV via `coverageReporters: ["lcov", "text-summary"]`.

**Estado atual**: Pipeline tem 5 estágios (build, lint, test, security) com 7 jobs. Esta fase adiciona o estágio `quality` com 1 novo job.

## Constitution Check

| Princípio | Status | Justificativa |
|---|---|---|
| I — Incremental & Atomic Delivery | ✅ PASS | Commits separados: specs → Jest coverage → sonar config → CI → docs. |
| II — Environment Parity via Containers | ✅ PASS | sonar-scanner executa na mesma imagem Docker em CI e pode ser executado localmente. |
| III — Test- & Quality-Gated Changes | ✅ PASS | Quality Gate SonarCloud bloqueia pipeline se métricas não atendem padrão. |
| IV — Security by Default | ✅ PASS | SONAR_TOKEN configurado como variável mascarada — nunca exposto em logs. |
| V — Documentation as a Deliverable | ✅ PASS | ComoRodar.md atualizado com seção de qualidade de código. |

## Project Structure

### Documentation (this feature)

```text
specs/008-code-quality/
├── plan.md                    # Este arquivo
├── spec.md                    # Especificação completa
├── research.md                # Decisões: SonarCloud, LCOV, GIT_DEPTH, qualitygate.wait
├── data-model.md              # Pipeline, artefatos, variáveis, propriedades sonar
├── quickstart.md              # Setup manual SonarCloud + execução local
├── contracts/
│   └── quality-contract.md   # Contrato: job sonarcloud, Quality Gate, artefatos
└── checklists/
    └── requirements.md       # Checklist de qualidade
```

### Source Code Changes

```text
/
├── sonar-project.properties              # NOVO: configuração sonar-scanner
├── .gitlab-ci.yml                        # ATUALIZADO: estágio quality, job sonarcloud, cobertura em test:unit
├── server/package.json                   # ATUALIZADO: script test:coverage, jest config (lcov)
└── ComoRodar.md                          # ATUALIZADO: seção CI — Qualidade de Código (SonarCloud)
```

## Implementation Details

### `server/package.json` — Mudanças

**1. Adicionar script `test:coverage`:**
```json
"test:coverage": "jest --coverage"
```

**2. Adicionar configuração Jest para LCOV:**
```json
"jest": {
  "coverageReporters": ["lcov", "text-summary"],
  "coverageDirectory": "coverage",
  "collectCoverageFrom": ["*.js"]
}
```

### `sonar-project.properties` — Novo arquivo (raiz)

```properties
sonar.projectKey=REPLACE_WITH_YOUR_SONARCLOUD_PROJECT_KEY
sonar.organization=REPLACE_WITH_YOUR_SONARCLOUD_ORGANIZATION
sonar.sources=server,game/src
sonar.tests=server/test
sonar.test.inclusions=server/test/**/*.test.js
sonar.javascript.lcov.reportPaths=server/coverage/lcov.info
sonar.exclusions=server/node_modules/**,game/images/**,game/styles/**
sonar.sourceEncoding=UTF-8
```

### `.gitlab-ci.yml` — Mudanças

**1. Adicionar `quality` ao array de stages:**
```yaml
stages:
  - build
  - lint
  - test
  - security
  - quality
```

**2. Atualizar `test:unit` para gerar cobertura e exportar artefato:**
```yaml
test:unit:
  stage: test
  needs:
    - job: build
      artifacts: true
  script:
    - cd server && npm run test:coverage
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'
  artifacts:
    when: always
    paths:
      - server/coverage/
    expire_in: 1 hour
```

**3. Adicionar job `sonarcloud`:**
```yaml
sonarcloud:
  stage: quality
  image: sonarsource/sonar-scanner-cli:latest
  needs:
    - job: test:unit
      artifacts: true
  variables:
    SONAR_USER_HOME: "${CI_PROJECT_DIR}/.sonar"
    GIT_DEPTH: "0"
  cache:
    key: "${CI_JOB_NAME}"
    paths:
      - .sonar/cache
  script:
    - sonar-scanner -Dsonar.qualitygate.wait=true
```

### Por que `needs: [test:unit]` no `sonarcloud`?

O job `sonarcloud` depende do artefato `server/coverage/lcov.info` produzido pelo `test:unit`. Sem esse artefato, o SonarCloud analisa o código mas não reporta métricas de cobertura. O `needs` garante que o artefato está disponível e que o scanner roda após os testes.

### Por que `GIT_DEPTH: "0"` no job `sonarcloud`?

O GitLab CI faz por padrão `git fetch --depth=1` (shallow clone). O SonarCloud precisa do histórico completo para calcular corretamente métricas de "novo código" vs. código existente — sem isso, todo código é tratado como "novo" e os thresholds do Quality Gate ficam incorretos.

### Configuração manual necessária (UI SonarCloud + GitLab)

Estes passos não podem ser automatizados via CI e precisam ser feitos uma vez pelo(a) desenvolvedor(a):

1. Criar conta em sonarcloud.io (Login com GitLab)
2. Criar organização (ou usar a auto-criada na importação)
3. Importar o projeto GitLab
4. Anotar `Project Key` e `Organization Key` → preencher em `sonar-project.properties`
5. Gerar token: sonarcloud.io → My Account → Security → Generate Token
6. Adicionar no GitLab: Settings → CI/CD → Variables → `SONAR_TOKEN` (mascarado)

## Commit Map

| Commit | Arquivo(s) | Mensagem | Estado CI |
|---|---|---|---|
| 1 | `specs/008-code-quality/` | `docs: add specs for code-quality phase (SonarCloud)` | — |
| 2 | `server/package.json` | `ci: add Jest coverage reporting for SonarCloud` | verde |
| 3 | `sonar-project.properties`, `.gitlab-ci.yml` | `ci: add SonarCloud quality gate to pipeline` | **VERDE** (após configurar SONAR_TOKEN e sonar-project.properties) |
| 4 | `ComoRodar.md` | `docs: update ComoRodar.md with code quality section` | verde |
