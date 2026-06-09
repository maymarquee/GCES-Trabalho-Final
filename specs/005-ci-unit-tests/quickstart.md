# Quickstart: CI — Testes Unitários

**Branch**: `005-ci-unit-tests` | **Date**: 2026-06-09

## Executar testes localmente

```bash
cd server
npm test
```

Resultado esperado: todos os testes passam, zero falhas.

## Executar um único arquivo de teste

```bash
cd server
npx jest test/games.unit.test.js
```

## Ver cobertura de código (informativo, não obrigatório nesta fase)

```bash
cd server
npx jest --coverage
```

## Verificar no GitLab

1. Fazer push para qualquer branch.
2. Acessar `CI/CD → Pipelines` no repositório GitLab.
3. O pipeline deve ter 4 jobs: `build`, `lint:back`, `lint:front`, `test:unit`.
4. Clicar em `test:unit` para ver o log do Jest.

## Reproduzir o ciclo RED → GREEN

Para ver o histórico do ciclo red/green no git:

```bash
# Ver o commit que introduziu o teste falhando
git log --oneline | grep "test: add failing"

# Ver o commit que implementou a correção
git log --oneline | grep "feat(games)"
```
