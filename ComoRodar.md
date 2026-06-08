# Como Rodar o Projeto

Este é um jogo de luta simples criado com HTML5 canvas e JavaScript. Ele possui três modos de jogo:
* `Básico` - com um jogador ativo e um inativo.
* `Multijogador` - com dois jogadores ativos em um computador.
* `Rede` - com dois jogadores ativos, jogando pela rede.

### Execução Local (Modo Básico/Multijogador)

Para rodar o jogo localmente, basta abrir o arquivo `game/index.html` em qualquer navegador moderno.

### Execução em Rede (Servidor Node.js)

Pré-requisito: Node.js **18 ou superior** (o servidor usa Express 4.x e
Socket.io 4.x, que exigem essa versão mínima — ver `server/package.json`).

Para o jogo em rede, você precisa iniciar o servidor:

1.  Navegue até a pasta do servidor:
    ```bash
    cd server
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Inicie o servidor:
    ```bash
    node server.js
    ```

O servidor será iniciado na porta `55555`. Abra o navegador em `http://localhost:55555`. Ambos os jogadores devem inserir o mesmo nome de jogo para se conectarem.

### Ambiente de Desenvolvimento via Docker (recomendado)

Pré-requisito: apenas **Docker** instalado e em execução — Node.js não é necessário no host.

**1. Configuração inicial (uma vez)**

```bash
cp .env.example .env
# Edite .env se precisar mudar a porta padrão (55555)
```

**2. Build da imagem**

```bash
docker build -t mkjs-dev .
```

**3. Subir o servidor com hot-reload**

```bash
# Linux / macOS
docker run --rm -it \
  -p ${HOST_PORT:-55555}:55555 \
  -v "$(pwd)/server:/app/server" \
  -v "$(pwd)/game:/app/game" \
  -v mkjs-dev-modules:/app/server/node_modules \
  --name mkjs-dev \
  mkjs-dev

# Windows PowerShell
docker run --rm -it `
  -p "${env:HOST_PORT:-55555}:55555" `
  -v "${PWD}/server:/app/server" `
  -v "${PWD}/game:/app/game" `
  -v mkjs-dev-modules:/app/server/node_modules `
  --name mkjs-dev `
  mkjs-dev
```

Abra `http://localhost:55555` (ou a porta configurada em `.env`).

**Hot-reload:**
- Editar e salvar qualquer arquivo em `server/` → nodemon reinicia o servidor automaticamente (≤ 3 s)
- Editar e salvar qualquer arquivo em `game/` → recarregar a página no navegador aplica a mudança imediatamente

**Parar o servidor:**
```bash
Ctrl+C          # o flag --rm garante limpeza automática do contêiner
```

**Após alterar dependências em `server/package.json`:**
```bash
docker build -t mkjs-dev .   # reconstrói a camada de npm ci
```

---

# Configuração Técnica

O `mk.js` pode ser configurado através do objeto de opções passado na inicialização:

*   `arena`: Propriedades da arena (container e tipo).
*   `fighters`: Array com os nomes dos dois jogadores.
*   `game-type`: Define o modo (`network`, `basic`, `multiplayer`).
*   `callbacks`: Funções disparadas em eventos como `attack` ou `game-end`.

# Licença

Este software é distribuído sob os termos da licença MIT.
