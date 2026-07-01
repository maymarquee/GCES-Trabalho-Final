# Data Model: Containerização DEV

Esta fase não introduz entidades de dados persistidos. A única "entidade" relevante
é a **Configuração do Ambiente**, que existe como variáveis de ambiente em tempo
de execução.

## Entidade: Configuração do Ambiente de Desenvolvimento

**O que representa**: conjunto de parâmetros que controlam como o contêiner de
desenvolvimento é iniciado em uma máquina específica.

| Variável      | Padrão  | Descrição                                            | Rastreado pelo Git? |
|---------------|---------|------------------------------------------------------|---------------------|
| `HOST_PORT`   | `55555` | Porta publicada no host que mapeia para 55555 no container | Não (via `.env`) |

**Onde vive**: arquivo `.env` local (gerado a partir de `.env.example` que é
rastreado). O `.env` é listado no `.gitignore` para não vazar configuração local.

**Regras de validação**: `HOST_PORT` deve ser um número inteiro entre 1024 e 65535.
Se não definido, assume-se 55555.

**Relações**: Nenhuma — sem banco de dados, sem relações entre entidades nesta fase.
