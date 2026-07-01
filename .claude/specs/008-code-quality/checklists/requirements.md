# Requirements Checklist: Qualidade de Código — SonarCloud

**Phase**: 008-code-quality | **Date**: 2026-06-09

## Implementação

- [ ] `sonar-project.properties` criado na raiz com todas as propriedades obrigatórias
- [ ] `server/package.json` tem script `test:coverage` com `jest --coverage`
- [ ] `server/package.json` tem seção `jest` com `coverageReporters: ["lcov", "text-summary"]`
- [ ] `server/package.json` tem `collectCoverageFrom: ["*.js"]`
- [ ] `.gitlab-ci.yml` tem estágio `quality` no array `stages`
- [ ] Job `test:unit` usa `npm run test:coverage` (não `npm test`)
- [ ] Job `test:unit` tem `coverage:` regex para extração de percentual
- [ ] Job `test:unit` exporta `server/coverage/` como artefato
- [ ] Job `sonarcloud` adicionado no estágio `quality`
- [ ] Job `sonarcloud` usa imagem `sonarsource/sonar-scanner-cli:latest`
- [ ] Job `sonarcloud` tem `needs: [test:unit]` com `artifacts: true`
- [ ] Job `sonarcloud` tem `GIT_DEPTH: "0"`
- [ ] Job `sonarcloud` executa com `-Dsonar.qualitygate.wait=true`
- [ ] Job `sonarcloud` tem cache configurado para `.sonar/cache`

## Configuração manual (UI)

- [ ] Conta SonarCloud criada em sonarcloud.io (login com GitLab)
- [ ] Projeto importado do GitLab no SonarCloud
- [ ] `sonar.projectKey` atualizado em `sonar-project.properties` com valor real
- [ ] `sonar.organization` atualizado em `sonar-project.properties` com valor real
- [ ] `SONAR_TOKEN` gerado em sonarcloud.io → My Account → Security
- [ ] `SONAR_TOKEN` adicionado como variável mascarada no GitLab CI/CD Settings

## Validação

- [ ] Pipeline executa job `sonarcloud` sem erro de autenticação
- [ ] Dashboard sonarcloud.io exibe Coverage com valor numérico (não "—")
- [ ] Quality Gate mostra "Passed" para branch `main`
- [ ] Log do job `sonarcloud` contém link para dashboard
- [ ] Artefato `server/coverage/` visível em `CI/CD → Pipelines → Artifacts`
- [ ] `ComoRodar.md` atualizado com seção de Qualidade de Código

## Commits

- [ ] `docs: add specs for code-quality phase (SonarCloud)`
- [ ] `ci: add Jest coverage reporting for SonarCloud`
- [ ] `ci: add SonarCloud quality gate to pipeline`
- [ ] `docs: update ComoRodar.md with code quality section`
