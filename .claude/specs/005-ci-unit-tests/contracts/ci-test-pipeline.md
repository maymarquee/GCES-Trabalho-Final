# Contract: CI Test Pipeline

**Branch**: `005-ci-unit-tests` | **Date**: 2026-06-09

## Job `test:unit`

### Posição no Pipeline

```
stage: test
needs:
  - job: build
    artifacts: true
```

### Script

```yaml
script:
  - cd server && npm test
```

### Garantias

- **Pré-condição**: artifact `server/node_modules/` disponível (produzido pelo job `build`).
- **Sucesso**: todos os testes Jest passam; exit code `0`.
- **Falha**: pelo menos um teste Jest falha; exit code `1`; pipeline marcado como "failed".
- **Dependência de rede**: nenhuma — testes de matchmaking usam porta efêmera (`server.listen(0)`); testes de db usam `jest.mock('pg')`.
- **Dependência de banco de dados**: nenhuma — `db.test.js` simula `pg.Pool` completamente.

## Regras de Estágio

| Estágio | Jobs | Dependência |
|---------|------|-------------|
| `build` | `build` | nenhuma |
| `lint` | `lint:back`, `lint:front` | `build` |
| `test` | `test:unit` | `build` (via artifact) |

## Imagem

`node:18-alpine` (padrão herdado da seção `default` do `.gitlab-ci.yml`).

## Contrato de Interface: `Game.prototype.getPlayerCount`

```
getPlayerCount() → number
  - Retorna o número de jogadores atualmente na partida (0, 1 ou 2).
  - Sem efeitos colaterais.
  - Não recebe parâmetros.
```
