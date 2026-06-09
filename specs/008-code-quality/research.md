# Research: Qualidade de Código — SonarCloud

**Phase**: 008-code-quality | **Date**: 2026-06-09

## Decisão 1: SonarCloud como ferramenta de qualidade

**Escolha**: SonarCloud (sonarcloud.io)

**Alternativas consideradas**:
- SonarQube self-hosted — exige servidor próprio; inviável para CI simples neste projeto.
- CodeClimate — similar ao SonarCloud mas menor adoção e menor cobertura de regras JS.
- ESLint + Istanbul standalone — já usados (lint e cobertura), mas sem dashboard centralizado, Quality Gate ou histórico de trends.

**Razão da escolha**: SonarCloud é o requisito explícito da Fase 7 (README). É gratuito para projetos públicos, tem integração nativa com GitLab CI, e oferece Quality Gate configurável com feedback inline em MRs.

## Decisão 2: Imagem `sonarsource/sonar-scanner-cli` no CI

**Escolha**: `sonarsource/sonar-scanner-cli:latest`

**Alternativas**:
- Instalar sonar-scanner como npm package — não existe; o scanner é Java.
- Baixar e instalar sonar-scanner manualmente no job — mais frágil e lento.
- Usar action/plugin específico do GitLab — não há plugin oficial; a imagem Docker é a forma recomendada.

**Razão**: Imagem oficial da SonarSource; contém Java + sonar-scanner pré-instalados. Zero configuração extra no job.

## Decisão 3: `GIT_DEPTH: "0"` no job sonarcloud

**Escolha**: Clonar histórico completo do repositório no job sonarcloud.

**Razão**: O SonarCloud usa o histórico git para:
1. Calcular métricas de "new code" vs. código existente (baseado em data ou commit).
2. Atribuir blame correto para issues.
3. Detectar duplicações cross-branch.
Com `GIT_DEPTH: 1` (padrão do GitLab CI), o SonarCloud não consegue diferenciar código novo de código antigo, invalidando o Quality Gate em novo código.

## Decisão 4: `sonar.qualitygate.wait=true`

**Escolha**: Aguardar resultado assíncrono do Quality Gate antes de terminar o job.

**Razão**: O sonar-scanner envia a análise e retorna imediatamente; o Quality Gate é processado de forma assíncrona no servidor. Sem `qualitygate.wait=true`, o job sempre passa (exit code 0) independente do resultado — o Quality Gate se torna decorativo. Com `wait=true`, o scanner faz polling até o resultado estar disponível e falha o job se o gate não passar.

**Trade-off**: Adiciona ~30-60 segundos ao tempo do job enquanto aguarda o processamento no servidor SonarCloud.

## Decisão 5: Relatório LCOV para cobertura

**Escolha**: Gerar `lcov.info` via Jest (`--coverage --coverageReporters lcov`) e apontar `sonar.javascript.lcov.reportPaths` para ele.

**Razão**: LCOV é o formato de cobertura mais amplamente suportado em análises de código JS/Node. O SonarCloud lê LCOV nativamente para calcular métricas de cobertura por linha, branch e statement. Outros formatos (Cobertura XML, Istanbul JSON) também são suportados, mas LCOV é o mais simples de gerar com Jest.

## Decisão 6: `collectCoverageFrom` no Jest

**Escolha**: Cobrir todos os `.js` na raiz de `server/` (não apenas arquivos testados).

**Razão**: Se Jest calcular cobertura apenas nos arquivos importados nos testes, arquivos sem nenhum teste (ex: `server.js` sem testes unitários diretos) ficam invisíveis — SonarCloud mostraria 100% de cobertura artificialmente. Com `collectCoverageFrom: ["*.js"]`, arquivos sem cobertura aparecem como 0%, dando uma visão honesta do estado atual.
