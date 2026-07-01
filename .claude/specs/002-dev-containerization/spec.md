# Feature Specification: Containerização do Ambiente de Desenvolvimento (Hot-Reload)

**Feature Branch**: `002-dev-containerization`

**Created**: 2026-06-08

**Status**: Draft

**Input**: User description: "Fase 1 do projeto (Containerização DEV): elaborar um Dockerfile para o ambiente de desenvolvimento do mk.js com suporte a hot-reload, de forma que mudanças no código (server/ e game/) sejam refletidas imediatamente no container em execução, permitindo que o desenvolvedor rode a aplicação localmente via Docker sem precisar instalar Node.js no host."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Subir o ambiente de desenvolvimento sem instalar Node.js (Priority: P1)

Um(a) desenvolvedor(a) que acabou de clonar o repositório quer rodar o jogo localmente para testar uma alteração, mas não tem (ou não quer instalar) o Node.js na própria máquina. Em vez disso, ele(a) usa um comando de container para subir o ambiente, que disponibiliza o jogo em uma porta conhecida do navegador, exatamente como acontece hoje rodando `node server.js` manualmente.

**Why this priority**: É o requisito mínimo da fase — sem isso não existe "ambiente de desenvolvimento containerizado". Sem essa capacidade, ninguém consegue se beneficiar das demais histórias.

**Independent Test**: Pode ser totalmente testado clonando o repositório em uma máquina sem Node.js instalado, executando o comando de subida do container e verificando que o jogo carrega em `http://localhost:<porta>` no navegador, com o fluxo de partida em rede funcionando entre duas abas (igual ao comportamento documentado em `ComoRodar.md`).

**Acceptance Scenarios**:

1. **Given** o repositório recém-clonado e Docker instalado na máquina, **When** o(a) desenvolvedor(a) executa o comando documentado para subir o ambiente, **Then** a aplicação fica acessível pelo navegador na porta esperada e o fluxo de "criar/entrar em uma partida" funciona como descrito em `ComoRodar.md`.
2. **Given** o ambiente já está rodando em container, **When** o(a) desenvolvedor(a) para e sobe o container novamente, **Then** a aplicação volta a responder normalmente, sem necessidade de passos manuais extras de instalação.

---

### User Story 2 - Ver alterações de código refletidas sem reconstruir a imagem (Priority: P2)

Durante o desenvolvimento, a pessoa edita arquivos em `server/` (lógica do relay) ou em `game/` (engine do jogo, estilos, assets) na sua máquina, salva o arquivo, e quer ver o efeito imediatamente — recarregando a página no navegador (para o front-end) ou tendo o servidor reiniciado automaticamente (para o back-end) — sem precisar reconstruir a imagem Docker ou reiniciar o container manualmente a cada alteração.

**Why this priority**: É o que diferencia um "container que roda a aplicação" de um verdadeiro "ambiente de desenvolvimento" produtivo. Sem hot-reload, o ciclo editar→testar se torna lento e o container deixa de agregar valor ao fluxo de trabalho diário.

**Independent Test**: Pode ser testado isoladamente alterando uma string visível na interface do jogo (ex.: um texto em `game/`) e um trecho de log no `server/server.js`, salvando os arquivos, e observando — sem rodar nenhum comando de rebuild — que (a) o navegador passa a servir o arquivo atualizado e (b) o processo do servidor reinicia e aplica a mudança.

**Acceptance Scenarios**:

1. **Given** o container de desenvolvimento em execução e o navegador aberto no jogo, **When** o(a) desenvolvedor(a) edita e salva um arquivo dentro de `game/`, **Then** o novo conteúdo é servido ao recarregar a página, sem reconstruir a imagem.
2. **Given** o container de desenvolvimento em execução, **When** o(a) desenvolvedor(a) edita e salva um arquivo dentro de `server/`, **Then** o processo do servidor é reiniciado automaticamente dentro do container e passa a usar o novo código, refletido nas próximas conexões/respostas.

---

### User Story 3 - Configurar o ambiente sem editar arquivos versionados (Priority: P3)

A pessoa quer poder ajustar detalhes do próprio ambiente local (por exemplo, a porta exposta na máquina host) sem precisar alterar arquivos que serão commitados, para evitar conflitos com a configuração padrão usada por outros membros da equipe ou pelo pipeline.

**Why this priority**: Conveniência que reduz atrito e evita commits acidentais de configuração local, mas a fase é entregável e demonstrável mesmo com uma porta fixa documentada — por isso tem prioridade mais baixa.

**Independent Test**: Pode ser testado definindo uma variável de ambiente (ou editando um arquivo de configuração local não versionado) que altera a porta publicada no host, subindo o ambiente e confirmando que a aplicação responde na nova porta configurada, sem qualquer alteração em arquivos rastreados pelo Git.

**Acceptance Scenarios**:

1. **Given** um arquivo de configuração local de exemplo fornecido no repositório, **When** o(a) desenvolvedor(a) faz uma cópia local e altera o valor da porta, **Then** o ambiente sobe usando a nova porta, sem necessidade de editar o `Dockerfile` ou outros arquivos versionados.

---

### Edge Cases

- O que acontece se a porta padrão (55555) já estiver em uso na máquina do(a) desenvolvedor(a)? O ambiente deve permitir reconfigurar a porta publicada sem editar arquivos versionados (ver User Story 3).
- O que acontece se o(a) desenvolvedor(a) instalar/alterar uma dependência (editar `server/package.json`)? O passo a passo documentado deve deixar claro como reconstruir o ambiente para que a nova dependência seja incluída.
- O que acontece se duas pessoas tentarem abrir uma partida em rede usando o ambiente containerizado a partir de máquinas diferentes? O comportamento deve ser equivalente ao já documentado para a execução local com `node server.js` (ambos entram com o mesmo nome de partida).
- O que acontece quando o container é interrompido abruptamente (ex.: fechamento do terminal)? Subir o ambiente novamente deve restaurar o funcionamento sem deixar resíduos que impeçam nova inicialização (ex.: porta presa, processo travado).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O ambiente de desenvolvimento DEVE poder ser iniciado por meio de um único comando documentado, sem exigir que Node.js, npm ou quaisquer dependências do projeto estejam instalados na máquina host.
- **FR-002**: Uma vez iniciado, o ambiente DEVE servir a aplicação (jogo + relay de rede) acessível via navegador em uma porta conhecida e documentada do host, reproduzindo o comportamento descrito em `ComoRodar.md` para a execução local.
- **FR-003**: Alterações salvas em arquivos do diretório `game/` (front-end estático) DEVEM estar disponíveis para o navegador imediatamente após o recarregamento da página, sem reconstrução da imagem ou reinício manual do container.
- **FR-004**: Alterações salvas em arquivos do diretório `server/` (back-end) DEVEM provocar o reinício automático do processo do servidor dentro do container, sem reconstrução da imagem ou reinício manual do container.
- **FR-005**: O processo de build/inicialização do ambiente DEVE instalar as dependências do `server/` automaticamente a partir do `server/package.json`/lockfile, de forma que o(a) desenvolvedor(a) não precise rodar `npm install` manualmente fora do container.
- **FR-006**: A porta publicada no host DEVE ser configurável por meio de um mecanismo que não exija editar arquivos versionados pelo Git (ex.: variável de ambiente carregada de um arquivo local de exemplo não rastreado).
- **FR-007**: A documentação do projeto DEVE descrever, em passo a passo, como subir, parar e reconstruir o ambiente de desenvolvimento, incluindo o que fazer ao adicionar/alterar dependências do servidor.
- **FR-008**: O ambiente containerizado DEVE preservar o comportamento funcional já validado da aplicação (modos Basic/Multiplayer/Network e o protocolo de pareamento de partidas), sem regressões observáveis pelo usuário final do jogo.

### Key Entities

- **Ambiente de Desenvolvimento**: representa a aplicação mk.js (front-end `game/` + relay `server/`) executando dentro de um container, configurável localmente (porta) e com sincronização automática entre o código-fonte no host e o código em execução.
- **Configuração Local**: conjunto de valores que personalizam a execução do ambiente em cada máquina (ex.: porta publicada), mantidos fora do controle de versão para não conflitarem entre desenvolvedores(as).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa que nunca rodou o projeto consegue ter o jogo acessível no navegador em até 5 minutos após clonar o repositório, usando apenas o comando documentado (sem instalar Node.js).
- **SC-002**: Uma alteração de front-end (`game/`) aparece no navegador em até o tempo de um recarregamento de página (sem reconstrução da imagem); uma alteração de back-end (`server/`) é aplicada automaticamente em até alguns segundos após salvar o arquivo, sem comandos manuais adicionais.
- **SC-003**: 100% dos fluxos já documentados em `ComoRodar.md` (incluindo uma partida em rede entre duas abas/máquinas) funcionam de forma idêntica quando executados a partir do ambiente containerizado.
- **SC-004**: A reconfiguração da porta publicada é possível sem gerar nenhuma alteração em arquivo rastreado pelo Git (`git status` permanece limpo após a reconfiguração local).

## Assumptions

- Pressupõe-se que o(a) desenvolvedor(a) tem Docker (Engine/Desktop) instalado e em execução na máquina — esse é o único pré-requisito de ferramentas no host além de um navegador.
- O hot-reload do back-end é entendido como reinício automático do processo Node.js ao detectar mudanças em arquivos sob `server/` (e não troca de código "a quente" sem reinício de processo), já que o servidor mantém pouco estado entre conexões.
- O hot-reload do front-end é entendido como a disponibilização imediata dos arquivos atualizados de `game/` ao navegador (via volume montado), cabendo ao(à) desenvolvedor(a) recarregar a página — não é exigido um mecanismo de live-reload automático do navegador.
- A porta padrão publicada no host permanece `55555`, igual à já documentada em `ComoRodar.md`, podendo ser sobrescrita localmente conforme FR-006.
- Este Dockerfile/ambiente destina-se exclusivamente ao uso em desenvolvimento; a containerização para produção (multi-stage, Alpine, Nginx) é tratada em fase posterior do projeto e está fora do escopo desta especificação.
- O escopo desta fase cobre a definição do ambiente containerizado (Dockerfile e, se necessário, arquivos de apoio como `.dockerignore`/exemplo de variáveis de ambiente) e sua documentação; não inclui orquestração multi-serviço (ex.: banco de dados via docker-compose), que é tratada em fase posterior.
