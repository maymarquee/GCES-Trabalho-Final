# Quickstart: CI — Testes de Fuzzing

**Branch**: `006-ci-fuzzing` | **Date**: 2026-06-09

## Pré-requisito

Node.js 18+ e dependências instaladas:

```bash
cd server
npm install
```

## Executar apenas os fuzz tests

```bash
cd server
npm run test:fuzz
```

Resultado esperado (após GREEN commit): todos os fuzz tests passam, zero falhas.

## Executar todos os testes (unit + fuzz)

```bash
cd server
npm test
```

## Executar um único fuzz test por nome

```bash
cd server
npx jest --testNamePattern="createGame never throws"
```

## Reproduzir o ciclo RED → GREEN

Para ver o histórico do ciclo red/green no git:

```bash
# Ver o commit que introduziu os fuzz tests falhando
git log --oneline | grep "test: add failing fuzz"

# Ver o commit que implementou a correção
git log --oneline | grep "fix(games): validate"
```

## Verificar no GitLab

1. Fazer push para qualquer branch.
2. Acessar `CI/CD → Pipelines` no repositório GitLab.
3. O pipeline deve ter 5 jobs: `build`, `lint:back`, `lint:front`, `test:unit`, `test:fuzz`.
4. Clicar em `test:fuzz` para ver o output do Jest com os resultados das propriedades.

## Interpretar a saída do fast-check

Quando um fuzz test falha, fast-check imprime:

```
Property failed after X tests
{ seed: 123456789, path: "0", endOnFailure: true }
Counterexample: [null]
Shrunk X time(s)
```

- **Counterexample**: o menor valor que causou a falha (fast-check reduz automaticamente)
- **seed**: permite reproduzir o mesmo caso com `fc.assert(..., { seed: 123456789 })`
