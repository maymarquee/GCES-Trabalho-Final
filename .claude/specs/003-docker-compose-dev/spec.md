# Feature Specification: Docker Compose DEV com Persistência em Postgres

**Feature Branch**: `003-docker-compose-dev`

**Created**: 2026-06-08

**Status**: Draft

**Input**: User description: "Fase 2 do projeto GCES (Docker Compose DEV): configurar um docker-compose.yml que integre a aplicação mk.js e um banco de dados Postgres. Implementar uma camada simples de persistência no servidor Node.js/Express (ex: salvar histórico de lutas ou nomes de jogadores no banco). O ambiente de desenvolvimento deve continuar com hot-reload (nodemon) e os arquivos server/ e game/ montados como volumes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Subir o ambiente completo com um único comando (Priority: P1)

Um(a) desenvolvedor(a) que acabou de clonar o repositório quer subir o ambiente de desenvolvimento completo — jogo + banco de dados — com um único comando, sem precisar instalar Node.js, PostgreSQL ou qualquer dependência no host. O banco sobe automaticamente junto com a aplicação e fica pronto para receber dados.

**Why this priority**: É o requisito mínimo da fase e pré-requisito para tudo o mais: sem o ambiente composto subindo com um comando, não há como validar hot-reload, persistência ou qualquer outro critério.

**Independent Test**: Pode ser totalmente testado clonando o repositório em uma máquina sem Node.js e PostgreSQL instalados, executando `docker compose up`, e verificando que o jogo carrega em `http://localhost:55555` no navegador e que o banco de dados está acessível (ex.: aceita conexão via cliente).

**Acceptance Scenarios**:

1. **Given** o repositório recém-clonado com Docker instalado, **When** o(a) desenvolvedor(a) executa o comando documentado para subir o ambiente, **Then** a aplicação e o banco de dados iniciam sem erros e o jogo fica acessível no navegador.
2. **Given** o ambiente já em execução, **When** o(a) desenvolvedor(a) para e sobe novamente, **Then** o sistema volta ao estado funcional sem passos manuais extras e os dados persistidos anteriormente estão disponíveis.
3. **Given** o banco de dados ainda não foi inicializado, **When** o ambiente sobe pela primeira vez, **Then** as tabelas necessárias são criadas automaticamente, sem intervenção manual.

---

### User Story 2 - Registro automático de partidas no banco de dados (Priority: P2)

Quando dois jogadores finalizam uma partida, o sistema registra automaticamente os dados relevantes (ex.: nomes dos jogadores, resultado, data/hora) no banco de dados, sem que os jogadores ou o(a) desenvolvedor(a) precisem tomar nenhuma ação adicional.

**Why this priority**: É a entrega de valor central desta fase: demonstrar que a aplicação persiste dados em Postgres. Sem isso, o Compose com banco é apenas infraestrutura sem propósito funcional.

**Independent Test**: Pode ser testado iniciando uma partida em rede (duas abas no navegador com o mesmo nome de partida), deixando a partida terminar, e consultando diretamente o banco de dados para verificar que um novo registro foi inserido com os dados esperados (nomes dos jogadores, data/hora, resultado).

**Acceptance Scenarios**:

1. **Given** o ambiente em execução e uma partida em rede concluída, **When** se consulta o histórico no banco de dados, **Then** um registro da partida aparece com dados de jogadores e data/hora corretos.
2. **Given** múltiplas partidas realizadas em sequência, **When** se consulta o banco, **Then** todas as partidas aparecem em ordem cronológica no histórico.

---

### User Story 3 - Hot-reload preservado no ambiente composto (Priority: P3)

O(a) desenvolvedor(a) edita arquivos em `server/` ou `game/` enquanto o ambiente está rodando via `docker compose up` e espera que as mudanças sejam refletidas imediatamente, sem reconstruir imagens ou reiniciar manualmente os serviços.

**Why this priority**: O hot-reload foi entregue na fase anterior e não deve regredir. A fase atual acrescenta o banco de dados ao ambiente, mas o fluxo de desenvolvimento (editar → ver resultado imediatamente) deve permanecer igual.

**Independent Test**: Com `docker compose up` em execução, editar `server/server.js` e salvar. Verificar nos logs que o nodemon detecta a mudança e reinicia o processo em ≤ 3 s, sem nenhum comando adicional.

**Acceptance Scenarios**:

1. **Given** o ambiente rodando via `docker compose up`, **When** o(a) desenvolvedor(a) edita e salva um arquivo em `server/`, **Then** o servidor reinicia automaticamente dentro do container e aplica o novo código.
2. **Given** o ambiente em execução, **When** o(a) desenvolvedor(a) edita e salva um arquivo em `game/`, **Then** o conteúdo atualizado é servido ao recarregar a página no navegador.

---

### User Story 4 - Visualizar histórico de partidas (Priority: P4)

Um(a) desenvolvedor(a) ou avaliador(a) quer confirmar que a persistência está funcionando sem precisar de um cliente de banco externo. A aplicação expõe uma rota de consulta simples que retorna o histórico de partidas em formato legível.

**Why this priority**: Facilita a validação da persistência durante o desenvolvimento e demonstra claramente a integração back-end → banco de dados sem exigir ferramentas externas. É conveniente mas não essencial para o critério de persistência (que pode ser validado diretamente no banco).

**Independent Test**: Pode ser testado com uma requisição HTTP para a rota documentada (ex.: `GET /api/matches`) e verificando que a resposta inclui as partidas registradas.

**Acceptance Scenarios**:

1. **Given** o ambiente em execução e ao menos uma partida registrada, **When** o(a) desenvolvedor(a) acessa a rota de histórico via HTTP, **Then** recebe uma lista com os dados das partidas em formato estruturado.

---

### Edge Cases

- O que acontece se o banco de dados demorar para inicializar quando a aplicação sobe? A aplicação deve aguardar o banco estar pronto antes de tentar conectar (health check ou retry).
- O que acontece se a conexão com o banco cair enquanto uma partida está em andamento? O servidor deve continuar funcionando normalmente para a partida em curso e tentar reconectar para partidas futuras.
- O que acontece se o volume do banco for apagado? O sistema deve recriar as tabelas automaticamente na próxima inicialização.
- O que acontece se a porta padrão do Postgres (5432) já estiver em uso no host? O mapeamento de porta do banco deve ser configurável ou estar documentado como opcional.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O ambiente completo (aplicação + banco de dados) DEVE ser iniciado por meio de um único comando documentado, sem exigir Node.js, PostgreSQL ou outras dependências no host além de Docker.
- **FR-002**: O banco de dados PostgreSQL DEVE ser iniciado como serviço separado no Compose e a aplicação DEVE aguardar o banco estar pronto antes de conectar (dependência com health check).
- **FR-003**: As tabelas necessárias para persistência DEVEM ser criadas automaticamente na primeira inicialização, sem intervenção manual do(a) desenvolvedor(a).
- **FR-004**: O servidor Node.js DEVE registrar no banco os dados de cada partida finalizada (no mínimo: nomes dos dois jogadores, resultado/vencedor, data e hora).
- **FR-005**: O servidor DEVE expor uma rota HTTP para consulta do histórico de partidas registrados (ex.: `GET /api/matches`), retornando os dados em formato JSON.
- **FR-006**: O ambiente DEVE preservar o hot-reload do back-end (nodemon): alterações em `server/` DEVEM provocar reinício automático do processo Node.js sem rebuild.
- **FR-007**: Os diretórios `server/` e `game/` DEVEM ser montados como volumes no serviço da aplicação, de forma que edições no host sejam refletidas imediatamente dentro do container.
- **FR-008**: Os dados do PostgreSQL DEVEM ser persistidos em um volume Docker nomeado, de forma que parar e reiniciar o ambiente preserve o histórico de partidas.
- **FR-009**: Credenciais e parâmetros de conexão do banco (usuário, senha, nome do banco, host) DEVEM ser configuráveis via variáveis de ambiente, com valores padrão documentados para desenvolvimento.
- **FR-010**: A documentação (`ComoRodar.md`) DEVE ser atualizada com o passo a passo para subir, parar e reconstruir o ambiente com Compose, incluindo como resetar o banco de dados se necessário.

### Key Entities

- **Partida (Match)**: Representa uma partida finalizada entre dois jogadores. Atributos: identificador único, nome do jogador 1, nome do jogador 2, vencedor, data e hora de criação.
- **Configuração do Compose**: Conjunto de variáveis de ambiente e parâmetros de conexão que configuram o Postgres e a string de conexão da aplicação. Separados do código-fonte por variáveis de ambiente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O ambiente completo (aplicação + banco) sobe em resposta a um único comando documentado; `http://localhost:55555` carrega o jogo e o banco aceita conexão, tudo em menos de 60 segundos após o comando.
- **SC-002**: 100% dos fluxos documentados em `ComoRodar.md` (modos Basic, Multiplayer e Network) continuam funcionando de forma idêntica após a adição do Compose, sem regressões observáveis.
- **SC-003**: Após uma partida finalizada, o registro correspondente aparece no banco de dados em no máximo 5 segundos após o término da partida, verificável diretamente ou via a rota de histórico.
- **SC-004**: Após parar (`docker compose down`) e reiniciar (`docker compose up`) o ambiente, todos os registros de partidas inseridos anteriormente permanecem disponíveis no banco de dados.
- **SC-005**: Uma alteração em `server/server.js` é aplicada automaticamente (reinício do nodemon) em ≤ 3 segundos após salvar o arquivo, sem nenhum comando adicional.

## Assumptions

- Pressupõe-se que o(a) desenvolvedor(a) tem Docker (Engine/Desktop) com suporte a Compose v2 instalado — esse é o único pré-requisito além de um navegador.
- A camada de persistência é intencionalmente simples: apenas histórico de partidas (sem autenticação, perfis de usuário ou ranking elaborado), suficiente para demonstrar a integração com Postgres.
- O driver de conexão ao PostgreSQL usado no servidor será `pg` (node-postgres), padrão de mercado para Node.js.
- A criação das tabelas no banco será feita via script de inicialização SQL executado automaticamente pelo Postgres na primeira subida (pasta `docker-entrypoint-initdb.d`), sem sistema de migrations mais elaborado — isso está fora do escopo desta fase.
- O evento que dispara o registro da partida é o encerramento da sessão de jogo no relay do servidor (desconexão de socket ou evento de fim de partida), que já existe na lógica de `server/games.js`.
- A porta padrão do serviço da aplicação continua sendo `55555` e a do Postgres no host será `5432` (configurável via variável de ambiente para evitar conflito com instâncias locais).
- Este ambiente destina-se exclusivamente a desenvolvimento; a containerização de produção com multi-stage build, Alpine e Nginx é tratada na Fase 8, fora do escopo desta especificação.
