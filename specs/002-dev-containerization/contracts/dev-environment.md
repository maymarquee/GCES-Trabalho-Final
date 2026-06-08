# Contract: Ambiente de Desenvolvimento via Docker

## Porta exposta

| Parâmetro   | Valor padrão | Configurável via |
|-------------|-------------|------------------|
| Porta host  | `55555`     | Variável `HOST_PORT` no `.env` local |
| Porta container | `55555` | Hardcoded no `Dockerfile` (EXPOSE) |

O jogo fica acessível em `http://localhost:<HOST_PORT>` após o contêiner subir.

## Volumes montados (bind mounts)

| Volume no host        | Caminho no container | Finalidade |
|-----------------------|----------------------|------------|
| `./server`            | `/app/server`        | Código-fonte do back-end; mudanças trigam hot-reload via nodemon |
| `./game`              | `/app/game`          | Front-end estático; mudanças disponíveis ao recarregar a página |

## Volume anônimo

| Volume            | Caminho no container     | Finalidade |
|-------------------|--------------------------|------------|
| `mkjs-dev-modules`| `/app/server/node_modules` | Dependências instaladas no build da imagem; isoladas do host |

## Variáveis de ambiente aceitas

| Variável    | Padrão  | Obrigatória | Descrição |
|-------------|---------|-------------|-----------|
| `HOST_PORT` | `55555` | Não         | Porta publicada no host |

## Pré-requisitos do host

- Docker Engine ≥ 20.10 ou Docker Desktop equivalente
- Nenhum outro processo usando a porta `HOST_PORT` no momento da inicialização

## Comportamento esperado após `docker run`

1. A imagem instala as dependências de `server/` durante o `docker build` (uma vez)
2. O contêiner sobe e o nodemon inicia `server.js`
3. Logs do servidor aparecem no terminal (`--it` ou `--detach` para rodar em background)
4. `http://localhost:55555` (ou `HOST_PORT`) serve o jogo no navegador
5. Salvar qualquer arquivo em `server/` → nodemon reinicia o processo (≤ 3 s)
6. Salvar qualquer arquivo em `game/` → disponível ao recarregar a página
7. `Ctrl+C` para o contêiner; `--rm` garante limpeza automática

## Fora do escopo deste contrato

- Banco de dados / persistência (Fase 2)
- Orquestração multi-serviço via docker-compose (Fase 2)
- Imagem de produção multi-stage (Fase 8)
