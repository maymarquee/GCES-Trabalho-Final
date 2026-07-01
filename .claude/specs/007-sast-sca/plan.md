# Implementation Plan: Segurança — SAST & SCA

**Branch**: `007-sast-sca` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-sast-sca/spec.md`

## Summary

Adicionar um estágio `security` ao pipeline GitLab CI com dois jobs: `semgrep-sast` (SAST via template oficial do GitLab) e `sca:npm-audit` (SCA via `npm audit`). O template GitLab SAST adiciona o job `semgrep-sast` automaticamente; sobrescrevemos apenas o estágio para `security`. O job `sca:npm-audit` executa `npm audit --audit-level=high` e falha o pipeline em caso de vulnerabilidade alta/crítica.

## Technical Context

**Language/Version**: Node.js 18 LTS; CommonJS.

**CI Platform**: GitLab CI — arquivo `.gitlab-ci.yml` na raiz.
**CI Image**: `node:18-alpine` (herdado do `default`); SAST usa sua própria imagem semgrep.

**SAST Tool**: GitLab SAST template (`Security/SAST.gitlab-ci.yml`) — usa semgrep como analyzer para JavaScript/Node.js. Disponível no GitLab Free tier.

**SCA Tool**: `npm audit` — built-in no npm; verifica o `package-lock.json` contra o banco de dados de vulnerabilidades do npm. Zero dependências adicionais.

**Estado atual de vulnerabilidades**: `npm audit` reporta **0 vulnerabilidades** (info: 0, low: 0, moderate: 0, high: 0, critical: 0) — verificado localmente em 2026-06-09.

## Constitution Check

| Princípio | Status | Justificativa |
|-----------|--------|---------------|
| I — Incremental & Atomic Delivery | ✅ PASS | Commits separados: specs → CI changes → docs. |
| II — Environment Parity via Containers | ✅ PASS | CI usa `node:18-alpine`; SCA usa mesma instalação npm do build. |
| III — Test- & Quality-Gated Changes | ✅ PASS | SCA bloqueia pipeline em vulnerabilidade alta/crítica. |
| IV — Security by Default | ✅ PASS | Esta fase implementa diretamente a camada de segurança do DevSecOps. |
| V — Documentation as a Deliverable | ✅ PASS | ComoRodar.md atualizado com seção de segurança. |

## Project Structure

### Documentation (this feature)

```text
specs/007-sast-sca/
├── plan.md              # Este arquivo
├── spec.md              # Especificação completa
├── research.md          # Decisões: semgrep, npm audit, template GitLab
├── data-model.md        # Estágios do pipeline, artefatos, variáveis
├── quickstart.md        # Como executar verificações de segurança localmente
├── contracts/
│   └── security-contract.md  # Contrato: jobs de segurança, artefatos, garantias
└── checklists/
    └── requirements.md  # Checklist de qualidade
```

### Source Code Changes

```text
/
├── .gitlab-ci.yml                       # ATUALIZADO: include SAST template, stage security, sca:npm-audit
└── ComoRodar.md                         # ATUALIZADO: seção CI — Segurança (SAST & SCA)
```

## Implementation Details

### `.gitlab-ci.yml` — Mudanças

**1. Adicionar `include` para o template SAST:**
```yaml
include:
  - template: Security/SAST.gitlab-ci.yml
```

**2. Adicionar `security` ao array de stages:**
```yaml
stages:
  - build
  - lint
  - test
  - security
```

**3. Sobrescrever `semgrep-sast` para usar estágio correto:**
```yaml
semgrep-sast:
  stage: security
  variables:
    SAST_EXCLUDED_PATHS: "spec, test, tests, tmp, node_modules"
```

**4. Adicionar job `sca:npm-audit`:**
```yaml
sca:npm-audit:
  stage: security
  needs:
    - job: build
      artifacts: true
  script:
    - cd server && npm audit --audit-level=high --json > npm-audit-report.json || (cat npm-audit-report.json && exit 1)
  artifacts:
    when: always
    paths:
      - server/npm-audit-report.json
    expire_in: 1 week
  allow_failure: false
```

### Por que `needs: [build]` no `sca:npm-audit`?

O job `build` produz o artifact `server/node_modules/` e garante que `npm ci` foi executado com sucesso (incluindo a geração do `package-lock.json` validado). O `npm audit` usa o `package-lock.json` para resolução exata de versões, portanto depende do job `build` completar primeiro.

### Por que `semgrep-sast` não precisa de `needs: [build]`?

Semgrep analisa o código-fonte diretamente (arquivos `.js`), sem precisar de `node_modules` ou build compilado. Pode rodar em paralelo com os jobs de `test` e `lint` sem dependência de artifact.

## Commit Map

| Commit | Arquivo(s) | Mensagem | Estado CI |
|--------|-----------|----------|-----------|
| 1 | `specs/007-sast-sca/` | `docs: add specs and planning docs for sast-sca phase` | — |
| 2 | `.gitlab-ci.yml` | `ci: add SAST and SCA security scanning to pipeline` | **VERDE** |
| 3 | `ComoRodar.md` | `docs: update ComoRodar.md with security scanning section` | verde |
