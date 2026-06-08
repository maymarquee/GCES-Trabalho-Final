# Quickstart: Validação do Ambiente de Desenvolvimento via Docker

## Pré-requisitos

- Docker Engine ≥ 20.10 instalado e em execução
- Repositório clonado (sem Node.js necessário no host)
- Porta 55555 disponível no host (ou definir `HOST_PORT` diferente no `.env`)

## Configuração inicial (uma vez)

```sh
# Copie o arquivo de exemplo de variáveis de ambiente
cp .env.example .env
# Edite .env se quiser mudar a porta (opcional)
```

## Build da imagem

```sh
docker build -t mkjs-dev .
```

Esperado: imagem criada sem erros; `npm ci` instala as dependências de `server/`.

## Subir o ambiente

```sh
docker run --rm -it \
  -p ${HOST_PORT:-55555}:55555 \
  -v "$(pwd)/server:/app/server" \
  -v "$(pwd)/game:/app/game" \
  -v mkjs-dev-modules:/app/server/node_modules \
  --name mkjs-dev \
  mkjs-dev
```

*(No Windows PowerShell, substitua `$(pwd)` por `${PWD}`)*

Esperado nos logs:
- `[nodemon] starting 'node server.js'`
- `listening on *:55555` (ou mensagem equivalente do servidor)

## Cenário 1 — Jogo carrega no navegador

1. Abrir `http://localhost:55555` no navegador
2. **Esperado**: página do jogo carrega (arena + lutadores visíveis)
3. Mudar para "Modo Rede", inserir um nome de partida e clicar em "Criar Jogo"
4. Abrir uma segunda aba em `http://localhost:55555`, mesmo modo/nome, "Entrar no Jogo"
5. **Esperado**: a partida inicia (comportamento idêntico ao documentado em
   `ComoRodar.md` para execução local com `node server.js`)

## Cenário 2 — Hot-reload do back-end

1. Com o contêiner em execução e o jogo aberto no navegador, abrir
   `server/server.js` no editor
2. Adicionar um `console.log('hot-reload test')` em qualquer ponto do startup
3. Salvar o arquivo
4. **Esperado (no terminal do docker run, em ≤ 3 s)**:
   ```
   [nodemon] restarting due to changes...
   [nodemon] starting 'node server.js'
   hot-reload test
   listening on *:55555
   ```
5. Remover o `console.log` e salvar — servidor reinicia novamente sem erros
6. Reverter a alteração

## Cenário 3 — Hot-reload do front-end

1. Abrir `game/index.html` (ou qualquer arquivo em `game/`) no editor
2. Fazer uma alteração visível (ex.: mudar um texto ou cor em `game/styles/`)
3. Salvar o arquivo
4. **Esperado**: recarregar a página no navegador mostra a alteração imediatamente,
   sem reconstrução da imagem ou reinício manual

## Cenário 4 — Porta alternativa

1. No arquivo `.env`, alterar `HOST_PORT=55556`
2. Rodar o `docker run` novamente (parar o anterior primeiro com `docker stop mkjs-dev`)
3. Abrir `http://localhost:55556`
4. **Esperado**: jogo carrega na nova porta; `git status` não mostra arquivos alterados

## Validação de limpeza

```sh
# Parar o contêiner (--rm faz a limpeza automática)
Ctrl+C   # ou: docker stop mkjs-dev

# Subir novamente
docker run ...   # mesmo comando acima

# Esperado: sobe sem erros, sem necessidade de reiniciar o Docker daemon
```

## Referências

- [contracts/dev-environment.md](./contracts/dev-environment.md) — interface completa
- [data-model.md](./data-model.md) — variáveis de ambiente e valores padrão
- `ComoRodar.md` — documentação de usuário final (atualizada nesta fase)
