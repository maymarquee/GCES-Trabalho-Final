# Requirements Checklist: Segurança — SAST & SCA

**Branch**: `007-sast-sca` | **Date**: 2026-06-09

## Funcional

- [ ] `.gitlab-ci.yml` inclui `template: Security/SAST.gitlab-ci.yml`
- [ ] Estágio `security` definido após `test` no array de stages
- [ ] Job `semgrep-sast` sobrescrito para usar `stage: security`
- [ ] Variável `SAST_EXCLUDED_PATHS` configurada para excluir `node_modules`, `test`, etc.
- [ ] Job `sca:npm-audit` definido no estágio `security`
- [ ] Job `sca:npm-audit` usa artifact `server/node_modules/` do job `build`
- [ ] Job `sca:npm-audit` executa `npm audit --audit-level=high`
- [ ] Artefato `npm-audit-report.json` gerado com `when: always`
- [ ] Job `semgrep-sast` usa `allow_failure: true`
- [ ] Job `sca:npm-audit` usa `allow_failure: false`

## CI/CD

- [ ] Pipeline passa com 7 jobs no GitLab (build, lint:back, lint:front, test:unit, test:fuzz, semgrep-sast, sca:npm-audit)
- [ ] Job `sca:npm-audit` passa com `found 0 vulnerabilities`
- [ ] Artefato `gl-sast-report.json` gerado pelo job `semgrep-sast`
- [ ] Artefato `npm-audit-report.json` disponível para download no GitLab

## Documentação

- [ ] `ComoRodar.md` atualizado com seção "CI — Segurança (SAST & SCA)"
- [ ] Seção explica como executar `npm audit` localmente
- [ ] Seção explica como visualizar resultados no GitLab
- [ ] Todos os arquivos em `specs/007-sast-sca/` criados e preenchidos

## Qualidade

- [ ] Commits atômicos e espaçados (specs → ci → docs)
- [ ] Nenhum segredo (tokens, senhas) commitado no repositório
- [ ] Nenhuma dependência nova adicionada ao `package.json` (npm audit é built-in)
