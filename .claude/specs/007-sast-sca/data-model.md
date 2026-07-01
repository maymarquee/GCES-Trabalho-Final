# Data Model: Segurança — SAST & SCA

**Branch**: `007-sast-sca` | **Date**: 2026-06-09

## Pipeline Stages

```
build → lint → test → security
                       ├── semgrep-sast   (allow_failure: true)
                       └── sca:npm-audit  (allow_failure: false)
```

## Jobs

### `semgrep-sast` (gerado pelo template GitLab SAST)

| Campo | Valor |
|-------|-------|
| Stage | `security` |
| Image | `registry.gitlab.com/security-products/semgrep:latest` (gerenciada pelo template) |
| Allow failure | `true` |
| Artifact | `gl-sast-report.json` |
| Expire in | 1 week (padrão do template) |
| Needs | — (analisa código-fonte diretamente) |

**Variáveis de configuração:**

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `SAST_EXCLUDED_PATHS` | `spec, test, tests, tmp, node_modules` | Diretórios excluídos da análise |

### `sca:npm-audit`

| Campo | Valor |
|-------|-------|
| Stage | `security` |
| Image | `node:18-alpine` (herdada do `default`) |
| Allow failure | `false` |
| Artifact | `server/npm-audit-report.json` |
| Expire in | 1 week |
| Needs | `build` (artifact `server/node_modules/`) |

**Script:**
```bash
cd server && npm audit --audit-level=high --json > npm-audit-report.json || (cat npm-audit-report.json && exit 1)
```

## Artefatos

### `gl-sast-report.json`

Formato padrão GitLab SAST. Estrutura relevante:

```json
{
  "version": "15.0.4",
  "vulnerabilities": [
    {
      "id": "...",
      "name": "...",
      "description": "...",
      "severity": "Medium|High|Critical|Low|Info|Unknown",
      "location": {
        "file": "server/server.js",
        "start_line": 42
      },
      "identifiers": [
        { "type": "semgrep_id", "name": "...", "value": "..." }
      ]
    }
  ],
  "scan": {
    "type": "sast",
    "scanner": { "id": "semgrep", "name": "Semgrep" },
    "start_time": "...",
    "end_time": "...",
    "status": "success"
  }
}
```

### `npm-audit-report.json`

Formato JSON do `npm audit --json`. Estrutura relevante:

```json
{
  "auditReportVersion": 2,
  "vulnerabilities": {},
  "metadata": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 0,
      "high": 0,
      "critical": 0,
      "total": 0
    },
    "dependencies": {
      "prod": 104,
      "dev": 366,
      "total": 470
    }
  }
}
```

## Pipeline Completo (estágios e jobs)

| Estágio | Job | Depends On | Allow Failure |
|---------|-----|-----------|---------------|
| `build` | `build` | — | false |
| `lint` | `lint:back` | `build` | false |
| `lint` | `lint:front` | `build` | false |
| `test` | `test:unit` | `build` | false |
| `test` | `test:fuzz` | `build` | false |
| `security` | `semgrep-sast` | — | **true** |
| `security` | `sca:npm-audit` | `build` | **false** |

## Exit Codes

| Job | Condição | Exit Code | Efeito no Pipeline |
|-----|----------|-----------|-------------------|
| `sca:npm-audit` | 0 vulnerabilidades high/critical | `0` | Passa |
| `sca:npm-audit` | ≥1 vulnerabilidade high/critical | `1` | Falha (bloqueia) |
| `semgrep-sast` | Análise completa (com ou sem achados) | `0` | Passa (allow_failure) |
| `semgrep-sast` | Erro de execução do analyzer | `1` | Aviso (allow_failure) |
