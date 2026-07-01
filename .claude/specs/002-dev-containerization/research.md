# Research: Containerização DEV com Hot-Reload

## Decisão 1 — Imagem base

**Decision**: `node:18-slim`

**Rationale**: Menor que a `node:18` completa (~230 MB vs ~350 MB) mas preserva
`bash`, `wget` e outras ferramentas úteis para debug em desenvolvimento. A variante
`alpine` (< 60 MB) é preferível para produção (Fase 8), mas pode causar problemas
com dependências nativas de npm por falta de `glibc`; `slim` elimina esse risco
em dev sem custo relevante de tamanho.

**Alternatives considered**:
- `node:18` — funciona, mas maior sem benefício extra em dev
- `node:18-alpine` — ideal para prod (Fase 8); evitado em dev por possíveis
  incompatibilidades com binários nativos e depuração mais difícil

---

## Decisão 2 — Hot-reload do back-end: nodemon

**Decision**: Adicionar `nodemon` como devDependency em `server/package.json` e
usá-lo como entrypoint do contêiner em vez de `node server.js`.

**Rationale**: `nodemon` é a solução idiomática para reinício automático de
processos Node.js ao detectar mudanças em arquivos. Já é compatível com o projeto
(Express/Socket.io) sem configuração extra. A flag `--legacy-watch` pode ser
necessária dentro de contêineres que não recebem eventos `inotify` do host
(ex.: Docker Desktop no Windows/macOS via bind mount); uma flag de opção ou
`nodemon.json` documenta isso.

**Alternatives considered**:
- `node --watch server.js` (Node.js 18+ built-in) — sem dependência extra, mas
  o suporte a watch ainda era experimental no Node 18; nodemon é mais maduro e
  amplamente documentado

---

## Decisão 3 — Hot-reload do front-end: volume bind mount

**Decision**: Montar `game/` como volume bind mount (`-v $(pwd)/game:/app/game`).
Como o Express já serve `game/` como diretório estático sem cache de arquivos
em memória, qualquer alteração salva no host é imediatamente disponível ao
recarregar a página no navegador, sem necessidade de reiniciar o servidor.

**Rationale**: Nenhuma ferramenta adicional (live-reload, HMR) é necessária; o
fluxo "editar → salvar → F5" é suficiente e já é o comportamento esperado segundo
a spec (Assumption: hot-reload de front-end = arquivo disponível ao recarregar).

**Alternatives considered**:
- Browser-sync / webpack-dev-server — overhead de configuração desnecessário para
  arquivos estáticos puros sem etapa de build

---

## Decisão 4 — Instalação de dependências: npm ci dentro do contêiner

**Decision**: O `Dockerfile` executa `npm ci` durante o build da imagem para
instalar dependências em `server/node_modules` dentro do contêiner. O
`server/node_modules` do host é excluído via `.dockerignore` e sobreposto por
um volume anônimo para isolar as dependências do container das do host.

**Rationale**: Garante que as dependências dentro do contêiner são sempre
instaladas limpo a partir do lockfile, independentemente do estado de
`node_modules` no host. O volume anônimo para `node_modules` é um padrão
estabelecido para evitar que o bind mount de `server/` sobrescreva o
`node_modules` instalado na imagem.

**Alternatives considered**:
- Montar `node_modules` do host — arriscado: divergências de plataforma entre
  Windows/macOS e Linux dentro do contêiner causam erros em módulos com binários
  nativos

---

## Decisão 5 — Porta e configuração local: variável de ambiente + .env.example

**Decision**: A porta exposta no host é controlada pela variável `HOST_PORT`
(padrão 55555), definida em um arquivo `.env` local (não rastreado) baseado em
`.env.example` (rastreado). O `docker run` usa `--env-file .env` ou `-p` com a
variável; o docker-compose (Fase 2) consumirá `.env` automaticamente.

**Rationale**: Atende FR-006 (porta configurável sem editar arquivos rastreados)
e prepara o terreno para a Fase 2 onde o docker-compose lerá o mesmo `.env`.

**Alternatives considered**:
- Porta hardcoded no comando documentado — mais simples, mas não atende FR-006 e
  dificulta futuros conflitos de porta

---

## Decisão 6 — Estrutura do comando de inicialização

**Decision**: Documentar o comando canônico de subida como:

```sh
docker build -t mkjs-dev .
docker run --rm -it \
  -p ${HOST_PORT:-55555}:55555 \
  -v "$(pwd)/server:/app/server" \
  -v "$(pwd)/game:/app/game" \
  -v mkjs-dev-modules:/app/server/node_modules \
  --name mkjs-dev \
  mkjs-dev
```

Um `Makefile` com alvo `dev` pode ser adicionado como conveniência, mas não é
obrigatório para a entrega desta fase.

**Alternatives considered**:
- `docker-compose.yml` já nesta fase — seria antecipar a Fase 2; mantido fora
  do escopo para respeitar a entrega incremental exigida pela constituição
