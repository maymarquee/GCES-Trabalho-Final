# Quickstart: CI Build & Lint — Validação End-to-End

**Feature**: `004-ci-build-lint` | **Date**: 2026-06-09

---

## Pré-requisitos

- Node.js 18+ instalado localmente (para validação local).
- Acesso ao repositório no GitLab com permissão de push.
- Runner GitLab CI disponível (shared runners do GitLab.com ou runner self-hosted).

---

## Setup Inicial (verificação local)

```bash
# 1. Instalar dependências (incluindo ESLint)
cd server && npm install

# 2. Executar lint completo localmente
npm run lint
```

Esperado: saída do ESLint sem erros (pode haver avisos `warn`).

---

## Cenário 1 — Pipeline verde para o código atual (SC-001, SC-003)

1. Fazer push da branch `004-ci-build-lint` para o GitLab.
2. Acessar **CI/CD → Pipelines** no GitLab.
3. **Esperado**: Pipeline criado automaticamente com 3 jobs: `build`, `lint:back`, `lint:front`.
4. Aguardar conclusão.
5. **Esperado**: Todos os jobs com status `passed`. Pipeline total em < 5 minutos.

---

## Cenário 2 — Lint back-end reprova o pipeline (SC-002)

1. Editar `server/server.js` e adicionar uma linha com variável não declarada:
   ```javascript
   var x = undeclaredVariable;
   ```
2. Fazer push para o GitLab.
3. Acessar o pipeline criado.
4. **Esperado**: Job `lint:back` falha. Job `lint:front` pode passar ou falhar independentemente. Pipeline com status `failed`.
5. Logs do job `lint:back` devem mostrar algo como:
   ```
   server/server.js
     X:1  error  'undeclaredVariable' is not defined  no-undef
   ✖ 1 problem (1 error, 0 warnings)
   ```
6. Reverter a alteração e fazer push novamente — pipeline deve voltar a `passed`.

---

## Cenário 3 — Lint local identifica o mesmo erro (SC-004)

1. Com a alteração do Cenário 2 ainda aplicada localmente:
   ```bash
   cd server && npm run lint:back
   ```
2. **Esperado**: ESLint reporta o mesmo erro que o CI reportaria.
3. O processo termina com código de saída não-zero (`echo $?` retorna `1`).
4. Reverter a alteração e executar novamente — `npm run lint:back` deve retornar `0`.

---

## Cenário 4 — Lint front-end passa para código legado (SC-005)

```bash
cd server && npm run lint:front
```

**Esperado**: ESLint completa sem erros. Podem aparecer avisos (`warn`) — isso é esperado
para o código legado. O processo termina com código de saída `0`.

---

## Cenário 5 — Erro de sintaxe no front-end reprova o pipeline

1. Adicionar uma linha de sintaxe inválida em `game/src/mk.js`:
   ```javascript
   var broken = {;
   ```
2. Executar localmente:
   ```bash
   cd server && npm run lint:front
   ```
3. **Esperado**: ESLint reporta erro de parsing. Processo termina com código `1`.
4. Fazer push → pipeline falha no job `lint:front`.
5. Reverter a alteração.

---

## Referências

- Config back-end: `server/.eslintrc.json`
- Config front-end: `game/.eslintrc.json`
- Pipeline: `.gitlab-ci.yml`
- Contrato do pipeline: `specs/004-ci-build-lint/contracts/pipeline.md`
