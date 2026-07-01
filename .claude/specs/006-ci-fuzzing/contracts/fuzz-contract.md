# Contract: CI Fuzz Pipeline

**Branch**: `006-ci-fuzzing` | **Date**: 2026-06-09

## Job `test:fuzz`

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
  - cd server && npm run test:fuzz
```

### Garantias

- **Pré-condição**: artifact `server/node_modules/` disponível (produzido pelo job `build`), incluindo `fast-check`.
- **Sucesso**: todas as propriedades fast-check passam; exit code `0`.
- **Falha**: pelo menos uma propriedade ou asserção falha; exit code `1`; pipeline marcado como "failed".
- **Dependência de rede**: nenhuma — todos os fuzz tests são unitários (chamadas diretas a `GameCollection`/`Game`).
- **Dependência de banco de dados**: nenhuma.
- **Tempo máximo**: menos de 30 segundos (todos os `fc.assert` com 300 runs são chamadas síncronas).

## Regras de Estágio

| Estágio | Jobs | Dependência |
|---------|------|-------------|
| `build` | `build` | nenhuma |
| `lint` | `lint:back`, `lint:front` | `build` |
| `test` | `test:unit`, `test:fuzz` | `build` (via artifact) |

## Imagem

`node:18-alpine` (padrão herdado da seção `default` do `.gitlab-ci.yml`).

## Contrato de Interface: `GameCollection.createGame` (após fix)

```
createGame(id) → boolean
  - Retorna false se id não for string ou for string vazia.
  - Retorna false se já existe um jogo com o mesmo id.
  - Retorna true e cria o jogo se id é string não-vazia e não existe ainda.
  - Sem efeitos colaterais quando retorna false por validação de tipo.
```

## npm Script `test:fuzz`

```json
"test:fuzz": "jest test/server.fuzz.test.js"
```

Executa apenas `server/test/server.fuzz.test.js`. Não interfere com `npm test` (que continua executando todos os arquivos `.test.js`).
