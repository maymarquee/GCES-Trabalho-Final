# Data Model: Qualidade de Código — SonarCloud

**Phase**: 008-code-quality | **Date**: 2026-06-09

## Pipeline Stages

```
build → lint → test → security → quality
                                    └── sonarcloud
```

## Artefatos produzidos

| Job produtor | Artefato | Consumidor | Formato |
|---|---|---|---|
| `test:unit` | `server/coverage/lcov.info` | `sonarcloud` | LCOV |
| `test:unit` | `server/coverage/coverage-summary.json` | GitLab MR widget | JSON |
| `sonarcloud` | (nenhum artefato local) | sonarcloud.io | API upload |

## Variáveis de CI/CD necessárias

| Variável | Tipo | Onde configurar | Obrigatória |
|---|---|---|---|
| `SONAR_TOKEN` | Secret / Mascarada | GitLab → Settings → CI/CD → Variables | Sim |

## Arquivos de configuração

| Arquivo | Propósito |
|---|---|
| `sonar-project.properties` | Configuração do sonar-scanner: project key, org, sources, coverage path |
| `server/package.json` (seção `jest`) | Configura reporters LCOV e `collectCoverageFrom` |

## Propriedades `sonar-project.properties`

| Propriedade | Valor | Descrição |
|---|---|---|
| `sonar.projectKey` | `<definido pelo usuário>` | Identificador único do projeto no SonarCloud |
| `sonar.organization` | `<definido pelo usuário>` | Organização no SonarCloud |
| `sonar.sources` | `server,game/src` | Diretórios de código-fonte a analisar |
| `sonar.tests` | `server/test` | Diretório de testes (excluído das métricas de produção) |
| `sonar.test.inclusions` | `server/test/**/*.test.js` | Padrão de arquivos de teste |
| `sonar.javascript.lcov.reportPaths` | `server/coverage/lcov.info` | Caminho para o relatório de cobertura LCOV |
| `sonar.exclusions` | `server/node_modules/**,game/images/**,game/styles/**` | Padrões excluídos da análise |
| `sonar.sourceEncoding` | `UTF-8` | Encoding dos arquivos-fonte |

## Quality Gate "Sonar way" (padrão)

Condições aplicadas a **novo código** (commits após a baseline):

| Métrica | Condição |
|---|---|
| Coverage | ≥ 80% |
| Duplicated Lines | ≤ 3% |
| Maintainability Rating | ≥ A |
| Reliability Rating | ≥ A |
| Security Rating | ≥ A |
| Security Hotspots Reviewed | = 100% |
