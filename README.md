# Trabalho Individual - Gerência de Configuração e Evolução de Software (2026-1)

Os conhecimentos de Gerência de Configuração e Evolução de Software (GCES) são fundamentais no ciclo de vida de um produto de software moderno. Este trabalho tem como objetivo exercitar os conceitos de automação, isolamento de ambiente, testes, segurança (DevSecOps) e deploy contínuo.

A aplicação base é o **mk.js**, um jogo de luta implementado com Backend em Node.js/Express e Frontend em HTML5 Canvas/JavaScript. O projeto original é considerado *deprecated* e possui dependências antigas; parte do desafio é modernizar o ambiente para que ele execute com versões estáveis atuais.

## Requisitos do Projeto

O trabalho está dividido em 10 etapas, cada uma valendo **1,0 ponto**. O foco é a implementação técnica aliada à correta documentação e histórico de commits.

### Critérios de Avaliação (10 Fases)

| Fase | Descrição Técnica | Nota por etapa |
|---|---|---|
| 0. **Retirada de Depreciação** | Atualização e compatibilização das dependências do projeto para versões suportadas, correção de APIs depreciadas, eliminação de vulnerabilidades conhecidas e implementação/adequação de testes unitários para garantir a estabilidade e o comportamento esperado após as atualizações. | 0-10% |
| 1. **Containerização (DEV)** | Elaboração de `Dockerfile` para ambiente de desenvolvimento com suporte a hot-reload (mudanças no código refletidas imediatamente no container). | 0-10% |
| 2. **Docker Compose (DEV)** | Configuração de um `docker-compose.yml` que integre a aplicação e um banco de dados **Postgres**. Você deve implementar uma camada simples de persistência no código (ex: salvar histórico de lutas ou nomes de jogadores). | 10% - 20% |
| 3. **CI - Build & Lint** | Automação das etapas de Build e Lint (Front e Back) via GitHub Actions. O pipeline deve falhar se o lint encontrar erros. | 20% - 30% |
| 4. **CI - Testes Unitários** | Implementação de testes unitários funcionais. **Obrigatório:** Commits sequenciais demonstrando o teste quebrando no CI e, em seguida, passando após correção. | 30% - 40% |
| 5. **CI - Testes de Fuzzing** | Implementação de testes de Fuzzing para validar a resiliência das entradas do servidor (Back-end) contra dados inesperados. | 40% - 50% |
| 6. **Segurança - SAST & SCA** | Integração de ferramentas de análise estática de segurança (SAST) e verificação de vulnerabilidades em dependências (SCA - ex: Snyk ou npm audit). | 50% - 60% |
| 7. **Qualidade de Código** | Integração completa com o **SonarCloud** no pipeline de CI, garantindo métricas de qualidade e cobertura mínima. | 60% - 70% |
| 8. **Containerização (PROD)** | Elaboração de `Dockerfiles` otimizados para produção (multi-stage build, baseados em Alpine) e configuração do **Nginx** como servidor de arquivos estáticos. | 70% - 80% | 
| 9. **Infraestrutura (K8s & Terraform)** | Criação de manifestos de **Kubernetes (K8s)** para orquestração da aplicação. Opcionalmente, utilize **Terraform** para provisionar a infraestrutura necessária. | 80% - 90% |
| 10. **CD & Segurança de Rede** | Deploy Contínuo com publicação de imagens e configuração de **HTTPS via Cert Manager**. O Nginx deve redirecionar porta 80 para 443 e não expor outras portas para fora da rede de containers. | 90% - 100% |

## Orientações Gerais

*   **Repositório:** O trabalho deve ser desenvolvido em um repositório pessoal no GitHub.
*   **Commits:** Devem ser atômicos e espaçados no tempo. Commits realizados todos juntos na data de entrega serão penalizados.
*   **Modernização:** É responsabilidade do aluno atualizar o `package.json` e as dependências do servidor para garantir compatibilidade com as versões mais recentes do Node.js.
*   **Documentação:** O `README.md` final deve conter o passo a passo de como subir o ambiente de desenvolvimento e como visualizar o ambiente de produção.

Boa sorte!
