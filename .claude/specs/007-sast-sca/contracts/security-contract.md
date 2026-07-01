# Contract: CI Security Pipeline

**Branch**: `007-sast-sca` | **Date**: 2026-06-09

## Job `semgrep-sast`

### Posição no Pipeline

```
stage: security
needs: []  # analisa código-fonte diretamente, sem artifact de build
allow_failure: true
```

### Configuração

```yaml
semgrep-sast:
  stage: security
  variables:
    SAST_EXCLUDED_PATHS: "spec, test, tests, tmp, node_modules"
```

### Garantias

- **Pré-condição**: Código-fonte disponível no workspace (checkout automático do GitLab).
- **Sucesso**: Análise completa sem erro de execução do analyzer; artefato `gl-sast-report.json` gerado.
- **Achados**: Pipeline NÃO falha por causa de vulnerabilidades encontradas (`allow_failure: true`).
- **Falha de infraestrutura**: Se o runner não conseguir puxar a imagem semgrep, o job falha com aviso mas não bloqueia o pipeline.
- **Artefato**: `gl-sast-report.json` no formato GitLab SAST, disponível por 1 semana.

---

## Job `sca:npm-audit`

### Posição no Pipeline

```
stage: security
needs:
  - job: build
    artifacts: true
allow_failure: false
```

### Script

```yaml
script:
  - cd server && npm audit --audit-level=high --json > npm-audit-report.json || (cat npm-audit-report.json && exit 1)
```

### Garantias

- **Pré-condição**: Artifact `server/node_modules/` disponível (produzido pelo job `build`); inclui `package-lock.json` validado.
- **Sucesso**: `npm audit` retorna exit code `0`; nenhuma vulnerabilidade `high` ou `critical` encontrada.
- **Falha**: `npm audit` retorna exit code `1`; pelo menos uma vulnerabilidade `high` ou `critical` encontrada; pipeline marcado como "failed"; relatório JSON impresso nos logs.
- **Artefato**: `server/npm-audit-report.json` gerado em qualquer caso (`when: always`), disponível por 1 semana.
- **Dependência de rede**: Nenhuma — `npm audit` usa o `package-lock.json` e consulta o registry do npm para metadados de vulnerabilidade (pode falhar em ambientes air-gapped, mas GitLab.com shared runners têm acesso).
- **Dependência de banco de dados**: Nenhuma.

---

## Regras de Estágio

| Estágio | Jobs | Dependência |
|---------|------|-------------|
| `build` | `build` | nenhuma |
| `lint` | `lint:back`, `lint:front` | `build` |
| `test` | `test:unit`, `test:fuzz` | `build` (via artifact) |
| `security` | `semgrep-sast`, `sca:npm-audit` | `build` (somente `sca:npm-audit`) |

## Template Include

```yaml
include:
  - template: Security/SAST.gitlab-ci.yml
```

O template é resolvido pelo GitLab no momento da criação do pipeline. Gera automaticamente o job `semgrep-sast` com configuração padrão para JavaScript/Node.js. A sobrescrita local do job apenas altera o `stage` e adiciona `SAST_EXCLUDED_PATHS`.

## Critério de Falha SCA

| Severidade | `--audit-level=high` | Efeito |
|-----------|---------------------|--------|
| `info` | ignorado | — |
| `low` | ignorado | — |
| `moderate` | ignorado | — |
| `high` | **detectado** | pipeline falha |
| `critical` | **detectado** | pipeline falha |
